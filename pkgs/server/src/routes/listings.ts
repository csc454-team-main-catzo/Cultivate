import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthenticatedContext } from "../middleware/types.js";
import Listing from "../models/Listing.js";
import {
  ListingCreateSchema,
  type ListingCreateInput,
  ResponseCreateSchema,
  type ResponseCreateInput,
  ListingListResponseSchema,
  ListingResponseSchema,
} from "../schemas/listing.js";

const listings = new Hono<AuthenticatedContext>();
listings.use(describeRoute({
  tags: ['Listings']
}))

/* ------------------------------------------------------------------ */
/*  GET /listings — public, list all listings, optional ?type= filter  */
/* ------------------------------------------------------------------ */
listings.get(
  "/",
  describeRoute({
    operationId: "listListings",
    summary:
      "List all listings. Optional ?type=demand|supply filter. Returns creator info populated.",
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
      const filter: Record<string, string> = {};
      if (typeFilter === "demand" || typeFilter === "supply") {
        filter.type = typeFilter;
      }

      const all = await Listing.find(filter)
        .populate("createdBy", "name email")
        .populate("responses.createdBy", "name email")
        .sort({ createdAt: -1 });

      // .toJSON() respects schema defaults, so null fields appear
      return c.json(all.map((doc) => doc.toJSON()), 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  GET /listings/:id — public, single listing with embedded responses */
/* ------------------------------------------------------------------ */
listings.get(
  "/:id",
  describeRoute({
    operationId: "getListing",
    summary: "Get a single listing with its embedded responses",
    responses: {
      200: {
        description: "Listing with embedded responses",
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
        .populate("responses.createdBy", "name email");

      if (!listing) {
        return c.json({ error: "Listing not found" }, 404);
      }

      return c.json(listing.toJSON(), 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  POST /listings — auth required, create a demand or supply listing  */
/* ------------------------------------------------------------------ */
listings.post(
  "/",
  describeRoute({
    operationId: "createListing",
    summary: "Create a new listing (demand or supply)",
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
      // WORKAROUND: hono-openapi's validator registers types differently than
      // Hono's built-in validator, causing a type mismatch on c.req.valid().
      // The `as never` cast silences TS; runtime validation is handled by the
      // validator("json", ListingCreateSchema) middleware above.
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

/* ------------------------------------------------------------------ */
/*  POST /listings/:id/responses — auth required, add an offer        */
/* ------------------------------------------------------------------ */
listings.post(
  "/:id/responses",
  describeRoute({
    operationId: "createListingResponse",
    summary:
      "Add a response (farmer offer) to an existing demand listing",
    responses: {
      201: {
        description: "Response added, returns updated listing",
        content: {
          "application/json": {
            schema: resolver(ListingResponseSchema),
          },
        },
      },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
      404: { description: "Listing not found" },
    },
  }),
  authMiddleware,
  validator("json", ResponseCreateSchema),
  async (c) => {
    try {
      const listingId = c.req.param("id");
      // WORKAROUND: same hono-openapi type mismatch — see note in POST /listings
      const data = c.req.valid("json" as never) as ResponseCreateInput;
      const userId = c.get("userId");

      const listing = await Listing.findById(listingId);

      if (!listing) {
        return c.json({ error: "Listing not found" }, 404);
      }

      if (listing.status !== "open") {
        return c.json(
          { error: "Cannot add responses to a non-open listing" },
          400
        );
      }

      listing.responses.push({
        ...data,
        createdBy: userId,
      } as any);

      await listing.save();

      const populated = await Listing.findById(listing._id)
        .populate("createdBy", "name email")
        .populate("responses.createdBy", "name email")
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
