import * as v from "valibot";

/* ---------- Request Schemas ---------- */

export const ListingCreateSchema = v.object({
  type: v.picklist(["demand", "supply"], "Type must be 'demand' or 'supply'"),
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
  parentId: v.optional(v.pipe(v.string(), v.minLength(1))),
});

export type ListingCreateInput = v.InferOutput<typeof ListingCreateSchema>;

/* ---------- Response Schemas ---------- */

const PopulatedUserSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.string(),
});

export const ListingResponseSchema = v.object({
  _id: v.string(),
  type: v.picklist(["demand", "supply"]),
  title: v.string(),
  item: v.string(),
  description: v.string(),
  price: v.number(),
  qty: v.number(),
  latLng: v.tuple([v.number(), v.number()]),
  createdBy: PopulatedUserSchema,
  parentId: v.nullable(v.string()),
  status: v.picklist(["open", "matched", "fulfilled", "expired"]),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const ListingListResponseSchema = v.array(ListingResponseSchema);
