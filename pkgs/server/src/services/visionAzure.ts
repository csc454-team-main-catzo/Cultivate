import CFG from "../config.js";

export interface AzureVisionTag {
  name: string;
  confidence: number;
}

interface AnalyzeResponse {
  tags?: Array<{
    name?: string;
    confidence?: number;
  }>;
}

function getAnalyzeUrl() {
  const endpoint = CFG.AZURE_VISION_ENDPOINT.replace(/\/+$/, "");
  return `${endpoint}/vision/v3.2/analyze?visualFeatures=${encodeURIComponent(
    CFG.AZURE_VISION_FEATURES
  )}`;
}

export async function getTags(imageBuffer: Buffer): Promise<AzureVisionTag[]> {
  if (!CFG.AZURE_VISION_ENDPOINT || !CFG.AZURE_VISION_KEY) {
    throw new Error("azure_vision_config_missing");
  }

  const response = await fetch(getAnalyzeUrl(), {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": CFG.AZURE_VISION_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    throw new Error(`azure_vision_http_${response.status}`);
  }

  const payload = (await response.json()) as AnalyzeResponse;
  return (payload.tags || [])
    .filter((tag) => Boolean(tag.name))
    .map((tag) => ({
      name: String(tag.name),
      confidence: Number(tag.confidence || 0),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
