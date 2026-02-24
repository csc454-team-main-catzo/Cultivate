import * as v from "valibot";

export const DraftFromImageSchema = v.object({
  imageId: v.pipe(v.string(), v.minLength(1)),
});

export type DraftFromImageInput = v.InferOutput<typeof DraftFromImageSchema>;

export const DraftFromImageResponseSchema = v.object({
  draftSuggestionId: v.string(),
  imageId: v.string(),
  suggestedFields: v.object({
    itemId: v.nullable(v.string()),
    itemName: v.nullable(v.string()),
    title: v.nullable(v.string()),
    description: v.string(),
    price: v.optional(v.nullable(v.number())),
    unit: v.optional(v.nullable(v.string())),
    priceUnit: v.optional(v.nullable(v.string())),
    unitOptions: v.optional(v.array(v.string())),
    priceUnitOptions: v.optional(v.array(v.string())),
    quality: v.null(),
    attributes: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  }),
  confidence: v.number(),
  reasons: v.array(
    v.object({
      desc: v.string(),
      score: v.number(),
      topicality: v.optional(v.number()),
    })
  ),
  safeFieldPolicy: v.optional(
    v.object({
      neverAutoFill: v.array(v.string()),
      populated: v.array(v.string()),
    })
  ),
});
