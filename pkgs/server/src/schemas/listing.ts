import * as v from "valibot";

/* ---------- Shared Enums ---------- */

export const ListingTypeSchema = v.picklist(
  ["demand", "supply"],
  "Type must be 'demand' or 'supply'"
);

export const ListingStatusSchema = v.picklist(
  ["open", "matched", "fulfilled", "expired"],
  "Status must be 'open', 'matched', 'fulfilled', or 'expired'"
);

/* ---------- Shared Sub-schemas ---------- */

const PopulatedUserSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.string(),
});

const ResponseSubdocSchema = v.object({
  _id: v.string(),
  message: v.string(),
  price: v.number(),
  qty: v.number(),
  createdBy: PopulatedUserSchema,
  createdAt: v.string(),
});

/* ---------- Request Schemas ---------- */

/** Create a new listing (demand from a restaurant, or supply from a farmer) */
export const ListingCreateSchema = v.object({
  type: ListingTypeSchema,
  title: v.pipe(
    v.string(),
    v.minLength(1, "Title is required"),
    v.maxLength(150, "Title cannot exceed 150 characters")
  ),
  item: v.pipe(
    v.string(),
    v.minLength(1, "Item is required"),
    v.maxLength(100, "Item name cannot exceed 100 characters")
  ),
  description: v.pipe(
    v.string(),
    v.minLength(1, "Description is required"),
    v.maxLength(2000, "Description cannot exceed 2000 characters")
  ),
  price: v.pipe(v.number(), v.minValue(0, "Price cannot be negative")),
  qty: v.pipe(v.number(), v.minValue(1, "Quantity must be at least 1")),
  latLng: v.pipe(
    v.array(v.number()),
    v.length(2, "latLng must be exactly [latitude, longitude]"),
    v.check(
      (val) => val[0] >= -90 && val[0] <= 90,
      "Latitude must be between -90 and 90"
    ),
    v.check(
      (val) => val[1] >= -180 && val[1] <= 180,
      "Longitude must be between -180 and 180"
    ),
    v.transform((val) => val as [number, number])
  ),
  expiresAt: v.optional(v.string("expiresAt must be an ISO date string")),
});

export type ListingCreateInput = v.InferOutput<typeof ListingCreateSchema>;

/** Add a response to an existing listing */
export const ResponseCreateSchema = v.object({
  message: v.pipe(
    v.string(),
    v.minLength(1, "Message is required"),
    v.maxLength(2000, "Message cannot exceed 2000 characters")
  ),
  price: v.pipe(v.number(), v.minValue(0, "Price cannot be negative")),
  qty: v.pipe(v.number(), v.minValue(1, "Quantity must be at least 1")),
});

export type ResponseCreateInput = v.InferOutput<typeof ResponseCreateSchema>;

/* ---------- Response Schemas ---------- */

export const ListingResponseSchema = v.object({
  _id: v.string(),
  type: ListingTypeSchema,
  title: v.string(),
  item: v.string(),
  description: v.string(),
  price: v.number(),
  qty: v.number(),
  latLng: v.tuple([v.number(), v.number()]),
  createdBy: PopulatedUserSchema,
  matchedResponseId: v.nullable(v.string()),
  status: ListingStatusSchema,
  responses: v.array(ResponseSubdocSchema),
  createdAt: v.string(),
  updatedAt: v.string(),
  expiresAt: v.nullable(v.string()),
});

export const ListingListResponseSchema = v.array(ListingResponseSchema);
