import OpenAIModule from "openai";

/** Minimal type for OpenAI-compatible chat client (avoids using package namespace as type). */
export interface LLMClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        response_format?: { type: string };
        max_tokens?: number;
      }): Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
}

/** Resolve OpenAI constructor (handles ESM default vs CJS/namespace interop). */
function getOpenAIConstructor(): new (opts: { apiKey: string; baseURL?: string }) => LLMClient {
  const M = OpenAIModule as unknown as
    | (new (opts: { apiKey: string; baseURL?: string }) => LLMClient)
    | {
        default?: new (opts: { apiKey: string; baseURL?: string }) => LLMClient;
        OpenAI?: new (opts: { apiKey: string; baseURL?: string }) => LLMClient;
      };
  const Ctor = (typeof M === "function"
    ? M
    : M?.default ?? (M as { OpenAI?: unknown }).OpenAI ?? M) as new (opts: {
    apiKey: string;
    baseURL?: string;
  }) => LLMClient;
  if (typeof Ctor !== "function") {
    throw new Error("OpenAI SDK: expected constructor; check openai package version.");
  }
  return Ctor;
}

/** OpenAI-compatible client: Groq, OpenRouter, or OpenAI. */
export function getLLMClient(): LLMClient | null {
  try {
    const NewCtor = getOpenAIConstructor();
    if (process.env.GROQ_API_KEY) {
      return new NewCtor({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });
    }
    if (process.env.OPENROUTER_API_KEY) {
      return new NewCtor({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
    }
    if (process.env.OPENAI_API_KEY) {
      return new NewCtor({ apiKey: process.env.OPENAI_API_KEY });
    }
  } catch (err) {
    console.error("[LLM] client init failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

export type LLMFeature = "glean" | "listings";

/** Model to use: per-feature env var or provider default. */
export function getLLMModel(feature: LLMFeature): string {
  const envKey = feature === "glean" ? "GLEAN_LLM_MODEL" : "LISTINGS_LLM_MODEL";
  const configured = process.env[envKey];
  if (configured) return configured;
  if (process.env.GROQ_API_KEY) return "llama-3.1-8b-instant";
  if (process.env.OPENROUTER_API_KEY) return "meta-llama/llama-3.2-3b-instruct:free";
  return "gpt-4o-mini";
}

