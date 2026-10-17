# Testing
Backend: `npm run test:backend` (Vitest + Supertest + mongodb-memory-server). Frontend: `npm run test:frontend` (Vitest + React Testing Library, API mocked). AI: `npm run test:ai` (pytest; fixtures are synthetic, only test pipeline mechanics).
E2E: start MongoDB, backend, frontend, then `cd frontend && npx playwright install chromium && npm run test:e2e`.
Model quality must be evaluated on real data: see metrics printed by the training scripts.
