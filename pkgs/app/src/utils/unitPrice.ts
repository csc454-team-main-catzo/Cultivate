/** 1 lb in kg (Infohort / wholesale feed alignment). */
export const LBS_TO_KG = 0.453592;

/**
 * Converts a per-unit price when switching listing units.
 * Only `kg` ↔ `lb` are converted; `count` / `bunch` / unknown leave price unchanged (returns null).
 */
export function convertPriceBetweenUnits(
  price: number,
  fromUnit: string,
  toUnit: string
): number | null {
  if (!Number.isFinite(price) || price < 0) return null;
  const from = fromUnit.trim().toLowerCase();
  const to = toUnit.trim().toLowerCase();
  if (!from || !to || from === to) return price;

  const mass = new Set(["kg", "lb"]);
  if (!mass.has(from) || !mass.has(to)) return null;

  const perKg = from === "kg" ? price : price / LBS_TO_KG;
  const out = to === "kg" ? perKg : perKg * LBS_TO_KG;
  return Math.round(out * 100) / 100;
}
