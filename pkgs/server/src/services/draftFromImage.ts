/**
 * Shared draft-from-image logic: Azure CV tags + produce taxonomy match.
 * Used by POST /listings/draft-from-image and by the Glean agent when the user
 * uploads a produce image in chat (merge with text for price, qty, delivery window).
 */

import ImageAsset from "../models/ImageAsset.js";
import CFG from "../config.js";
import { downloadBufferFromGridFS } from "./gridfs.js";
import { getTags } from "./visionAzure.js";
import { matchProduceFromTags, toTitleCase } from "./produceMatcher.js";
import { evaluateProduceGuard, type ProduceGuardResult } from "./produceGuard.js";

export interface DraftFromImageSuggestedFields {
  title: string;
  item: string;
  description: string;
  suggestedPricePerKg: number | null;
  suggestedUnit: string | null;
  itemId: string | null;
}

export interface DraftFromImageResult {
  fields: DraftFromImageSuggestedFields;
  guard: ProduceGuardResult;
  confidence: number;
}

/** Thrown when the produce guard or low-confidence check rejects the image. */
export class ImageGuardError extends Error {
  code: "not_produce" | "low_confidence";
  feedback: string;
  confidence: number;

  constructor(code: "not_produce" | "low_confidence", feedback: string, confidence: number) {
    super(code === "not_produce" ? "Image does not contain produce" : "Low recognition confidence");
    this.code = code;
    this.feedback = feedback;
    this.confidence = confidence;
  }
}

const itemMatchThreshold = Number(CFG.ITEM_MATCH_THRESHOLD || 0.6);
const INFOHORT_PRICE_SOURCE = "aafc_infohort_toronto";

function pickBestPriceHint(
  hints:
    | Array<{
        unit: string;
        suggested: number;
        currency: string;
        referencePeriod: string;
        source: string;
      }>
    | undefined
    | null
) {
  const list = (hints || [])
    .filter((h) => h && typeof h === "object")
    .map((h) => ({
      ...h,
      unit: String(h.unit || "").toLowerCase(),
      currency: String(h.currency || "CAD").toUpperCase(),
      source: String(h.source || ""),
      suggested: Number(h.suggested || 0),
    }))
    .filter((h) => Number.isFinite(h.suggested) && h.suggested > 0);

  if (list.length === 0) return null;

  // Prefer daily Infohort-derived hint first, then any kg/CAD hint, else first valid.
  const infohort = list.find(
    (h) => h.source === INFOHORT_PRICE_SOURCE && h.unit === "kg" && h.currency === "CAD"
  );
  if (infohort) return infohort;

  const kgCad = list.find((h) => h.unit === "kg" && h.currency === "CAD");
  if (kgCad) return kgCad;

  return list[0] ?? null;
}

/**
 * Get suggested listing fields from an uploaded image (Azure Vision + produce match).
 * Verifies the image is owned by userId. Throws if image not found or not owned.
 * Throws ImageGuardError if the image fails the produce content guard or
 * if recognition confidence is too low.
 */
export async function getDraftSuggestedFieldsFromImage(
  imageId: string,
  userId: string
): Promise<DraftFromImageResult> {
  const imageAsset = await ImageAsset.findById(imageId);
  if (!imageAsset) {
    const err = new Error("Image asset not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (imageAsset.owner.toString() !== userId) {
    const err = new Error("You do not own this image asset") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  const imageBuffer = await downloadBufferFromGridFS(
    imageAsset.gridFsFileId.toString()
  );

  const tags = await getTags(imageBuffer);

  const guard = evaluateProduceGuard(tags);
  if (!guard.isProduce) {
    throw new ImageGuardError(
      "not_produce",
      guard.feedback ?? "This image does not appear to contain farm produce.",
      guard.produceConfidence,
    );
  }

  const match = await matchProduceFromTags(tags, itemMatchThreshold);

  if (match.confidence < CFG.LOW_CONFIDENCE_THRESHOLD) {
    throw new ImageGuardError(
      "low_confidence",
      [
        "We detected produce but couldn't identify the specific item with enough certainty.",
        "Try a closer, well-lit photo showing only one type of produce.",
        "Avoid busy backgrounds, mixed piles, or images taken from far away.",
      ].join(" "),
      match.confidence,
    );
  }

  const itemName = match.itemName ?? "produce";
  const suggestedUnit = match.selected?.defaultUnit ?? null;
  const suggestedPriceHint = pickBestPriceHint(match.selected?.priceHints);
  const suggestedPricePerKg =
    suggestedPriceHint && Number.isFinite(suggestedPriceHint.suggested)
      ? suggestedPriceHint.suggested
      : null;

  const title = itemName
    ? `Fresh ${toTitleCase(itemName)}`
    : "Fresh local produce";
  const description = itemName
    ? `Fresh ${toTitleCase(itemName)}, locally grown. Message for pickup window + partial fulfillment.`
    : "Fresh local produce. Message for pickup window + partial fulfillment.";

  return {
    fields: {
      title,
      item: itemName,
      description,
      suggestedPricePerKg,
      suggestedUnit: suggestedUnit ?? null,
      itemId: match.itemId ?? null,
    },
    guard,
    confidence: match.confidence,
  };
}
