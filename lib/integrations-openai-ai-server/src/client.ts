import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const openaiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;

  const apiKey = openrouterKey ?? xaiKey ?? openaiKey;

  if (!apiKey) {
    throw new Error(
      "An AI API key must be set via OPENROUTER_API_KEY, XAI_API_KEY, or OPENAI_API_KEY.",
    );
  }

  const baseURL = openrouterKey
    ? "https://openrouter.ai/api/v1"
    : xaiKey
    ? "https://api.x.ai/v1"
    : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1");

  if (!_openai) {
    _openai = new OpenAI({ apiKey, baseURL });
  }

  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
