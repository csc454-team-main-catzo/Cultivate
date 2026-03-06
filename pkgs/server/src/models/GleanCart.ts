import mongoose, { Schema, Document, Types } from "mongoose";

export interface IGleanCartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  color: string;
  quantity: number;
}

export interface IGleanCart extends Document {
  user: Types.ObjectId;
  chat: Types.ObjectId;
  items: IGleanCartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const GleanCartItemSchema = new Schema<IGleanCartItem>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const GleanCartSchema = new Schema<IGleanCart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "GleanChat",
      required: true,
      index: true,
    },
    items: {
      type: [GleanCartItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

GleanCartSchema.index({ user: 1, chat: 1 }, { unique: true });

const GleanCart =
  mongoose.models.GleanCart || mongoose.model<IGleanCart>("GleanCart", GleanCartSchema);

export default GleanCart;

