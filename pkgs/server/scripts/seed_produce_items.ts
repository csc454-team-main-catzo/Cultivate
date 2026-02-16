import mongoose from "mongoose";
import CFG from "../src/config.js";
import ProduceItem from "../src/models/ProduceItem.js";

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Unit = "kg" | "lb" | "count" | "bunch";
type PriceHint = {
  unit: Unit;
  currency: "CAD";
  typicalMin: number;
  typicalMax: number;
  suggested: number;
  source: "statcan_18-10-0245-01";
  referencePeriod: string; // e.g., "2025-12"
  notes?: string;
};

// NOTE: StatCan Food Price Data Hub provides Canada monthly average retail prices
// for a small set of staple items. We seed those as *suggestions only*.
// Source values (Dec 2025): apples $5.34/kg, bananas $1.66/kg, potatoes $5.01/kg, tomatoes $5.45/kg.
const STATCAN_DEC_2025: Record<string, PriceHint> = {
  apple: {
    unit: "kg",
    currency: "CAD",
    typicalMin: 5.34,
    typicalMax: 5.34,
    suggested: 5.34,
    source: "statcan_18-10-0245-01",
    referencePeriod: "2025-12",
    notes: "Monthly avg retail price (Canada). Use as hint only.",
  },
  banana: {
    unit: "kg",
    currency: "CAD",
    typicalMin: 1.66,
    typicalMax: 1.66,
    suggested: 1.66,
    source: "statcan_18-10-0245-01",
    referencePeriod: "2025-12",
    notes: "Monthly avg retail price (Canada). Use as hint only.",
  },
  potato: {
    unit: "kg",
    currency: "CAD",
    typicalMin: 5.01,
    typicalMax: 5.01,
    suggested: 5.01,
    source: "statcan_18-10-0245-01",
    referencePeriod: "2025-12",
    notes: "Monthly avg retail price (Canada). Use as hint only.",
  },
  tomato: {
    unit: "kg",
    currency: "CAD",
    typicalMin: 5.45,
    typicalMax: 5.45,
    suggested: 5.45,
    source: "statcan_18-10-0245-01",
    referencePeriod: "2025-12",
    notes: "Monthly avg retail price (Canada). Use as hint only.",
  },
};

// MVP seed set: common produce in Canada + practical synonyms for matching.
// Add optional pricing/unit hints where we have StatCan values.
const seedItems: Array<{
  canonical: string;
  synonyms: string[];
  defaultUnit?: Unit;
  commonUnits?: Unit[];
  priceHints?: PriceHint[];
}> = [
  // Leafy greens
  {
    canonical: "lettuce",
    synonyms: ["romaine", "iceberg", "leaf lettuce", "mixed greens", "salad greens"],
    defaultUnit: "count",
    commonUnits: ["count"],
  },
  { canonical: "spinach", synonyms: ["baby spinach"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "kale", synonyms: ["curly kale", "lacinato kale", "dinosaur kale"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "arugula", synonyms: ["rocket"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "cabbage", synonyms: ["green cabbage", "red cabbage", "savoy cabbage"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "bok choy", synonyms: ["pak choi", "baby bok choy"], defaultUnit: "bunch", commonUnits: ["bunch"] },

  // Herbs
  { canonical: "cilantro", synonyms: ["coriander", "coriander leaves"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "parsley", synonyms: ["flat-leaf parsley", "italian parsley", "curly parsley"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "basil", synonyms: ["sweet basil"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "mint", synonyms: ["spearmint"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "dill", synonyms: [], defaultUnit: "bunch", commonUnits: ["bunch"] },

  // Staples / vegetables
  {
    canonical: "tomato",
    synonyms: ["tomatoes", "roma tomato", "cherry tomato", "grape tomato"],
    defaultUnit: "kg",
    commonUnits: ["kg", "lb"],
    priceHints: [STATCAN_DEC_2025.tomato],
  },
  { canonical: "cucumber", synonyms: ["cucumbers", "english cucumber", "mini cucumber"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "zucchini", synonyms: ["courgette"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "pepper", synonyms: ["bell pepper", "sweet pepper", "capsicum", "red pepper", "green pepper", "yellow pepper"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  { canonical: "jalapeño", synonyms: ["jalapeno", "chili pepper", "green chili"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "broccoli", synonyms: ["broccoli florets"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "cauliflower", synonyms: [], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "celery", synonyms: ["celery stalk"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "corn", synonyms: ["sweet corn", "corn on the cob", "maize"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "green bean", synonyms: ["green beans", "string bean", "snap bean"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "pea", synonyms: ["peas", "green pea", "snap pea", "snow pea"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "eggplant", synonyms: ["aubergine"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  { canonical: "asparagus", synonyms: [], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "brussels sprout", synonyms: ["brussels sprouts"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },

  // Alliums
  { canonical: "onion", synonyms: ["yellow onion", "red onion", "white onion"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "green onion", synonyms: ["scallion", "spring onion"], defaultUnit: "bunch", commonUnits: ["bunch"] },
  { canonical: "garlic", synonyms: ["garlic bulb"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  { canonical: "leek", synonyms: ["leeks"], defaultUnit: "count", commonUnits: ["count"] },

  // Root veg
  {
    canonical: "potato",
    synonyms: ["potatoes", "russet", "yukon gold", "red potato"],
    defaultUnit: "kg",
    commonUnits: ["kg", "lb"],
    priceHints: [STATCAN_DEC_2025.potato],
  },
  { canonical: "sweet potato", synonyms: ["sweet potatoes", "yam"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "carrot", synonyms: ["carrots"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "beet", synonyms: ["beets", "beetroot"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "turnip", synonyms: ["turnips"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "rutabaga", synonyms: ["swede"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "parsnip", synonyms: ["parsnips"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "radish", synonyms: ["radishes", "daikon"], defaultUnit: "bunch", commonUnits: ["bunch", "kg"] },

  // Squash
  { canonical: "squash", synonyms: ["butternut squash", "acorn squash"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  { canonical: "pumpkin", synonyms: [], defaultUnit: "count", commonUnits: ["count"] },

  // Mushrooms
  { canonical: "mushroom", synonyms: ["mushrooms", "button mushroom", "cremini", "portobello", "shiitake"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },

  // Fruits
  {
    canonical: "apple",
    synonyms: ["apples"],
    defaultUnit: "kg",
    commonUnits: ["kg", "lb", "count"],
    priceHints: [STATCAN_DEC_2025.apple],
  },
  { canonical: "pear", synonyms: ["pears"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  { canonical: "orange", synonyms: ["oranges"], defaultUnit: "kg", commonUnits: ["kg", "lb", "count"] },
  {
    canonical: "banana",
    synonyms: ["bananas"],
    defaultUnit: "kg",
    commonUnits: ["kg", "lb", "count"],
    priceHints: [STATCAN_DEC_2025.banana],
  },
  { canonical: "grape", synonyms: ["grapes"], defaultUnit: "kg", commonUnits: ["kg", "lb"] },
  { canonical: "strawberry", synonyms: ["strawberries"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "blueberry", synonyms: ["blueberries"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "raspberry", synonyms: ["raspberries"], defaultUnit: "count", commonUnits: ["count"] },
  { canonical: "blackberry", synonyms: ["blackberries"], defaultUnit: "count", commonUnits: ["count"] },
];

async function run() {
  await mongoose.connect(CFG.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const entry of seedItems) {
    const canonical = entry.canonical.trim();
    const name = slugify(canonical);
    const normalizedSynonyms = entry.synonyms.map((s) => s.trim().toLowerCase());

    const existing =
      (await ProduceItem.findOne({ name })) ||
      (await ProduceItem.findOne({
        canonical: { $regex: `^${escapeRegex(canonical)}$`, $options: "i" },
      }));

    const patch = {
      canonical,
      name,
      active: true,
      synonyms: normalizedSynonyms,
      // these fields must exist on your ProduceItem schema for this to persist
      defaultUnit: entry.defaultUnit,
      commonUnits: entry.commonUnits,
      priceHints: entry.priceHints,
    };

    if (existing) {
      existing.canonical = canonical;
      existing.name = name;
      existing.active = true;

      existing.synonyms = Array.from(
        new Set([...(existing.synonyms || []), ...normalizedSynonyms])
      );

      // Only set if provided in seed (don’t wipe if undefined)
      if (entry.defaultUnit) (existing as any).defaultUnit = entry.defaultUnit;
      if (entry.commonUnits?.length) (existing as any).commonUnits = entry.commonUnits;

      // Merge priceHints by (source, referencePeriod, unit)
      if (entry.priceHints?.length) {
        const cur: PriceHint[] = ((existing as any).priceHints || []) as PriceHint[];
        const merged = [...cur];

        for (const h of entry.priceHints) {
          const key = `${h.source}:${h.referencePeriod}:${h.unit}`;
          const idx = merged.findIndex(
            (x) => `${x.source}:${x.referencePeriod}:${x.unit}` === key
          );
          if (idx >= 0) merged[idx] = h;
          else merged.push(h);
        }
        (existing as any).priceHints = merged;
      }

      await existing.save();
      continue;
    }

    await ProduceItem.create({
      canonical,
      name,
      active: true,
      synonyms: normalizedSynonyms,
      defaultUnit: entry.defaultUnit,
      commonUnits: entry.commonUnits,
      priceHints: entry.priceHints,
    });
  }

  console.log(`Seeded ${seedItems.length} produce taxonomy items`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});