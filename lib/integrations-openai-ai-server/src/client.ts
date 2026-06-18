import OpenAI from "openai";

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "An OpenAI API key must be set via OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY.",
    );
  }

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
