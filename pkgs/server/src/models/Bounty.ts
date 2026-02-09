import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Represents a farmer who has responded to a bounty.
 */
export interface IFarmerResponse {
  farmer: Types.ObjectId;
  qtyOffered: number;
  respondedAt: Date;
}

/**
 * Bounty document interface.
 * A bounty is a demand posting by a restaurant for a specific produce item.
 * Farmers can respond to bounties to fulfill the demand.
 */
export interface IBounty extends Document {
  title: string;
  item: string;
  description: string;
  qty: number;
  latLng: [number, number];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: "open" | "claimed" | "fulfilled" | "expired";
  responses: IFarmerResponse[];
}

const FarmerResponseSchema = new Schema<IFarmerResponse>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Farmer reference is required"],
    },
    qtyOffered: {
      type: Number,
      required: [true, "Quantity offered is required"],
      min: [1, "Quantity offered must be at least 1"],
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const BountySchema = new Schema<IBounty>(
  {
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
      required: [true, "CreatedBy (restaurant user) is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["open", "claimed", "fulfilled", "expired"],
        message: "{VALUE} is not a valid bounty status",
      },
      default: "open",
    },
    responses: {
      type: [FarmerResponseSchema],
      default: [],
    },
  },
  {
    timestamps: true, // auto-manages createdAt & updatedAt
  }
);

/* ---------- Indexes ---------- */
BountySchema.index({ createdBy: 1 });
BountySchema.index({ status: 1 });
BountySchema.index({ latLng: "2dsphere" }); // enables geo-queries for nearby bounties
BountySchema.index({ item: 1, status: 1 });

const Bounty =
  mongoose.models.Bounty || mongoose.model<IBounty>("Bounty", BountySchema);

export default Bounty;