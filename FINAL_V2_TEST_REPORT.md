# FINAL V2 TEST REPORT — AgriGlobal V2

**AI-Powered International Agricultural Marketplace**
Report generated: 2026-10-19 · Verified on this machine (Windows, Node 22.18.0, Python 3.10.11, MongoDB 8.0.9)

> This report covers the **actual execution** of the project. The previous
> `FINAL_TEST_REPORT.md` was written when the code was complete but had never been
> run (the original build sandbox had no network). Everything below was executed and
> observed on a real machine.

---

## 1. Final status

| Area | Status |
|---|---|
| Frontend (React/Vite) | **FULLY WORKING** |
| Backend API (Express/MongoDB) | **FULLY WORKING** |
| AI service (FastAPI) | **FULLY WORKING** (models trained on real public data) |
| Data used for testing | **WORKING WITH DEMO DATA** (isolated DB, every record labelled SAMPLE / DEMO DATA) |
| External enquiry delivery | **NOT VERIFIED / BY DESIGN** — no delivery service is connected, and the app says so |
| Currency conversion | **WORKING**, depends on a free external FX API (gracefully degrades if unreachable) |

**Overall: WORKING WITH DEMO DATA.** The application runs end-to-end locally, all
automated tests pass, and both AI models are trained and serving real predictions.
Live/test data is kept in a **separate `agri_marketplace_demo` database**; production
data is never touched, and no secrets or `.env` files were modified.

---

## 2. Services running (verified)

| Service | Port | Health check | Result |
|---|---|---|---|
| MongoDB | 27017 | — | running (8.0.9) |
| Backend API | 5000 | `GET /api/health` | `{"status":"ok"}` |
| AI service | 8000 | `GET /health` | `price_model` + `crop_model` both `loaded: true` |
| Frontend (Vite) | 5173 | `GET /` | HTTP 200, app shell renders |

---

## 3. Tests executed

| Suite | Command | Passed | Failed | Skipped |
|---|---|---|---|---|
| Backend (Vitest + supertest + mongodb-memory-server) | `npm --prefix backend test` | **35** | 0 | 0 |
| Frontend (Vitest + Testing Library, jsdom) | `npm --prefix frontend test` | **43** | 0 | 0 |
| AI service (Pytest) | `python -m pytest -q` (in `ai-service`) | **15** | 0 | 0 |
| End-to-end (Playwright: desktop journey + mobile) | `npm --prefix frontend run test:e2e` | **4** | 0 | 0 |
| Production build | `npm run build` | success (116 modules) | — | — |
| **Total automated** | | **97** | **0** | **0** |

Additionally, a temporary live API script ran **49 end-to-end checks** against the
running demo backend (auth, crop CRUD/search/filter, Global Buyers, Indian exporters,
Buyer Finder, enquiry workflow, orders, currency, notifications, AI) — **49 passed, 0 failed**.

---

## 4. Problems discovered and fixed

### 4.1 Real application bugs

1. **`OverwriteModelError: Cannot overwrite 'User' model once compiled.`**
   Backend suites `api.test.js` and `v2.test.js` share one Mongoose instance inside a
   single Vitest fork; model files registered models unconditionally, so the second
   suite crashed on collection and its 9 tests were skipped.
   **Fix:** made all 11 model registrations idempotent —
   `mongoose.models.X || mongoose.model('X', schema)`.
   Files: `backend/src/models/{User,Crop,Company,Enquiry,BuyingRequest,Order,CollectionCenter,ExportGuide,Cart,ExchangeRateCache,Notification}.js`.

2. **Crash on the enquiry form — `Cannot read properties of null (reading 'city')`.**
   `Enquiries.jsx` read `user.city` / `user.state` while `user` could be `null`.
   **Fix:** null-safe access `user?.city`, `user?.state` in `frontend/src/pages/Enquiries.jsx`.

### 4.2 Test-harness / configuration defects

3. **Vitest tried to run Playwright specs** (`e2e/journey.spec.js`, `e2e/mobile.spec.js`) as unit tests → "Failed Suites".
   **Fix:** `exclude: [...configDefaults.exclude, 'e2e/**']` in `frontend/vite.config.js`.

4. **Playwright `desktop` project also ran `mobile.spec.js`**, where the mobile Menu
   button is `lg:hidden` at desktop width → guaranteed timeout.
   **Fix:** `testIgnore: /mobile\.spec\.js/` on the desktop project in `frontend/playwright.config.js`.

5. **e2e journey race:** the farmer page was navigated before login finished, so the
   protected route bounced back to `/login`.
   **Fix:** wait for the authenticated redirect (`await expect(page).toHaveURL(/dashboard/)`)
   in `frontend/e2e/journey.spec.js`.

6. **e2e strict-mode ambiguity:** `getByText('Accepted')` matched both the status-filter
   `<option>` and the order status badge.
   **Fix:** scope the assertion to the order card
   (`getByRole('link', { name: /Tomato…/ }).getByText('Accepted')`).

7. **Frontend unit-test query collisions** (same class of issue — a label/option and a
   result shared the same text). **Fix:** scoped queries with `within(...)` and asserted
   on `role="alert"` in `frontend/src/tests/v2.test.jsx` and `components.test.jsx`.

### 4.3 AI models were untrained

Both models returned honest `503` responses. Real datasets are required (the project
explicitly forbids generating or faking data), so real public datasets were obtained
and both models were trained — see §6 and `docs/ai-datasets.md`.

---

## 5. Files created / modified

**Created**
- `backend/src/scripts-seed-demo.js` — repeatable, isolated demo-data seeder (Phase 3).
- `ai-service/datasets/Crop_recommendation.csv` — real public dataset (2200 rows).
- `ai-service/datasets/price_data.csv` — real Agmarknet subset (70,697 rows).
- `ai-service/app/models/price_model.joblib` + `price_model.meta.json` — trained.
- `ai-service/app/models/crop_model.joblib` + `crop_model.meta.json` — trained.
- `docs/ai-datasets.md` — dataset sources, dates, and provenance.
- `FINAL_V2_TEST_REPORT.md` — this report.

**Modified**
- `backend/src/models/*.js` (11 files) — idempotent model registration.
- `backend/package.json` — added `"seed:demo"` script.
- `frontend/vite.config.js` — exclude `e2e/**` from Vitest.
- `frontend/src/pages/Enquiries.jsx` — null-safe `user`.
- `frontend/src/tests/v2.test.jsx`, `frontend/src/tests/components.test.jsx` — robust queries.
- `frontend/playwright.config.js` — desktop project ignores the mobile spec.
- `frontend/e2e/journey.spec.js` — wait for auth; scoped status assertion.

No `.env` file was modified or overwritten. No existing database was deleted.

---

## 6. AI models — trained on real public data

| Model | Dataset | Rows | Hold-out metric |
|---|---|---|---|
| Crop recommendation (RandomForest classifier) | Public "Crop Recommendation Dataset" | 2,200 (22 classes) | accuracy ≈ **0.995**, macro-F1 ≈ 0.995 |
| Price prediction (RandomForest regressor) | Agmarknet / data.gov.in snapshot (documented subset) | 70,697 (7 crops, 28 states, 1,982 markets) | MAE ≈ **₹281/quintal**, R² ≈ **0.92** (vs ₹1,144 baseline) |

Verified working through the backend proxy:
- `GET /api/ai/status` → both models `loaded: true`.
- `POST /api/ai/price-prediction` → `predicted_price: 3259.83` for Tomato/Bihar/Gaya APMC.
- `POST /api/ai/crop-recommendation` → top recommendation `rice` (99% model confidence).

Sources and download dates are recorded in `docs/ai-datasets.md`.

---

## 7. Demo data (isolated, clearly labelled)

Seeded into a **separate** database `agri_marketplace_demo` (never the production DB):

- 10 farmers, 10 buyers, 1 admin
- 20 crop listings (Tomato, Onion, Potato, Rice, Wheat, Mango, Banana)
- 15 international importers, 10 Indian exporters (Karnataka/Mysuru heavy)
- 10 buying requests, 10 enquiries, 3 orders

Every record carries an explicit **"SAMPLE / DEMO DATA"** label. Re-seed at any time with:

```
cd agri-global-marketplace\backend
npm run seed:demo
```

Demo logins (password `Demo@12345`):
- farmer: `farmer1@demo.agriglobal.test`
- buyer: `buyer1@demo.agriglobal.test`
- admin: `admin@demo.agriglobal.test`

---

## 8. Phase-14 verification checklist

| # | Item | Result |
|---|---|---|
| 1 | MongoDB running | ✅ |
| 2 | Backend starts on :5000 (`/api/health`) | ✅ |
| 3 | FastAPI starts on :8000 (`/health`, both models loaded) | ✅ |
| 4 | Frontend starts on :5173 | ✅ |
| 5 | Production frontend build succeeds | ✅ |
| 6 | Registration works | ✅ (live + tested) |
| 7 | Login works | ✅ |
| 8 | Crop listing / search / filters | ✅ |
| 9 | Global Buyers page + filters | ✅ |
| 10 | Indian Exporter directory + filters (State/District/Crop/Name) | ✅ |
| 11 | Buyer Finder matching (with honest empty results) | ✅ |
| 12 | Enquiry system (draft → submit → history → admin review) | ✅ |
| 13 | Admin permissions / role denial | ✅ |
| 14 | AI endpoints (price + crop) | ✅ (trained models) |
| 15 | Automated tests (backend/frontend/AI/e2e) | ✅ 97/97 |
| 16 | Mobile layout | ✅ (Playwright mobile project passes) |

---

## 9. Remaining limitations (honest)

1. **Price model**: the real price data spans only ~65 days, so full-year seasonality
   cannot be learned. The API returns this warning on every prediction, and prices are
   modal **mandi** prices (not export or retail prices).
2. **AI predictions are estimates**, not live/guaranteed market prices. The UI shows
   metrics, coverage, limitations and a disclaimer — it never claims certainty.
3. **Enquiries are stored internally only.** There is no delivery service connected, so
   an enquiry is never auto-emailed to a company. The UI states this ("has NOT been
   delivered"), and provides a `mailto:` draft the user sends themselves.
4. **Global Buyers / Indian exporters are DEMO records** in the demo DB. Real records
   must be added and **verified by an admin with written evidence** before farmers see
   them; unverified companies are hidden and never shown as verified.
5. **Currency conversion** depends on a free external FX API; if unreachable, the app
   degrades gracefully and shows INR with a note.
6. **Auth rate limit** (30 requests / 15 min on `/api/auth`) is intentional. Running the
   e2e suite many times in a row can trip it; restart the backend to reset the in-memory
   limiter.
7. **Playwright browsers** must be installed once: `npx playwright install chromium`.

---

## 10. Exact startup commands

MongoDB must be running first (e.g. `mongod` on `127.0.0.1:27017`).

```text
# Terminal 1 — AI service
cd agri-global-marketplace\ai-service
python -m uvicorn app.main:app --port 8000

# Terminal 2 — Backend  (use the demo DB)
cd agri-global-marketplace\backend
$env:MONGODB_URI='mongodb://127.0.0.1:27017/agri_marketplace_demo'   # PowerShell
npm run dev

# Terminal 3 — Frontend
cd agri-global-marketplace\frontend
npm run dev
```

One-time setup of demo data and AI models:

```text
# Demo data (isolated DB)
cd agri-global-marketplace\backend
npm run seed:demo

# Train the AI models from the datasets already in the repo
cd agri-global-marketplace\ai-service
python training/train_crop.py datasets/Crop_recommendation.csv
python training/train_price.py datasets/price_data.csv
```

Run the tests:

```text
npm --prefix backend test              # 35 tests
npm --prefix frontend test             # 43 tests
cd ai-service && python -m pytest -q   # 15 tests
npx playwright install chromium        # once
npm --prefix frontend run test:e2e     # 4 tests
```

Or all at once from the repo root: `npm run verify`
(lint → frontend/backend/AI tests → build → e2e).

---

## 11. Conclusion

The project was previously code-complete but never executed. It has now been fully run
and verified on a real machine: **97/97 automated tests pass**, the production build
succeeds, both AI models are trained on real public data and serving predictions, and
every user-facing feature was exercised end-to-end against an isolated, clearly-labelled
demo database. Two genuine application bugs and several test-configuration defects were
found and fixed. Remaining limitations are documented above and are either by design
(no external enquiry delivery) or honestly surfaced in the UI (data-coverage warnings,
"not publicly available" fallbacks, demo labels).
