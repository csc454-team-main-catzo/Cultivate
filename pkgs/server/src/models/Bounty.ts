import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Bounty document interface.
 * A bounty is a demand posting by a restaurant for a specific produce item.
 * Farmers respond by creating Offers that reference this bounty.
 */
export interface IBounty extends Document {
  title: string;
  item: string;
  description: string;
  qty: number;
  latLng: [number, number];
  createdBy: Types.ObjectId;
  status: "open" | "claimed" | "fulfilled" | "expired";
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------- Virtual: populate offers that reference this bounty ---------- */
BountySchema.virtual("offers", {
  ref: "Offer",
  localField: "_id",
  foreignField: "bountyId",
});

/* ---------- Indexes ---------- */
BountySchema.index({ createdBy: 1 });
BountySchema.index({ status: 1 });
BountySchema.index({ item: 1, status: 1 });

const Bounty =
  mongoose.models.Bounty || mongoose.model<IBounty>("Bounty", BountySchema);

export default Bounty;