import * as v from "valibot";

/* ---------- Request Schemas ---------- */

export const BountyCreateSchema = v.object({
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
  qty: v.pipe(v.number(), v.minValue(1, "Quantity must be at least 1")),
  latLng: v.tuple([
    v.pipe(
      v.number(),
      v.minValue(-90, "Latitude must be >= -90"),
      v.maxValue(90, "Latitude must be <= 90")
    ),
    v.pipe(
      v.number(),
      v.minValue(-180, "Longitude must be >= -180"),
      v.maxValue(180, "Longitude must be <= 180")
    ),
  ]),
});

export type BountyCreateInput = v.InferOutput<typeof BountyCreateSchema>;

/* ---------- Response Schemas ---------- */

const PopulatedUserSchema = v.object({
  _id: v.string(),
  name: v.string(),
  email: v.string(),
});

const FarmerResponseItemSchema = v.object({
  farmer: v.string(),
  qtyOffered: v.number(),
  respondedAt: v.string(),
});

export const BountyResponseSchema = v.object({
  _id: v.string(),
  title: v.string(),
  item: v.string(),
  description: v.string(),
  qty: v.number(),
  latLng: v.tuple([v.number(), v.number()]),
  createdBy: PopulatedUserSchema,
  status: v.picklist(["open", "claimed", "fulfilled", "expired"]),
  responses: v.array(FarmerResponseItemSchema),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const BountyListResponseSchema = v.array(BountyResponseSchema);
