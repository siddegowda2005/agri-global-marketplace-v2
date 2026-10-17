# AI-Powered International Agricultural Marketplace for Farmers
Final-year B.E. AI&DS project. React + Vite + Tailwind | Express + MongoDB | FastAPI + scikit-learn.
No payments, no shipping. See PROJECT_PROGRESS.md, REQUIREMENTS_CHECKLIST.md, SKIPPED_FEATURES.md, FINAL_TEST_REPORT.md.

## Prerequisites
Node 20+ (tested layout on 22), Python 3.10+, MongoDB 6+ running locally (or an Atlas URI).

## Install
```
cp .env.example backend/.env      # edit JWT_SECRET; keep only backend vars if you like
npm --prefix backend install
npm --prefix frontend install
pip install -r ai-service/requirements.txt
```
## Prepare data and models (real datasets are not bundled)
1. Put an Agmarknet price CSV at ai-service/datasets/price_data.csv and the Kaggle Crop_recommendation.csv in the same folder (see its README).
2. `cd ai-service && python training/train_price.py datasets/price_data.csv && python training/train_crop.py datasets/Crop_recommendation.csv`
3. `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm --prefix backend run seed:admin`
4. `npm --prefix backend run seed:guides` (adds export guidance entries that link to official sources; review them).
5. Log in as admin, add real companies (with source URLs) and collection centers, then verify them.

## Run (3 terminals)
```
npm run dev:backend      # http://localhost:5000
npm run dev:ai           # http://localhost:8000
npm run dev:frontend     # http://localhost:5173
```
## Test / build
```
npm run lint && npm run test:all && npm run build
cd frontend && npx playwright install chromium && npm run test:e2e   # needs the stack running
```
