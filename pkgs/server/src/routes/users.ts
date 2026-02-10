import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import { User } from "../models/User.js";
import {
  UserListResponseSchema,
  UserRegisterSchema,
  type UserRegisterInput,
  UserResponseSchema,
} from "../schemas/user.js";

const users = new Hono<AuthenticatedContext>();

users.use(
  describeRoute({
    tags: ["Users"],
  })
);

users.post(
  "/register",
  describeRoute({
    operationId: "registerUser",
    summary: "Complete Auth0 registration by assigning a role",
    responses: {
      201: {
        description: "Registered user",
        content: {
          "application/json": {
            schema: resolver(UserResponseSchema),
          },
        },
      },
      400: { description: "Validation error or user already exists" },
      401: { description: "Unauthorized" },
    },
  }),
  authMiddleware(),
  validator("json", UserRegisterSchema),
  async (c) => {
    try {
      // WORKAROUND: hono-openapi's validator registers types differently than
      // Hono's native validator. The `as never` cast keeps TypeScript happy
      // while runtime validation comes from the middleware above.
      const { role } = c.req.valid("json" as never) as UserRegisterInput;
      const auth0Id = c.get("auth0Id");
      const token = c.get("token");
      const isNewUser = c.get("isNewUser");

      if (!isNewUser) {
        const existingUser = await User.findOne({ auth0Id });
        if (existingUser) {
          return c.json({ error: "User already registered" }, 400);
        }
      }

      const email = (token?.email as string) || "";
      const name =
        (token?.name as string) || (token?.nickname as string) || "";

      if (!email) {
        return c.json({ error: "Email not found in token" }, 400);
      }

      const user = await User.create({
        auth0Id,
        email,
        name: name || email.split("@")[0],
        role,
      });

      return c.json(user, 201);
    } catch (error: any) {
      if (error.code === 11000) {
        return c.json({ error: "User already exists" }, 400);
      }
      return c.json({ error: error.message }, 400);
    }
  }
);

users.get(
  "/me",
  describeRoute({
    operationId: "getCurrentUser",
    summary: "Return the authenticated user's profile",
    responses: {
      200: {
        description: "Authenticated user",
        content: {
          "application/json": {
            schema: resolver(UserResponseSchema),
          },
        },
      },
      401: { description: "Unauthorized" },
      404: { description: "User not found" },
    },
  }),
  authMiddleware(),
  async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json(
          { error: "User not found. Please complete registration." },
          404
        );
      }

      return c.json(user, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
);

users.get(
  "/",
  describeRoute({
    operationId: "listUsers",
    summary: "List registered users (Auth0 IDs omitted)",
    responses: {
      200: {
        description: "Array of users",
        content: {
          "application/json": {
            schema: resolver(UserListResponseSchema),
          },
        },
      },
      401: { description: "Unauthorized" },
      500: { description: "Server error" },
    },
  }),
  authMiddleware(),
  async (c) => {
    try {
      const userDocs = await User.find().select("-auth0Id");
      return c.json(userDocs, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
);

export default users;