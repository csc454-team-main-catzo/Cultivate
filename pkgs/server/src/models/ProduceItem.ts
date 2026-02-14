import mongoose, { Schema, type Document, type Types } from "mongoose";

function normalizeSynonym(value: string): string {
  return value.trim().toLowerCase();
}

function makeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface IProduceItem extends Document {
  name: string;
  canonical: string;
  synonyms: string[];
  active: boolean;
  priority: number;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProduceItemSchema = new Schema<IProduceItem>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    canonical: { type: String, required: true, trim: true, unique: true, index: true },
    synonyms: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ProduceItemSchema.pre("validate", function normalizeProduceItem() {
  if (this.canonical) {
    this.canonical = this.canonical.trim();
  }

  const normalized = (this.synonyms || [])
    .map((entry) => normalizeSynonym(entry))
    .filter(Boolean);

  this.synonyms = Array.from(new Set(normalized));

  if (!this.name && this.canonical) {
    this.name = makeSlug(this.canonical);
  } else if (this.name) {
    this.name = makeSlug(this.name);
  }

});

const ProduceItem =
  mongoose.models.ProduceItem ||
  mongoose.model<IProduceItem>("ProduceItem", ProduceItemSchema);

export { normalizeSynonym, makeSlug };
export default ProduceItem;
