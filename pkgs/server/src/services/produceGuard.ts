/**
 * Produce content guard: validates that an image contains raw farm produce
 * before allowing it to proceed to classification.
 *
 * Uses Azure Vision tags to detect food/produce-related content and rejects
 * unrelated images (selfies, screenshots, documents, landscapes, etc.).
 */

import type { AzureVisionTag } from "./visionAzure.js";
import CFG from "../config.js";

export interface ProduceGuardResult {
  /** Whether the image appears to contain raw farm produce. */
  isProduce: boolean;
  /** Best produce-indicator confidence from the vision tags. */
  produceConfidence: number;
  /** Human-readable reason when rejected. */
  rejectionReason: string | null;
  /** Actionable feedback for the user when rejected. */
  feedback: string | null;
}

/**
 * Broad tags that indicate the image contains food, fruit, vegetables, or
 * raw agricultural produce.  Kept intentionally inclusive — the downstream
 * produce matcher will determine the *specific* item; here we only screen
 * out clearly unrelated content (cars, buildings, documents, etc.).
 */
const PRODUCE_INDICATOR_TAGS = new Set([
  "food",
  "fruit",
  "vegetable",
  "produce",
  "natural foods",
  "plant",
  "citrus",
  "berry",
  "apple",
  "banana",
  "tomato",
  "potato",
  "carrot",
  "lettuce",
  "onion",
  "pepper",
  "cucumber",
  "squash",
  "zucchini",
  "corn",
  "beet",
  "radish",
  "cabbage",
  "broccoli",
  "cauliflower",
  "spinach",
  "kale",
  "herb",
  "herbs",
  "garlic",
  "ginger",
  "mushroom",
  "melon",
  "watermelon",
  "grape",
  "strawberry",
  "blueberry",
  "raspberry",
  "peach",
  "pear",
  "plum",
  "cherry",
  "mango",
  "pineapple",
  "avocado",
  "lemon",
  "lime",
  "orange",
  "sweet potato",
  "green bean",
  "pea",
  "celery",
  "asparagus",
  "eggplant",
  "artichoke",
  "leaf vegetable",
  "root vegetable",
  "cruciferous vegetables",
  "tropical fruit",
  "stone fruit",
  "whole food",
  "local food",
  "greengrocer",
  "farmers market",
  "market",
  "harvest",
  "crop",
  "agriculture",
  "farming",
  "organic",
]);

/**
 * Tags that strongly suggest the image is NOT produce, used to boost
 * rejection confidence when no produce indicators are found.
 */
const NON_PRODUCE_TAGS = new Set([
  "person",
  "selfie",
  "portrait",
  "text",
  "screenshot",
  "document",
  "car",
  "vehicle",
  "building",
  "architecture",
  "electronics",
  "computer",
  "phone",
  "clothing",
  "fashion",
  "animal",
  "pet",
  "dog",
  "cat",
  "furniture",
  "interior design",
  "sky",
  "landscape",
  "mountain",
  "ocean",
  "beach",
]);

/**
 * Evaluate whether an image's Azure Vision tags indicate raw farm produce.
 *
 * Decision logic:
 * 1. Scan the top tags for any produce-indicator matches.
 * 2. If the best produce-indicator confidence exceeds
 *    `PRODUCE_GUARD_MIN_CONFIDENCE`, the image passes.
 * 3. Otherwise, generate user-friendly feedback explaining why the
 *    image was rejected and what a good photo looks like.
 */
export function evaluateProduceGuard(tags: AzureVisionTag[]): ProduceGuardResult {
  const threshold = CFG.PRODUCE_GUARD_MIN_CONFIDENCE;

  let bestProduceConfidence = 0;
  let hasNonProduceSignal = false;

  for (const tag of tags) {
    const normalizedName = tag.name.toLowerCase().trim();

    if (PRODUCE_INDICATOR_TAGS.has(normalizedName)) {
      bestProduceConfidence = Math.max(bestProduceConfidence, tag.confidence);
    }

    if (NON_PRODUCE_TAGS.has(normalizedName) && tag.confidence > 0.5) {
      hasNonProduceSignal = true;
    }
  }

  if (bestProduceConfidence >= threshold) {
    return {
      isProduce: true,
      produceConfidence: bestProduceConfidence,
      rejectionReason: null,
      feedback: null,
    };
  }

  const reason = hasNonProduceSignal
    ? "The image does not appear to contain farm produce."
    : "Could not detect raw produce in the image.";

  const feedback = [
    reason,
    "For best results, upload a clear, well-lit photo of raw fruits or vegetables",
    "against a plain background (e.g. a table or cutting board).",
    "Avoid photos of people, documents, cooked meals, or non-food items.",
  ].join(" ");

  return {
    isProduce: false,
    produceConfidence: bestProduceConfidence,
    rejectionReason: reason,
    feedback,
  };
}
