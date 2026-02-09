import type { Context, Next } from "hono";
import { User } from "../models/User.js";

/**
 * Auth middleware — extracts user from Authorization header.
 *
 * Expects: Authorization: Bearer <userId>
 *
 * TODO: Replace with real JWT verification (e.g. jose / jsonwebtoken).
 * For now it accepts a raw User._id for development/testing.
 *
 * On success, sets:
 *   c.get("userId")  → string
 *   c.get("user")    → { _id, name, email }
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

  try {
    // TODO: Replace with JWT decode/verify
    const user = await User.findById(token).select("_id name email");

    if (!user) {
      return c.json({ error: "Invalid token: user not found" }, 401);
    }

    c.set("userId", user._id.toString());
    c.set("user", user);
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
};