---
name: OpenAI lazy initialization
description: OpenAI clients in lib/integrations-openai-ai-server must be lazy — never instantiate at module load time
---

The original `client.ts`, `image/client.ts`, and `audio/client.ts` all threw at module load time if `OPENAI_API_KEY` was absent. This caused the Express server to crash on startup.

**Fix:** `client.ts` now exports `getOpenAIClient()` (throws only when called) and a `Proxy`-based `openai` export. Image and audio clients import `getOpenAIClient` and call it inside each function.

**Why:** The server must start without an OpenAI key; the AI Coach feature should fail gracefully at request time with a clear error, not prevent the entire server from booting.

**How to apply:** Any future integration that requires an API key at module scope must use the same lazy pattern — check for the key inside the function, not at the top level.
