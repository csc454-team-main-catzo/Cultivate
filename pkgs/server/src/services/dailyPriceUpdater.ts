/**
 * Daily price updater:
 * 1. Fetches latest Toronto wholesale prices from AAFC Infohort.
 * 2. Upserts priceHints on matching ProduceItem taxonomy documents.
 * 3. Adjusts prices on open supply listings that opted into dynamic pricing
 *    (`dynamicPricing: true`) when the item matches updated wholesale data.
 *
 * Designed to run once per day via setInterval (or on server startup).
 */

import ProduceItem, { type IProduceItem, type IPriceHint } from "../models/ProduceItem.js";
import Listing from "../models/Listing.js";
import { getTorontoWholesalePrices } from "./infohortPrices.js";

const PRICE_SOURCE = "aafc_infohort_toronto";

/**
 * Wholesale-to-suggested retail markup factor.
 * AAFC wholesale prices are what wholesalers charge retailers; for a
 * farm-to-restaurant platform the markup is modest (≈ 20 %).
 */
const WHOLESALE_TO_SUGGESTED_MARKUP = 1.2;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Same keying as Step 2 in `runDailyPriceUpdate` (listing `item` → Infohort canonical). */
export function normalizeListingItemKey(item: string): string {
  return (item ?? "").toLowerCase().replace(/s$/, "");
}

function pickSuggestedFromPriceHints(hints: IPriceHint[] | undefined | null): number | null {
  const list = (hints || [])
    .filter((h) => h && typeof h === "object")
    .map((h) => ({
      unit: String(h.unit || "").toLowerCase(),
      currency: String(h.currency || "CAD").toUpperCase(),
      source: String(h.source || ""),
      suggested: Number(h.suggested || 0),
    }))
    .filter((h) => Number.isFinite(h.suggested) && h.suggested > 0);
  if (list.length === 0) return null;
  const infohort = list.find(
    (h) => h.source === PRICE_SOURCE && h.unit === "kg" && h.currency === "CAD"
  );
  if (infohort) return infohort.suggested;
  const kgCad = list.find((h) => h.unit === "kg" && h.currency === "CAD");
  if (kgCad) return kgCad.suggested;
  return list[0]!.suggested;
}

/**
 * Suggested retail $/kg for a listing item: live Toronto wholesale × markup, or
 * ProduceItem taxonomy hints if the commodity is not in the current feed.
 * Used when the user enables dynamic pricing (immediate update), matching the daily job.
 */
export async function resolveDynamicListingPricePerKg(item: string): Promise<number | null> {
  const key = normalizeListingItemKey(item);
  if (!key) return null;

  try {
    const prices = await getTorontoWholesalePrices();
    const entry = prices.get(key);
    if (entry) {
      return Math.round(entry.midPerKg * WHOLESALE_TO_SUGGESTED_MARKUP * 100) / 100;
    }
  } catch (err) {
    console.warn(
      "[DailyPriceUpdater] resolveDynamicListingPricePerKg: wholesale fetch failed:",
      err instanceof Error ? err.message : err
    );
  }

  const doc = await ProduceItem.findOne({
    canonical: { $regex: new RegExp(`^${escapeRegex(key)}$`, "i") },
    active: true,
  })
    .select("priceHints")
    .lean<{ priceHints?: IPriceHint[] }>();

  return pickSuggestedFromPriceHints(doc?.priceHints);
}

export interface PriceUpdateResult {
  produceItemsUpdated: number;
  listingsAdjusted: number;
  errors: string[];
  fetchedDate: string | null;
}

/**
 * Run a full daily price update cycle.
 * Safe to call repeatedly — idempotent for a given date.
 */
export async function runDailyPriceUpdate(): Promise<PriceUpdateResult> {
  const result: PriceUpdateResult = {
    produceItemsUpdated: 0,
    listingsAdjusted: 0,
    errors: [],
    fetchedDate: null,
  };

  let prices: Awaited<ReturnType<typeof getTorontoWholesalePrices>>;
  try {
    prices = await getTorontoWholesalePrices();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to fetch Infohort prices: ${msg}`);
    console.error("[DailyPriceUpdater]", result.errors[0]);
    return result;
  }

  if (prices.size === 0) {
    result.errors.push("No Toronto wholesale prices available");
    console.warn("[DailyPriceUpdater]", result.errors[0]);
    return result;
  }

  // Track which canonical items got a new price (for listing adjustment)
  const updatedCanonicals = new Map<string, number>();

  // Step 1: Update ProduceItem priceHints
  for (const [canonical, priceData] of prices) {
    result.fetchedDate = result.fetchedDate ?? priceData.date;

    try {
      const item = await ProduceItem.findOne({
        canonical: { $regex: new RegExp(`^${canonical}$`, "i") },
        active: true,
      });
      if (!item) continue;

      const suggestedPrice =
        Math.round(priceData.midPerKg * WHOLESALE_TO_SUGGESTED_MARKUP * 100) / 100;

      const newHint: IPriceHint = {
        unit: "kg" as const,
        currency: "CAD",
        typicalMin: priceData.lowPerKg,
        typicalMax: priceData.highPerKg,
        suggested: suggestedPrice,
        source: PRICE_SOURCE,
        referencePeriod: priceData.date,
        notes: `Daily wholesale-to-retail (Toronto). Updated ${new Date().toISOString().slice(0, 10)}.`,
      };

      // Upsert: replace existing Infohort hint or push new one
      const hints: IPriceHint[] = (item.priceHints || []).slice();
      const idx = hints.findIndex((h) => h.source === PRICE_SOURCE);
      if (idx >= 0) {
        hints[idx] = newHint;
      } else {
        hints.unshift(newHint);
      }
      item.priceHints = hints;
      await item.save();

      updatedCanonicals.set(canonical, suggestedPrice);
      result.produceItemsUpdated += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`ProduceItem update failed for ${canonical}: ${msg}`);
    }
  }

  // Step 2: Adjust prices on open supply listings
  if (updatedCanonicals.size > 0) {
    try {
      const canonicalList = Array.from(updatedCanonicals.keys());
      const regexes = canonicalList.map(
        (c) => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      const openListings = await Listing.find({
        status: "open",
        type: "supply",
        dynamicPricing: true,
        $or: regexes.map((r) => ({ item: r })),
      });

      for (const listing of openListings) {
        const itemLower = (listing.item ?? "").toLowerCase().replace(/s$/, "");
        const newSuggested = updatedCanonicals.get(itemLower);
        if (newSuggested == null) continue;

        // Only adjust if the current price differs meaningfully (> 1 %)
        const diff = Math.abs(listing.price - newSuggested) / listing.price;
        if (diff < 0.01) continue;

        listing.price = newSuggested;
        await listing.save();
        result.listingsAdjusted += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Listing price adjustment failed: ${msg}`);
    }
  }

  console.log(
    `[DailyPriceUpdater] Done: ${result.produceItemsUpdated} items updated, ` +
      `${result.listingsAdjusted} listings adjusted, ${result.errors.length} errors` +
      (result.fetchedDate ? ` (data date: ${result.fetchedDate})` : "")
  );

  return result;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the daily price update scheduler.
 * Runs once immediately (after a short delay) then every 24 hours.
 */
export function startDailyPriceScheduler(): void {
  if (intervalId) return; // already running

  // Initial run after 10-second startup delay
  setTimeout(() => {
    void runDailyPriceUpdate();
  }, 10_000);

  intervalId = setInterval(() => {
    void runDailyPriceUpdate();
  }, TWENTY_FOUR_HOURS_MS);

  console.log("[DailyPriceUpdater] Scheduler started (every 24h)");
}

export function stopDailyPriceScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[DailyPriceUpdater] Scheduler stopped");
  }
}
