import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Listing document interface.
 *
 * A listing represents either:
 *   - "demand" → a restaurant seeking produce
 *   - "supply" → a farmer offering produce
 *
 * A supply listing may optionally respond to a demand listing via `parentId`.
 */
export interface IListing extends Document {
  type: "demand" | "supply";
  title: string;
  item: string;
  description: string;
  price: number;
  qty: number;
  latLng: [number, number];
  createdBy: Types.ObjectId;
  parentId: Types.ObjectId | null;
  matchedListingId: Types.ObjectId | null;
  status: "open" | "matched" | "fulfilled" | "expired";
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    type: {
      type: String,
      enum: {
        values: ["demand", "supply"],
        message: "{VALUE} is not a valid listing type",
      },
      required: [true, "Listing type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    item: {
      type: String,
      required: [true, "Item is required"],
      trim: true,
      maxlength: [100, "Item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    qty: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    latLng: {
      type: [Number],
      required: [true, "Location (latLng) is required"],
      validate: {
        validator: (v: number[]) =>
          v.length === 2 &&
          v[0] >= -90 &&
          v[0] <= 90 &&
          v[1] >= -180 &&
          v[1] <= 180,
        message:
          "latLng must be a [latitude, longitude] pair with valid coordinates",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy is required"],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },
    matchedListingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["open", "matched", "fulfilled", "expired"],
        message: "{VALUE} is not a valid listing status",
      },
      default: "open",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------- Virtual: responses that reference this listing ---------- */
ListingSchema.virtual("responses", {
  ref: "Listing",
  localField: "_id",
  foreignField: "parentId",
});

/* ---------- Indexes ---------- */
ListingSchema.index({ type: 1, status: 1 });
ListingSchema.index({ createdBy: 1 });
ListingSchema.index({ parentId: 1 });
ListingSchema.index({ item: 1, type: 1, status: 1 });

const Listing =
  mongoose.models.Listing ||
  mongoose.model<IListing>("Listing", ListingSchema);

export default Listing;
