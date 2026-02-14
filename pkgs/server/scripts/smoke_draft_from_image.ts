import { readFile } from "node:fs/promises";

type UploadResponse = {
  imageId?: string;
};

type DraftResponse = {
  draftSuggestionId?: string;
  imageId?: string;
  suggestedFields?: Record<string, unknown>;
  confidence?: number;
  reasons?: unknown[];
};

const forbiddenFields = [
  "qty",
  "unit",
  "price",
  "priceUnit",
  "availability",
  "fulfillment",
  "location",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function uploadImage(baseUrl: string, token: string, imagePath: string): Promise<string> {
  const bytes = await readFile(imagePath);
  const formData = new FormData();
  formData.append("image", new Blob([bytes]), "smoke-test-image.jpg");

  const uploadRes = await fetch(`${baseUrl}/api/images/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadJson = (await uploadRes.json()) as UploadResponse & { error?: string };
  assert(uploadRes.ok, `Upload failed (${uploadRes.status}): ${uploadJson.error || "unknown_error"}`);
  assert(typeof uploadJson.imageId === "string" && uploadJson.imageId.length > 0, "Upload response missing imageId");
  return uploadJson.imageId;
}

async function createDraft(baseUrl: string, token: string, imageId: string): Promise<DraftResponse> {
  const draftRes = await fetch(`${baseUrl}/api/listings/draft-from-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageId }),
  });

  const draftJson = (await draftRes.json()) as DraftResponse & { error?: string };
  assert(draftRes.ok, `Draft failed (${draftRes.status}): ${draftJson.error || "unknown_error"}`);
  return draftJson;
}

function assertDraftContract(payload: DraftResponse, expectedImageId: string) {
  assert(typeof payload.draftSuggestionId === "string", "Missing draftSuggestionId");
  assert(payload.imageId === expectedImageId, "Draft response imageId mismatch");
  assert(typeof payload.confidence === "number", "Missing numeric confidence");
  assert(Array.isArray(payload.reasons), "Missing reasons array");
  assert(payload.suggestedFields && typeof payload.suggestedFields === "object", "Missing suggestedFields object");

  const suggestedFields = payload.suggestedFields as Record<string, unknown>;
  for (const field of forbiddenFields) {
    assert(!(field in suggestedFields), `Forbidden auto-filled field present: ${field}`);
  }
}

async function main() {
  const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
  const token = getEnv("SMOKE_AUTH_TOKEN");
  const imagePath = getEnv("SMOKE_IMAGE_PATH");

  console.log("Running smoke test: upload -> draft-from-image");
  const imageId = await uploadImage(baseUrl, token, imagePath);
  console.log(`Uploaded image: ${imageId}`);

  const draft = await createDraft(baseUrl, token, imageId);
  assertDraftContract(draft, imageId);

  console.log("Smoke test passed");
  console.log(
    JSON.stringify(
      {
        draftSuggestionId: draft.draftSuggestionId,
        imageId: draft.imageId,
        confidence: draft.confidence,
        reasonsCount: Array.isArray(draft.reasons) ? draft.reasons.length : 0,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke test failed: ${message}`);
  process.exit(1);
});
