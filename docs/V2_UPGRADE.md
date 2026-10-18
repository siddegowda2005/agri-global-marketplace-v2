# AgriGlobal V2 upgrade notes

## Why the symptoms happened (and what to do)
| Symptom | Cause | Fix |
|---|---|---|
| `models: loaded: false` in /health | No trained model files exist; the models are trained from datasets you must supply | Run the data + training steps below, restart the AI service |
| "AI service is currently unavailable" | The backend could not reach the FastAPI service (not running, wrong port/URL). V2 now returns distinct messages: unreachable / model not trained / bad input, logs the real cause in the backend console, and the AI pages show a status banner | Start `npm run dev:ai`; check `AI_SERVICE_URL=http://127.0.0.1:8000` in backend/.env |
| Directories / buyer finder empty | No company records existed (none are invented). Records shown to farmers must be admin-verified | Import researched records (below), then verify them in Admin > Companies |

## Apply V2 over your existing project (keeps your .env, node_modules, uploads and database)
1. Back up: `git add -A && git commit -m "pre-v2 backup"` (the project folder already has a .git), and optionally `mongodump`.
2. Extract `agri-global-marketplace-V2-patch.zip` into the project root, allowing overwrite. No new npm/pip packages are needed.
3. Database: no migration or reset. New fields are optional; existing users, crops, orders and enquiries keep working (old enquiries show as "draft").
4. Restart backend, AI service and frontend.

## Train the AI models (real data only)
```
cd ai-service
# Crop model: download the public Kaggle "Crop Recommendation Dataset" CSV in your browser, then:
python training/prepare_crop_data.py C:\path\to\Crop_recommendation.csv
# Price model: free API key from https://data.gov.in (no CAPTCHA bypass), PowerShell:
$env:DATA_GOV_API_KEY="your-key"
python training/fetch_price_data.py --commodity Tomato --commodity Onion --commodity Potato
python training/train_all.py
```
The government price API returns recent daily prices only, so history builds up as you rerun the fetch daily; the trainer warns when coverage is under a year. For a multi-year history use a historical Agmarknet export you are licensed to use and pass it as `datasets/price_data.csv` (columns Commodity, State, Market, Arrival_Date, Modal_Price). Restart uvicorn, then open http://localhost:8000/health: both models must show `"loaded": true`.

## Company data
`cd backend && npm run import:companies -- data/companies.seed.json` imports 9 records found in public listings (UAE, Singapore). They are UNVERIFIED and built from trade-fair/directory pages, not company sites. Open Admin > Companies, check each company's official site, fill in website/email/phone only if published, then click Verify and record your evidence. Add more with `data/companies.template.json` or the admin form. Add buying requests only from real, citable sources (Admin > Buying requests); a request counts as "active" only if verified, unexpired and re-checked within 30 days.

## What changed
Backend: Global Buyers API (`/api/global-buyers`, `/requests`, `/:id`), BuyingRequest model + admin API, company verification with required evidence / reject / duplicate detection, extended company fields, enquiry statuses (draft, submitted, delivery_attempted, delivered, failed) with history and admin review, country-name normalisation, AI proxy diagnostics and `/api/ai/status`.
AI: coverage/limitations/warnings in price responses, name normalisation and duplicate collapsing, startup model preload, data fetch/prepare/train-all scripts.
Frontend: Global Buyers page (cards, filters, requests tab, details), "Find International Buyers" on crops, enquiry form + history, admin tabs, AI page status/units/currency/limitations, refreshed home page.
