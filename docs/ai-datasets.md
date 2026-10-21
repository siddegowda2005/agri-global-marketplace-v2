# AI Datasets — sources and provenance

Nothing here is generated or faked. Every file below is real public data,
recorded here so the models can be reproduced and audited.

## 1. Crop recommendation dataset (used by the crop model)

- File in this repo: `ai-service/datasets/Crop_recommendation.csv`
- Rows: 2200 · Classes: 22 (`classes: 22, smallest_class: 100` after `prepare_crop_data.py`)
- Columns: `N,P,K,temperature,humidity,ph,rainfall,label`
- Source: public "Crop Recommendation Dataset" (originally published on Kaggle by
  Atharva Ingle; widely mirrored). Downloaded from a public mirror:
  `https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv`
- Downloaded: 2026-10-19
- Train command:
  `python training/train_crop.py datasets/Crop_recommendation.csv`
- Trained model: `ai-service/app/models/crop_model.joblib` + `crop_model.meta.json`
  (holdout accuracy ≈ 0.995)

## 2. Mandi price dataset (used by the price model)

- File in this repo: `ai-service/datasets/price_data.csv` (70,697 rows)
- Columns: `commodity,state,market,arrival_date,modal_price`
- Source: a public snapshot of Agmarknet / data.gov.in daily mandi prices:
  `https://raw.githubusercontent.com/herrrickshaw/agri-commodity-tracker/main/data/mandi_prices_snapshot.csv`
  (full snapshot: 463,023 rows, 330 commodities)
- Downloaded: 2026-10-19
- This repo keeps a **documented subset** of that real data — the seven crops the app
  lists (tomato, onion, potato, rice, wheat, mango, banana) — to keep the file small.
  No values were changed or synthesised; only rows were filtered.
  28 states · 1,982 markets · 2026-07-21 → 2026-09-24.
- Train command:
  `python training/train_price.py datasets/price_data.csv`
- Trained model: `ai-service/app/models/price_model.joblib` + `price_model.meta.json`
  (time-based holdout: MAE ≈ ₹281/quintal, R² ≈ 0.92, vs ₹1,144 baseline)

### Known limitation (surfaced honestly in API responses)
The price data spans only ~65 days, so the model cannot learn full-year seasonality.
The service returns this warning in every prediction
(`warnings: ["Training data spans only 65 days; ..."]`).

## Refreshing the price data
`python training/fetch_price_data.py --commodity Tomato --commodity Onion`
needs a free `DATA_GOV_API_KEY` from data.gov.in and appends recent daily prices to
`price_data.csv`; run it regularly to extend the history.
