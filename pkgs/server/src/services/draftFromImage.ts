/**
 * Shared draft-from-image logic: Azure CV tags + produce taxonomy match.
 * Used by POST /listings/draft-from-image and by the Glean agent when the user
 * uploads a produce image in chat (merge with text for price, qty, delivery window).
 */

import ImageAsset from "../models/ImageAsset.js";
import CFG from "../config.js";
import { downloadBufferFromGridFS } from "./gridfs.js";
import { getTags } from "./visionAzure.js";
import {
  buildDraftPriceSuggestionTrace,
  matchProduceFromTags,
  selectPrimaryPriceHint,
  toTitleCase,
} from "./produceMatcher.js";

export interface DraftFromImageSuggestedFields {
  title: string;
  item: string;
  description: string;
  suggestedPricePerKg: number | null;
  /** Listing unit; defaults to kg when taxonomy has no defaultUnit. */
  suggestedUnit: string;
  itemId: string | null;
}

const itemMatchThreshold = Number(CFG.ITEM_MATCH_THRESHOLD || 0.6);

/**
 * Get suggested listing fields from an uploaded image (Azure Vision + produce match).
 * Verifies the image is owned by userId. Throws if image not found or not owned.
 */
export async function getDraftSuggestedFieldsFromImage(
  imageId: string,
  userId: string
): Promise<DraftFromImageSuggestedFields> {
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
  const match = await matchProduceFromTags(tags, itemMatchThreshold);
  const priceSuggestionTrace = buildDraftPriceSuggestionTrace(match);
  console.log(
    "[getDraftSuggestedFieldsFromImage] price_suggestion_trace\n%s",
    JSON.stringify(priceSuggestionTrace, null, 2)
  );
  const itemName = match.itemName ?? "produce";
  const suggestedUnit = match.selected?.defaultUnit ?? "kg";
  const suggestedPriceHint = selectPrimaryPriceHint(match.selected?.priceHints);
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
    title,
    item: itemName,
    description,
    suggestedPricePerKg,
    suggestedUnit,
    itemId: match.itemId ?? null,
  };
}
