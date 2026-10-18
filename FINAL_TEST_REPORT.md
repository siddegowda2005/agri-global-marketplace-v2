# Final Test Report
Environment: build sandbox, Node 22, Python 3.12, NO network, no MongoDB, no installed npm packages, sklearn/pandas present, fastapi absent.

| Suite | Written | Executed | Result |
|---|---|---|---|
| Backend (Vitest+Supertest), ~35 cases incl. concurrency, auth, RBAC, injection | yes | NO | NOT TESTED |
| Frontend (Vitest+RTL), ~25 cases | yes | NO | NOT TESTED |
| AI (pytest), 9 cases | yes | NO (fastapi missing) | NOT TESTED |
| Playwright e2e (3 desktop + 1 mobile) | yes | NO | NOT TESTED |
| Production build (vite build) | n/a | NO | NOT TESTED |

Checks that DID run:
- PASSED: `node --check` on all backend files (backend lint).
- PASSED: manual execution of price/crop training + prediction functions on synthetic fixtures (holdout R2 0.98, accuracy 1.0 on toy data; meaningless for real quality).
- NOT a real check: bracket-balance script on frontend files.

Not covered: real-data model metrics, external exchange-rate API, public deployment, international accessibility, security review beyond code design (helmet, rate limiting, bcrypt, input validation, NoSQL operator stripping, upload filtering, role checks).
Fill in real counts here after running `npm run verify`.

## V2 additions
New tests written, NOT executed (no network in build sandbox): backend/src/tests/v2.test.js (about 12 cases: evidence, duplicates, filters, buying-request lifecycle incl. expiry/staleness, enquiry workflow, AI proxy codes), frontend/src/tests/v2.test.jsx (about 16 cases), 6 new pytest cases. Executed: `node --check` on all backend files; Python helper logic (dedupe/normalise, API record parser, CSV merge, crop-data cleaner) on synthetic data. Everything else: NOT TESTED.
