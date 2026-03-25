/**
 * Fetches daily wholesale-to-retail produce prices for the Toronto market
 * from Agriculture and Agri-Food Canada's Infohort Open Data feed.
 *
 * Data source: https://open.canada.ca/data/en/dataset/920bc8e2-de26-4bf6-ac41-ed47962d0ff6
 * JSON endpoint (rolling 55 weeks): https://od-do.agr.gc.ca/DailyWholesalePrices_PrixDeGrossistesQuotidiens.json
 */

const INFOHORT_JSON_URL =
  "https://od-do.agr.gc.ca/DailyWholesalePrices_PrixDeGrossistesQuotidiens.json";

const LBS_TO_KG = 0.453592;

export interface InfohortRecord {
  Date: string;
  CentreEn: string;
  CmdtyEn: string;
  VrtyEn: string;
  GradeEn: string;
  Cntry: string;
  ProvState: string;
  LowPrice: number | null;
  HighPrice: number | null;
  PkgTypeEn: string;
  CntrTypeEn: string;
  PkgQty: number | null;
  PkgWt: number | null;
  UnitMsrEn: string;
  PkgSizeEn: string;
}

const INFOHORT_ARRAY_KEY = "DailyWholesalePrices_PrixDeGrossistesQuotidiens";

function parsePriceField(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function unwrapInfohortJson(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === "object" && INFOHORT_ARRAY_KEY in (raw as object)) {
    const inner = (raw as Record<string, unknown>)[INFOHORT_ARRAY_KEY];
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  throw new Error(
    "Infohort JSON: expected top-level array or object with DailyWholesalePrices_PrixDeGrossistesQuotidiens"
  );
}

function normaliseInfohortRow(r: Record<string, unknown>): InfohortRecord {
  const centre = String(r.CentreEn_CentreAn ?? r.CentreEn ?? "").trim();
  const cmdty = String(r.CmdtyEn_PrdtAn ?? r.CmdtyEn ?? "").trim();
  return {
    Date: String(r.Date ?? ""),
    CentreEn: centre,
    CmdtyEn: cmdty,
    VrtyEn: String(r.VrtyEn_VrteAn ?? r.VrtyEn ?? "").trim(),
    GradeEn: String(r.GradeEn_CtgryAn ?? r.GradeEn ?? "").trim(),
    Cntry: String(r.Cntry_Pays ?? r.Cntry ?? "").trim(),
    ProvState: String(r.ProvState_ProvEtat ?? r.ProvState ?? "").trim(),
    LowPrice: parsePriceField(r.LowPrice_PrixMin ?? r.LowPrice),
    HighPrice: parsePriceField(r.HighPrice_PrixMax ?? r.HighPrice),
    PkgTypeEn: String(r.PkgTypeEn_EmpqtgAn ?? r.PkgTypeEn ?? "").trim(),
    CntrTypeEn: String(r.CntrTypeEn_TypeCntrAn ?? r.CntrTypeEn ?? "").trim(),
    PkgQty: parseOptionalNumber(r.PkgQty_QtePqt ?? r.PkgQty),
    PkgWt: parseOptionalNumber(r.PkgWt_PdsPqt ?? r.PkgWt),
    UnitMsrEn: String(r.UnitMsrEn_QteUnitAn ?? r.UnitMsrEn ?? "").trim(),
    PkgSizeEn: String(r.PkgSizeEn_TaillePqtAn ?? r.PkgSizeEn ?? "").trim(),
  };
}

export interface WholesalePriceEntry {
  date: string;
  commodity: string;
  variety: string;
  origin: string;
  lowPricePerKg: number;
  highPricePerKg: number;
  midPricePerKg: number;
  packageDesc: string;
}

/**
 * Per-row debug info — useful for diagnosing unexpected per-kg values.
 * Export via debugCommodityRows() below.
 */
export interface DebugRow {
  date: string;
  canonical: string;
  variety: string;
  grade: string;
  origin: string;
  pkgType: string;
  pkgQty: number | null;
  pkgWt: number | null;
  unitMsr: string;
  resolvedWeightKg: number | null;
  /** Reason this row was excluded, or null if included. */
  excludedReason: string | null;
  lowPrice: number | null;
  highPrice: number | null;
  lowPerKg: number | null;
  highPerKg: number | null;
  weightUsedInAvg: number | null;
  isBaselineFieldUs1: boolean;
}

const COMMODITY_TO_CANONICAL: Record<string, string> = {
  apples: "apple",
  bananas: "banana",
  potatoes: "potato",
  tomatoes: "tomato",
  carrots: "carrot",
  onions: "onion",
  peppers: "pepper",
  lettuce: "lettuce",
  broccoli: "broccoli",
  cauliflower: "cauliflower",
  celery: "celery",
  corn: "corn",
  cucumbers: "cucumber",
  mushrooms: "mushroom",
  "green beans": "green bean",
  peas: "pea",
  spinach: "spinach",
  cabbage: "cabbage",
  beets: "beet",
  turnips: "turnip",
  parsnips: "parsnip",
  rutabagas: "rutabaga",
  squash: "squash",
  eggplant: "eggplant",
  asparagus: "asparagus",
  "brussels sprouts": "brussels sprout",
  garlic: "garlic",
  leeks: "leek",
  radishes: "radish",
  oranges: "orange",
  grapes: "grape",
  strawberries: "strawberry",
  blueberries: "blueberry",
  raspberries: "raspberry",
  blackberries: "blackberry",
  pears: "pear",
  "sweet potatoes": "sweet potato",
  zucchini: "zucchini",
  kale: "kale",
  "bok choy": "bok choy",
  pumpkins: "pumpkin",
};

/**
 * Resolve the total package weight in kg from a feed row.
 *
 * IMPORTANT — how PkgQty interacts with PkgWt in the AAFC feed:
 *
 *   "Ctn 50 lbs"  → PkgWt=50, PkgQty="" → the carton IS 50 lbs; qty=1 is correct.
 *   "Ctn 8X1 lbs" → PkgWt=1,  PkgQty=8  → 8 individual 1-lb containers; total = 8 lbs.
 *   "Flat 10X340 Gr" → PkgWt=340, PkgQty=10 → 10 × 340 g = 3,400 g.
 *
 * So qty multiplier only applies when PkgQty is explicitly set (>0). When it is
 * blank/null we treat the package as a single unit (qty=1) and PkgWt is the
 * total weight of that package — NOT the weight of one sub-unit.
 *
 * This was already the behaviour of the old code, but documenting it explicitly
 * here because the "Ctn 50 lbs / PkgQty=''" cucumber case confused the diagnosis.
 */
function normalizePackageWeightKg(
  pkgWt: number | null,
  unit: string,
  pkgQty: number | null
): number | null {
  if (!pkgWt || pkgWt <= 0) return null;
  // Only multiply by qty when the feed explicitly provides it.
  const qty = pkgQty != null && pkgQty > 0 ? pkgQty : 1;
  const u = unit.trim().toUpperCase();
  if (u === "KG" || u === "KGS") return pkgWt * qty;
  if (u === "LBS" || u === "LB") return pkgWt * qty * LBS_TO_KG;
  if (u === "GR" || u === "G" || u === "GMS") return (pkgWt * qty) / 1000;
  // Unknown unit — cannot convert; discard row so we don't produce silently wrong numbers.
  return null;
}

function pricePerKg(price: number, packageWeightKg: number): number {
  if (packageWeightKg <= 0) return 0;
  return Math.round((price / packageWeightKg) * 100) / 100;
}

function isGreenhouseVariety(rec: InfohortRecord): boolean {
  // Only filter the bare "G.H." marker. Named GH varieties like
  // "G.H.-Long English" are real retail products and should be kept
  // (they will be excluded later only if they lack weight data).
  return rec.VrtyEn.trim() === "G.H.";
}

function isBaselineFieldUs1(rec: InfohortRecord): boolean {
  if (rec.VrtyEn.trim().toLowerCase() !== "field") return false;
  return rec.GradeEn.toLowerCase().includes("united states number 1");
}

type BenchmarkRow = {
  canonical: string;
  date: string;
  rec: InfohortRecord;
  lowPerKg: number;
  highPerKg: number;
  weightKg: number;
};

function buildBenchmarkRows(records: InfohortRecord[]): BenchmarkRow[] {
  const processed: BenchmarkRow[] = [];
  for (const rec of records) {
    const cmdty = rec.CmdtyEn?.trim().toLowerCase();
    if (!cmdty) continue;
    const canonical = COMMODITY_TO_CANONICAL[cmdty];
    if (!canonical) continue;
    if (isGreenhouseVariety(rec)) continue;

    const low = rec.LowPrice;
    const high = rec.HighPrice;
    if (low == null || high == null || low <= 0 || high <= 0) continue;

    const weightKg = normalizePackageWeightKg(rec.PkgWt, rec.UnitMsrEn || "", rec.PkgQty);
    if (!weightKg || weightKg <= 0) continue;

    const lowPerKg = pricePerKg(low, weightKg);
    const highPerKg = pricePerKg(high, weightKg);
    if (lowPerKg <= 0 || highPerKg <= 0) continue;

    processed.push({ canonical, date: rec.Date, rec, lowPerKg, highPerKg, weightKg });
  }

  // Per (canonical, date) bucket: prefer Field + US #1 rows when any exist.
  const byKey = new Map<string, BenchmarkRow[]>();
  for (const row of processed) {
    const key = `${row.canonical}||${row.date}`;
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }

  const out: BenchmarkRow[] = [];
  for (const rows of byKey.values()) {
    const baseline = rows.filter((r) => isBaselineFieldUs1(r.rec));
    out.push(...(baseline.length > 0 ? baseline : rows));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Returns a full per-row breakdown for a given canonical commodity name
 * (e.g. "cucumber", "strawberry") covering the three most recent dates.
 *
 * Useful for answering "why is the listed price X?" — each row shows its
 * resolved weight, per-kg price, and the reason it was included or excluded.
 *
 * Usage:
 *   const rows = await debugCommodityRows("cucumber");
 *   console.table(rows);
 */
export async function debugCommodityRows(canonical: string): Promise<DebugRow[]> {
  const records = await fetchInfohortRecords();
  const toronto = records.filter((r) => r.CentreEn?.toLowerCase().includes("toronto"));

  const dates = Array.from(new Set(toronto.map((r) => r.Date))).sort().reverse();
  const recentDates = new Set(dates.slice(0, 3));
  const latestRecords = toronto.filter((r) => recentDates.has(r.Date));

  const debugRows: DebugRow[] = [];

  for (const rec of latestRecords) {
    const cmdty = rec.CmdtyEn?.trim().toLowerCase();
    if (!cmdty) continue;
    const c = COMMODITY_TO_CANONICAL[cmdty];
    if (!c || c !== canonical) continue;

    const weightKg = normalizePackageWeightKg(rec.PkgWt, rec.UnitMsrEn || "", rec.PkgQty);
    const low = rec.LowPrice;
    const high = rec.HighPrice;

    let excludedReason: string | null = null;
    if (isGreenhouseVariety(rec)) {
      excludedReason = "greenhouse variety (bare G.H.)";
    } else if (low == null || high == null || low <= 0 || high <= 0) {
      excludedReason = "invalid price";
    } else if (!weightKg || weightKg <= 0) {
      excludedReason = `no resolvable weight (PkgWt=${rec.PkgWt}, unit="${rec.UnitMsrEn}", PkgQty=${rec.PkgQty})`;
    }

    const lowPerKg =
      weightKg && low != null && low > 0 ? pricePerKg(low, weightKg) : null;
    const highPerKg =
      weightKg && high != null && high > 0 ? pricePerKg(high, weightKg) : null;

    debugRows.push({
      date: rec.Date,
      canonical: c,
      variety: rec.VrtyEn,
      grade: rec.GradeEn,
      origin: `${rec.Cntry}${rec.ProvState ? `/${rec.ProvState}` : ""}`,
      pkgType: rec.PkgTypeEn,
      pkgQty: rec.PkgQty,
      pkgWt: rec.PkgWt,
      unitMsr: rec.UnitMsrEn,
      resolvedWeightKg: weightKg,
      excludedReason,
      lowPrice: low,
      highPrice: high,
      lowPerKg,
      highPerKg,
      weightUsedInAvg: excludedReason ? null : weightKg,
      isBaselineFieldUs1: isBaselineFieldUs1(rec),
    });
  }

  debugRows.sort((a, b) => b.date.localeCompare(a.date));
  return debugRows;
}

// ---------------------------------------------------------------------------
// Cache + fetch
// ---------------------------------------------------------------------------

interface CachedInfohort {
  expiresAt: number;
  records: InfohortRecord[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let cache: CachedInfohort = { expiresAt: 0, records: [] };
const DEFAULT_FETCH_TIMEOUT_MS = 45_000;
const MAX_FETCH_RETRIES = 2;

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isTimeoutAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException) {
    return err.name === "TimeoutError" || err.name === "AbortError";
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("timeout") || msg.includes("aborted");
  }
  return false;
}

async function fetchInfohortRecordsWithRetry(timeoutMs: number): Promise<InfohortRecord[]> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
    const attemptTimeoutMs = timeoutMs + attempt * 15_000;
    try {
      const res = await fetch(INFOHORT_JSON_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(attemptTimeoutMs),
      });
      if (!res.ok) {
        throw new Error(`Infohort fetch failed: ${res.status} ${res.statusText}`);
      }
      const raw: unknown = await res.json();
      const rows = unwrapInfohortJson(raw);
      return rows.map((row) => normaliseInfohortRow(row));
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < MAX_FETCH_RETRIES && isTimeoutAbortError(err);
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function fetchInfohortRecords(): Promise<InfohortRecord[]> {
  const now = Date.now();
  if (cache.expiresAt > now && cache.records.length > 0) {
    return cache.records;
  }

  const fetchTimeoutMs = parsePositiveIntEnv("INFOHORT_FETCH_TIMEOUT_MS", DEFAULT_FETCH_TIMEOUT_MS);
  try {
    const records = await fetchInfohortRecordsWithRetry(fetchTimeoutMs);
    cache = { expiresAt: now + CACHE_TTL_MS, records };
    return records;
  } catch (err) {
    if (cache.records.length > 0) {
      console.warn(
        "[InfohortPrices] Live fetch failed; using cached records:",
        err instanceof Error ? err.message : String(err)
      );
      return cache.records;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function getTorontoWholesalePrices(): Promise<
  Map<string, { canonical: string; date: string; lowPerKg: number; highPerKg: number; midPerKg: number }>
> {
  const records = await fetchInfohortRecords();

  const toronto = records.filter(
    (r) => r.CentreEn?.toLowerCase().includes("toronto")
  );

  const dates = Array.from(new Set(toronto.map((r) => r.Date))).sort().reverse();
  const latestDate = dates[0];
  if (!latestDate) return new Map();

  const recentDates = new Set(dates.slice(0, 3));
  const latestRecords = toronto.filter((r) => recentDates.has(r.Date));

  const benchmarkRows = buildBenchmarkRows(latestRecords);

  const maxDateByCanonical = new Map<string, string>();
  for (const row of benchmarkRows) {
    const cur = maxDateByCanonical.get(row.canonical);
    if (!cur || row.date > cur) maxDateByCanonical.set(row.canonical, row.date);
  }

  const aggregated = new Map<
    string,
    { canonical: string; date: string; entries: Array<{ low: number; high: number; weightKg: number }> }
  >();

  for (const row of benchmarkRows) {
    const maxD = maxDateByCanonical.get(row.canonical);
    if (!maxD || row.date !== maxD) continue;

    const existing = aggregated.get(row.canonical);
    if (!existing) {
      aggregated.set(row.canonical, {
        canonical: row.canonical,
        date: row.date,
        entries: [{ low: row.lowPerKg, high: row.highPerKg, weightKg: row.weightKg }],
      });
    } else {
      existing.entries.push({ low: row.lowPerKg, high: row.highPerKg, weightKg: row.weightKg });
    }
  }

  const result = new Map<
    string,
    { canonical: string; date: string; lowPerKg: number; highPerKg: number; midPerKg: number }
  >();

  for (const [key, entry] of aggregated) {
    const totalWeight = entry.entries.reduce((s, e) => s + e.weightKg, 0);
    const avgLow =
      Math.round(
        (entry.entries.reduce((s, e) => s + e.low * e.weightKg, 0) / totalWeight) * 100
      ) / 100;
    const avgHigh =
      Math.round(
        (entry.entries.reduce((s, e) => s + e.high * e.weightKg, 0) / totalWeight) * 100
      ) / 100;
    result.set(key, {
      canonical: entry.canonical,
      date: entry.date,
      lowPerKg: avgLow,
      highPerKg: avgHigh,
      midPerKg: Math.round(((avgLow + avgHigh) / 2) * 100) / 100,
    });
  }

  return result;
}