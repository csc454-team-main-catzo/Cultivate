import type { Context, Next } from "hono";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { User } from "../models/User.js";

// Auth0 configuration - should be set via environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || "";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || "";

if (!AUTH0_DOMAIN) {
  console.warn("Warning: AUTH0_DOMAIN environment variable is not set");
}

// Create JWKS client for Auth0
const JWKS = AUTH0_DOMAIN
  ? createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))
  : null;

/**
 * Auth0 JWT verification middleware
 *
 * Expects: Authorization: Bearer <JWT token>
 *
 * Verifies the JWT token against Auth0's JWKS endpoint and extracts user info.
 * On success, sets:
 *   c.get("auth0Id")  → string (Auth0 user ID from 'sub' claim)
 *   c.get("user")    → User document from database
 *   c.get("token")   → Decoded JWT payload
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Authorization header required (Bearer <token>)" },
      401
    );
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return c.json({ error: "Token is required" }, 401);
  }

  if (!JWKS || !AUTH0_DOMAIN) {
    return c.json(
      { error: "Auth0 configuration missing. Set AUTH0_DOMAIN environment variable." },
      500
    );
  }

  try {
    // Verify JWT token with Auth0
    // For API tokens, audience is required and should match your API identifier
    const verifyOptions: Parameters<typeof jwtVerify>[2] = {
      issuer: `https://${AUTH0_DOMAIN}/`,
    };
    
    if (AUTH0_AUDIENCE) {
      verifyOptions.audience = AUTH0_AUDIENCE;
    }
    
    const { payload } = await jwtVerify(token, JWKS, verifyOptions);

    // Extract Auth0 user ID from 'sub' claim
    const auth0Id = payload.sub as string;
    if (!auth0Id) {
      return c.json({ error: "Invalid token: missing 'sub' claim" }, 401);
    }

    // Extract user info from token
    const email = (payload.email as string) || "";
    const name = (payload.name as string) || (payload.nickname as string) || "";

    // Find or create user in database
    let user = await User.findOne({ auth0Id });

    if (!user) {
      // User doesn't exist yet - they'll need to complete registration with role
      // For now, we'll just set the auth0Id and token info
      c.set("auth0Id", auth0Id);
      c.set("token", payload);
      c.set("isNewUser", true);
      await next();
      return;
    }

    // Update user info from token if needed (in case it changed in Auth0)
    if (user.email !== email || user.name !== name) {
      user.email = email;
      user.name = name;
      await user.save();
    }

    c.set("auth0Id", auth0Id);
    c.set("userId", user._id.toString());
    c.set("user", user);
    c.set("token", payload);
    c.set("isNewUser", false);
  } catch (error: any) {
    if (error.code === "ERR_JWT_EXPIRED") {
      return c.json({ error: "Token expired" }, 401);
    }
    if (error.code === "ERR_JWT_INVALID") {
      return c.json({ error: "Invalid token" }, 401);
    }
    console.error("Auth middleware error:", error);
    return c.json({ error: "Authentication failed" }, 401);
  }

  await next();
};
