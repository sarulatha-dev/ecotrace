---
name: Dashboard API migration from Laravel to Express
description: The dashboard page was originally written against a Laravel /api/emissions API that doesn't exist in the Node.js backend
---

The `artifacts/ecotrace/src/pages/dashboard.tsx` used axios to call `/api/emissions` (GET/POST/DELETE), which was a Laravel-specific endpoint. The Express backend exposes `/api/activities` instead, using activity types like `car_km`, `electricity_kwh`, `beef_meal`.

**Fix:** Dashboard rewritten to use the generated React hooks: `useListActivities`, `useCreateActivity`, `useDeleteActivity`, `useGetActivitySummary`.

**Why:** The project imported both a Laravel backend and an Express backend; the frontend was wired to the Laravel one, which isn't running in this Replit environment.

**How to apply:** If adding new dashboard features, use the `@workspace/api-client-react` generated hooks (from Orval/OpenAPI) rather than raw axios calls.
