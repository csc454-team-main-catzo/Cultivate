import mongoose, { Schema, type Document, type Types } from "mongoose";

export type ProduceUnit = "kg" | "lb" | "count" | "bunch";

export interface IPriceHint {
  unit: ProduceUnit;
  currency: "CAD";
  typicalMin: number;
  typicalMax: number;
  suggested: number;
  source: string;
  referencePeriod: string;
  notes?: string;
}

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
  defaultUnit: ProduceUnit | null;
  commonUnits: ProduceUnit[];
  priceHints: IPriceHint[];
  active: boolean;
  priority: number;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PriceHintSchema = new Schema<IPriceHint>(
  {
    unit: { type: String, enum: ["kg", "lb", "count", "bunch"], required: true },
    currency: { type: String, enum: ["CAD"], required: true, default: "CAD" },
    typicalMin: { type: Number, required: true, min: 0 },
    typicalMax: { type: Number, required: true, min: 0 },
    suggested: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, trim: true },
    referencePeriod: { type: String, required: true, trim: true },
    notes: { type: String, required: false, trim: true },
  },
  { _id: false }
);

const ProduceItemSchema = new Schema<IProduceItem>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    canonical: { type: String, required: true, trim: true, unique: true, index: true },
    synonyms: { type: [String], default: [] },
    defaultUnit: { type: String, enum: ["kg", "lb", "count", "bunch"], default: null },
    commonUnits: {
      type: [{ type: String, enum: ["kg", "lb", "count", "bunch"] }],
      default: [],
    },
    priceHints: { type: [PriceHintSchema], default: [] },
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
