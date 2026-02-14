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

const seedItems: Array<{ canonical: string; synonyms: string[] }> = [
  { canonical: "tomato", synonyms: [] },
  { canonical: "lettuce", synonyms: [] },
  { canonical: "cucumber", synonyms: [] },
  { canonical: "potato", synonyms: [] },
  { canonical: "onion", synonyms: [] },
  { canonical: "garlic", synonyms: [] },
  { canonical: "carrot", synonyms: [] },
  { canonical: "pepper", synonyms: [] },
  { canonical: "spinach", synonyms: [] },
  { canonical: "kale", synonyms: [] },
  { canonical: "mushroom", synonyms: [] },
  { canonical: "strawberry", synonyms: [] },
  { canonical: "blueberry", synonyms: [] },
  { canonical: "apple", synonyms: [] },
  { canonical: "orange", synonyms: [] },
  { canonical: "banana", synonyms: [] },
  {
    canonical: "jalapeño",
    synonyms: ["jalapeno", "chili pepper", "green chili"],
  },
];

async function run() {
  await mongoose.connect(CFG.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const entry of seedItems) {
    const canonical = entry.canonical.trim();
    const name = slugify(canonical);
    const lowerCanonical = canonical.toLowerCase();

    await ProduceItem.findOneAndUpdate(
      {
        $or: [
          { name },
          { $expr: { $eq: [{ $toLower: "$canonical" }, lowerCanonical] } },
        ],
      },
      {
        $set: {
          canonical,
          name,
          active: true,
        },
        $addToSet: {
          synonyms: { $each: entry.synonyms.map((s) => s.trim().toLowerCase()) },
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(`Seeded ${seedItems.length} produce taxonomy items`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
