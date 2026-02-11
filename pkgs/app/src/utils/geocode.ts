/**
 * Resolve a Canadian postal code to [latitude, longitude] using OpenStreetMap Nominatim.
 * No API key required. Use sparingly (Nominatim usage policy).
 * Format: A1A 1A1 or A1A1A1 (letter-digit-letter, digit-letter-digit).
 */
export async function geocodeZipCode(postalCode: string): Promise<[number, number]> {
  const trimmed = postalCode.trim().toUpperCase();
  if (!trimmed) {
    throw new Error("Postal code is required.");
  }
  // Normalize Canadian format: insert space if missing (e.g. K1A0B1 -> K1A 0B1)
  const normalized =
    trimmed.length === 6 && /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(trimmed.replace(/\s/g, ""))
      ? `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`
      : trimmed;
  const query = encodeURIComponent(`${normalized}, Canada`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CultivateApp/1.0 (contact@example.com)",
    },
  });
  if (!res.ok) {
    throw new Error("Could not look up location. Please check the postal code and try again.");
  }
  const data = (await res.json()) as { lat?: string; lon?: string }[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Postal code not found. Please enter a valid Canadian postal code.");
  }
  const first = data[0];
  const lat = parseFloat(first?.lat ?? "");
  const lon = parseFloat(first?.lon ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new Error("Invalid location result. Please try a different postal code.");
  }
  return [lat, lon];
}
