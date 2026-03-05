import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "./crypto.js";

beforeAll(() => {
  if (!process.env.INTEGRATIONS_TOKEN_KEY) {
    process.env.INTEGRATIONS_TOKEN_KEY = randomBytes(32).toString("base64");
  }
});

describe("googleCalendar crypto", () => {
  it("encrypts and decrypts round-trip", () => {
    const plain = "secret_refresh_token_123";
    const blob = encrypt(plain);
    expect(blob).not.toBe(plain);
    expect(blob.length).toBeGreaterThan(plain.length);
    const out = decrypt(blob);
    expect(out).toBe(plain);
  });

  it("produces different ciphertext each time (IV is random)", () => {
    const plain = "same_plaintext";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("throws on invalid blob", () => {
    expect(() => decrypt("not-valid-base64!!!")).toThrow();
    expect(() => decrypt(Buffer.from("short").toString("base64"))).toThrow(/Invalid/);
  });
});
