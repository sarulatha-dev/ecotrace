# EcoTrace

A carbon footprint awareness platform that lets users track emissions, join sustainability challenges, and get AI-driven coaching.

## Run & Operate

- **Frontend** (port 5000): `PORT=5000 pnpm --filter @workspace/ecotrace run dev`
- **Backend** (port 3001): `PORT=3001 pnpm --filter @workspace/api-server run dev`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- Optional env: `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` — needed for AI Coach feature

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS 4 (`artifacts/ecotrace`)
- API: Express 5, esbuild bundle (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod, drizzle-zod
- API codegen: Orval (from `lib/api-spec/openapi.yaml`)
- Generated React hooks: `lib/api-client-react`

## Where things live

- `lib/api-spec/openapi.yaml` — API source of truth; run codegen after changing
- `lib/db/src/schema/` — Drizzle ORM schema (activities, challenges, etc.)
- `artifacts/ecotrace/src/pages/` — React page components
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/carbon-factors.ts` — CO₂ emission factors

## Architecture decisions

- The Vite dev server proxies `/api/*` to `http://127.0.0.1:3001` (backend port)
- OpenAI client is lazy-initialized — server starts without an API key; AI Coach errors gracefully at request time if key is absent
- Dashboard was rewritten to use the Express `/api/activities` endpoint (the Laravel-style `/api/emissions` route no longer exists)
- The `lib/integrations-openai-ai-server` package exports a Proxy-based `openai` object that defers key validation until first use

## Product

- **Dashboard**: Log daily carbon activities (transport, energy, food) and view trend charts
- **Log Activity**: Detailed activity logging with category/type breakdown
- **Challenges**: Join eco-challenges to reduce footprint
- **Insights**: Charts and analytics of your carbon breakdown
- **Leaderboard**: Community comparison
- **AI Coach**: Personalized sustainability tips powered by OpenAI (requires API key)
- **My Report**: Export your carbon report

## Gotchas

- Backend must run on port 3001 (not 5000); frontend runs on port 5000 (webview)
- `pnpm --filter @workspace/db run push` must be run after schema changes to sync the dev DB
- The `set NODE_ENV=development` in the original api-server `dev` script was Windows syntax — fixed to `NODE_ENV=development`
- After changing `openapi.yaml`, run codegen before the frontend will pick up new types
