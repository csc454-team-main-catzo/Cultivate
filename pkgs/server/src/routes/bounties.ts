import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { authMiddleware } from "../middleware/auth.js"; //TODO: update once Auth middleware is implemented
import Bounty from "../models/Bounty.js";
import {
  BountyCreateSchema,
  type BountyCreateInput,
  BountyListResponseSchema,
  BountyResponseSchema,
} from "../schemas/bounty.js";

type Env = {
  Variables: {
    userId: string;
    user: unknown;
  };
};

const bounties = new Hono<Env>();

/* ------------------------------------------------------------------ */
/*  GET /bounties — public, returns all bounties with creator info    */
/* ------------------------------------------------------------------ */
bounties.get(
  "/",
  describeRoute({
    description: "List all bounties with creator info populated",
    tags: ["Bounties"],
    responses: {
      200: {
        description: "Array of bounties",
        content: {
          "application/json": {
            schema: resolver(BountyListResponseSchema),
          },
        },
      },
      500: { description: "Server error" },
    },
  }),
  async (c) => {
    try {
      const allBounties = await Bounty.find()
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();

      return c.json(allBounties, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  POST /bounties — auth required, creates bounty for current user   */
/* ------------------------------------------------------------------ */
bounties.post(
  "/",
  describeRoute({
    description: "Create a new bounty (restaurant demand posting)",
    tags: ["Bounties"],
    responses: {
      201: {
        description: "Bounty created successfully",
        content: {
          "application/json": {
            schema: resolver(BountyResponseSchema),
          },
        },
      },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
    },
  }),
  authMiddleware,
  validator("json", BountyCreateSchema),
  async (c) => {
    try {
      const data = c.req.valid("json" as never) as BountyCreateInput;
      const userId = c.get("userId");

      const bounty = await Bounty.create({
        ...data,
        createdBy: userId,
      });

      const populated = await Bounty.findById(bounty._id)
        .populate("createdBy", "name email")
        .lean();

      return c.json(populated, 201);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "ValidationError") {
        return c.json({ error: err.message }, 400);
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

export default bounties;
