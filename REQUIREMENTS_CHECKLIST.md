# Requirements Checklist
Legend: **Implemented** = code written; **Tested** = automated test actually executed and passed (none yet, see FINAL_TEST_REPORT.md); Blocked; Skipped.
No feature below is marked Tested because the build sandbox had no network (cannot install npm/pip packages or download MongoDB).

| Area | Feature | Status |
|---|---|---|
| Auth | Register farmer/buyer, login, logout (client token discard), profile, JWT, role guards, no public admin signup | Implemented |
| Crops | Add/edit/delete, up to 5 validated images, quantity/price/location/availability, my crops | Implemented |
| Marketplace | Browse, search, category/state/price filters, pagination, details, farmer info | Implemented |
| Cart/Orders | Cart CRUD, stock-validated checkout, atomic reservation, idempotency, accept/reject/status flow, restore stock, order history/details | Implemented |
| Notifications | In-app list, unread badge, mark read | Implemented |
| Currency | Country/currency selection, live-rate conversion, timestamp, cache fallback, INR fallback | Implemented |
| Companies | Importer and Indian-exporter directories, verified-only for users, details, contact buttons (website/email draft/call/contact page), admin CRUD + verify | Implemented (no records shipped: need real sourced data) |
| Buyer matching | Rule-based score with reasons, never claims purchase intent | Implemented |
| Enquiries | Draft + editable text + mailto; never auto-sent | Implemented |
| Export guidance | Sourced entries (admin CRUD + seed script linking APEDA/DGFT/etc.) | Implemented (seed content is brief; admin should review/extend) |
| Collection centers | Verified-only list, Leaflet/OSM map, geolocation distance, directions link, admin CRUD | Implemented (no centers shipped: need real data) |
| Admin | Users enable/disable, crops, orders, companies, centers, guides, stats | Implemented |
| AI price prediction | RF regressor, time-based validation, MAE/RMSE/R2, API + UI | Implemented; needs real dataset to train. Python logic ran on synthetic fixtures only |
| AI crop recommendation | RF classifier, top-3 with probabilities, factors, API + UI | Implemented; needs real dataset to train |
| Pages | Home, About, Register, Login, 3 dashboards, Add/Edit crop, Marketplace, Details, Cart, Confirmation, Orders, Order details, 2 AI pages, Buyer finder, 2 directories, Company details, Enquiry, Export guidance, Centers, Notifications, Profile, Settings, Contact | Implemented (not compiled/run here) |
| Tests | Backend Supertest suite, Pytest suite, frontend Vitest/RTL suite, Playwright specs (3 desktop + 1 mobile) | Written, NOT executed (except Python training logic smoke test) |
| Map of crop locations | Crops store text location only (no coordinates) | Skipped |
| Image crop identification, audit logs, Zod/React-Hook-Form | Optional / simplified (manual validation used) | Skipped |
