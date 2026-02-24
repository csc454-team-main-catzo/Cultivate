import * as v from "valibot";

export const ProduceItemCreateSchema = v.object({
  canonical: v.pipe(v.string(), v.minLength(1)),
  synonyms: v.optional(v.array(v.string())),
  priority: v.optional(v.number()),
  active: v.optional(v.boolean()),
});

export type ProduceItemCreateInput = v.InferOutput<typeof ProduceItemCreateSchema>;

export const ProduceItemSynonymsSchema = v.object({
  add: v.pipe(v.array(v.string()), v.minLength(1)),
});

export type ProduceItemSynonymsInput = v.InferOutput<typeof ProduceItemSynonymsSchema>;

export const ProduceItemResponseSchema = v.object({
  _id: v.string(),
  name: v.string(),
  canonical: v.string(),
  synonyms: v.array(v.string()),
  active: v.boolean(),
  priority: v.number(),
  createdBy: v.nullable(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const ProduceItemListResponseSchema = v.array(ProduceItemResponseSchema);
