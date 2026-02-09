import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { authMiddleware } from "../middleware/auth.js";
import Listing from "../models/Listing.js";
import {
  ListingCreateSchema,
  type ListingCreateInput,
  ListingListResponseSchema,
  ListingResponseSchema,
} from "../schemas/listing.js";

type Env = {
  Variables: {
    userId: string;
    user: unknown;
  };
};

const listings = new Hono<Env>();

/* ------------------------------------------------------------------ */
/*  GET /listings — public, with optional ?type=demand|supply filter  */
/* ------------------------------------------------------------------ */
listings.get(
  "/",
  describeRoute({
    description:
      "List all listings. Filter by ?type=demand or ?type=supply. Returns creator info populated.",
    tags: ["Listings"],
    responses: {
      200: {
        description: "Array of listings",
        content: {
          "application/json": {
            schema: resolver(ListingListResponseSchema),
          },
        },
      },
      500: { description: "Server error" },
    },
  }),
  async (c) => {
    try {
      const typeFilter = c.req.query("type");
      const filter: Record<string, unknown> = {};

      if (typeFilter === "demand" || typeFilter === "supply") {
        filter.type = typeFilter;
      }

      const all = await Listing.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();

      return c.json(all, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  GET /listings/:id — public, single listing with responses         */
/* ------------------------------------------------------------------ */
listings.get(
  "/:id",
  describeRoute({
    description: "Get a single listing with its responses populated",
    tags: ["Listings"],
    responses: {
      200: {
        description: "Listing with populated responses",
        content: {
          "application/json": {
            schema: resolver(ListingResponseSchema),
          },
        },
      },
      404: { description: "Listing not found" },
    },
  }),
  async (c) => {
    try {
      const listing = await Listing.findById(c.req.param("id"))
        .populate("createdBy", "name email")
        .populate({
          path: "responses",
          populate: { path: "createdBy", select: "name email" },
        })
        .lean();

      if (!listing) {
        return c.json({ error: "Listing not found" }, 404);
      }

      return c.json(listing, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  POST /listings — auth required, creates listing for current user  */
/* ------------------------------------------------------------------ */
listings.post(
  "/",
  describeRoute({
    description:
      "Create a new listing (demand from restaurant or supply from farmer)",
    tags: ["Listings"],
    responses: {
      201: {
        description: "Listing created successfully",
        content: {
          "application/json": {
            schema: resolver(ListingResponseSchema),
          },
        },
      },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
    },
  }),
  authMiddleware,
  validator("json", ListingCreateSchema),
  async (c) => {
    try {
      const data = c.req.valid("json" as never) as ListingCreateInput;
      const userId = c.get("userId");

      const listing = await Listing.create({
        ...data,
        createdBy: userId,
      });

      const populated = await Listing.findById(listing._id)
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

export default listings;
