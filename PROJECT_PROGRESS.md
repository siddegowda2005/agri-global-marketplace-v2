# Project Progress
**Phase:** 1-2 backend + 6 (AI code) written. Frontend next.
## Done (code written; see caveats)
- Repo layout, root scripts, .env.example, .gitignore
- Backend: models, auth, crops, uploads, cart, orders, currency, companies, enquiries, notifications, admin, AI proxy
- AI service: training scripts, registry, FastAPI app, pytest suite
## Verified so far
- `node --check` passes on every backend file.
- Python training/prediction logic executed successfully on generated FIXTURE data (not real data).
## NOT verified
- Backend test suite, FastAPI tests, any npm/pip install: the build sandbox has no network.
## Blockers
- Real datasets (Agmarknet prices, crop recommendation CSV) must be downloaded by the team.
- Real company records must be researched and imported via admin; none are invented.
- MongoDB / network needed to run `npm test` (downloads a Mongo binary once).
## Next
1. Run: `cd backend && npm install && npm test`, `cd ai-service && pip install -r requirements.txt && python -m pytest`; paste failures.
2. Frontend (Vite/React/Tailwind): auth, marketplace, cart, orders, dashboards, currency selector.
3. Export guidance + collection centers (sourced data only), Playwright.
