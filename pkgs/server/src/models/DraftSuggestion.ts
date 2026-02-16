import mongoose, { Schema, type Document, type Types } from "mongoose";

interface ISuggestedFields {
  itemId: string | null;
  itemName: string | null;
  title: string | null;
  description: string;
  price?: number | null;
  unit?: string | null;
  priceUnit?: string | null;
  unitOptions?: string[] | null;
  priceUnitOptions?: string[] | null;
  quality: null;
  attributes?: Record<string, unknown> | null;
}

export interface IDraftSuggestion extends Document {
  imageId: Types.ObjectId;
  ownerId: Types.ObjectId;
  suggestedFields: ISuggestedFields;
  confidences: {
    item: number;
    labels: Array<{ desc: string; score: number; topicality?: number }>;
  };
  provider: "azure";
  createdAt: Date;
  updatedAt: Date;
}

const DraftSuggestionSchema = new Schema<IDraftSuggestion>(
  {
    imageId: {
      type: Schema.Types.ObjectId,
      ref: "ImageAsset",
      required: [true, "Image id is required"],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      index: true,
    },
    suggestedFields: {
      itemId: { type: String, default: null },
      itemName: { type: String, default: null },
      title: { type: String, default: null },
      description: { type: String, required: true },
      price: { type: Number, default: null },
      unit: { type: String, default: null },
      priceUnit: { type: String, default: null },
      unitOptions: { type: [String], default: null },
      priceUnitOptions: { type: [String], default: null },
      quality: { type: Schema.Types.Mixed, default: null },
      attributes: { type: Schema.Types.Mixed, default: null },
    },
    confidences: {
      item: { type: Number, required: true, min: 0 },
      labels: {
        type: [
          {
            desc: { type: String, required: true },
            score: { type: Number, required: true, min: 0 },
            topicality: { type: Number, required: false },
          },
        ],
        default: [],
      },
    },
    provider: {
      type: String,
      enum: ["azure"],
      required: true,
      default: "azure",
    },
  },
  { timestamps: true }
);

const DraftSuggestion =
  mongoose.models.DraftSuggestion ||
  mongoose.model<IDraftSuggestion>("DraftSuggestion", DraftSuggestionSchema);

export default DraftSuggestion;
