import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const xaiKey = process.env.XAI_API_KEY;
  const openaiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;

  const apiKey = xaiKey ?? openaiKey;

  if (!apiKey) {
    throw new Error(
      "An AI API key must be set via XAI_API_KEY, OPENAI_API_KEY, or AI_INTEGRATIONS_OPENAI_API_KEY.",
    );
  }

  const baseURL = xaiKey
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
