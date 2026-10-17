# Requirements Checklist
Status: Not Started | In Progress | Implemented (code written, NOT yet executed) | Tested | Blocked | Skipped

| Area | Feature | Status |
|---|---|---|
| Auth | Register (farmer/buyer), login, JWT, profile, role guards, no public admin signup | Implemented |
| Auth | Logout | Not Started (client-side token discard, frontend) |
| Crops | CRUD, image upload validation (type/size/count), search, filters, pagination | Implemented |
| Orders | Place, status flow, atomic stock reservation, idempotency, stock restore, notifications | Implemented |
| Cart | Add/update/remove, stock check, checkout | Implemented |
| Currency | Live rates API + cache + INR fallback, timestamp | Implemented |
| Companies | Directory model, admin CRUD/verify, verified-only visibility, rule-based matching | Implemented |
| Enquiry | Draft generation + mailto, never auto-sent | Implemented |
| Notifications | List, unread count, mark read | Implemented |
| Admin | Users (deactivate), crops, orders, stats | Implemented |
| AI | Price model (RF Regressor, time-based validation, MAE/RMSE/R2) | Implemented; verified on fixture data only, needs real dataset |
| AI | Crop recommendation (RF Classifier) | Implemented; verified on fixture data only, needs real dataset |
| AI | FastAPI endpoints + backend proxy (503 if untrained) | Implemented (FastAPI not run here) |
| Tests | Backend Supertest suite (30ish cases) | Implemented, NOT run (no network for mongodb-memory-server) |
| Tests | Pytest suite | Implemented, NOT run (fastapi not installed here); training logic smoke-tested manually |
| Frontend | All 28 pages, router, currency selector, cart UI, dashboards | Not Started |
| Frontend | Vitest/RTL tests | Not Started |
| E2E | Playwright tests | Not Started |
| Maps | Collection centers (Leaflet/OSM), CollectionCenter model | Not Started |
| Export guidance | ExportGuide model/admin CRUD + sourced content | Not Started |
| Indian exporter directory | Same Company model (type=indian_exporter); needs real APEDA data | Implemented (model) / Blocked (data) |
| Audit logs, image classification | Optional | Skipped for now |
