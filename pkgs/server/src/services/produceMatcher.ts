import ProduceItem, { type IProduceItem } from "../models/ProduceItem.js";

export interface VisionTag {
  name?: string | null;
  confidence?: number | null;
}

interface CachedProduceItems {
  expiresAt: number;
  items: IProduceItem[];
}

export interface MatchReason {
  desc: string;
  score: number;
  topicality?: number;
}

interface MatchResult {
  itemId: string | null;
  itemName: string | null;
  confidence: number;
  reasons: MatchReason[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const TOP_LABELS = 10;
const produceItemsCache: CachedProduceItems = { expiresAt: 0, items: [] };

function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): Set<string> {
  return new Set(value.split(" ").filter(Boolean));
}

function getMatchWeight(normalizedLabel: string, normalizedTerm: string): number {
  if (!normalizedLabel || !normalizedTerm) return 0;
  if (normalizedLabel === normalizedTerm) return 1.0;
  if (
    normalizedLabel.includes(normalizedTerm) ||
    normalizedTerm.includes(normalizedLabel)
  ) {
    return 0.85;
  }

  const labelTokens = tokenize(normalizedLabel);
  const termTokens = tokenize(normalizedTerm);
  let overlap = 0;

  for (const token of labelTokens) {
    if (termTokens.has(token)) overlap += 1;
  }

  return overlap > 0 ? 0.6 : 0;
}

async function loadActiveProduceItemsCached(): Promise<IProduceItem[]> {
  const now = Date.now();
  if (produceItemsCache.expiresAt > now && produceItemsCache.items.length > 0) {
    return produceItemsCache.items;
  }

  const items = await ProduceItem.find({ active: true }).lean<IProduceItem[]>();
  produceItemsCache.items = items;
  produceItemsCache.expiresAt = now + CACHE_TTL_MS;
  return items;
}

export function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => {
    const first = word.charAt(0).toLocaleUpperCase();
    return `${first}${word.slice(1)}`;
  });
}

export async function matchProduceFromTags(
  tags: VisionTag[],
  threshold: number
): Promise<MatchResult> {
  const activeItems = await loadActiveProduceItemsCached();
  if (activeItems.length === 0) {
    return { itemId: null, itemName: null, confidence: 0, reasons: [] };
  }

  const topTags = tags.slice(0, TOP_LABELS).filter((tag) => tag.name);
  let bestScore = 0;
  let bestItem: IProduceItem | null = null;
  const reasons: MatchReason[] = [];

  for (const tag of topTags) {
    const rawTag = String(tag.name || "");
    const normalizedTag = normalizeLabel(rawTag);
    const tagScore = Number(tag.confidence || 0);

    for (const item of activeItems) {
      const candidateTerms = [item.canonical, ...(item.synonyms || [])];
      for (const term of candidateTerms) {
        const normalizedTerm = normalizeLabel(term);
        const weight = getMatchWeight(normalizedTag, normalizedTerm);
        if (weight === 0) continue;

        const score = tagScore * weight * (1 + item.priority * 0.05);
        if (score > bestScore) {
          bestScore = score;
          bestItem = item;
        }
      }
    }

    reasons.push({
      desc: rawTag,
      score: tagScore,
    });
  }

  if (!bestItem || bestScore < threshold) {
    return { itemId: null, itemName: null, confidence: bestScore, reasons };
  }

  return {
    itemId: bestItem._id.toString(),
    itemName: bestItem.canonical,
    confidence: bestScore,
    reasons,
  };
}
