# Datasets (not bundled)
Place REAL data here, then train. Nothing is generated or faked.
- Price model: `price_data.csv` - Agmarknet / data.gov.in "Current daily price of commodities" exports
  (columns: Commodity, State, Market, Arrival_Date, Modal_Price). Prices are INR per quintal.
  `python training/train_price.py datasets/price_data.csv`
- Crop model: `Crop_recommendation.csv` - public Kaggle "Crop Recommendation Dataset" (N,P,K,temperature,humidity,ph,rainfall,label).
  `python training/train_crop.py datasets/Crop_recommendation.csv`
Record the exact source URL and download date in docs/ai-datasets.md.

## V2 helpers
- `python training/fetch_price_data.py --commodity Tomato --commodity Onion` (needs free DATA_GOV_API_KEY from data.gov.in; returns recent daily prices, appended to price_data.csv; run daily to build history).
- `python training/prepare_crop_data.py path/to/Crop_recommendation.csv` validates and cleans the crop dataset.
- `python training/train_all.py` trains whatever datasets are present and prints /health-style status.
After training, restart uvicorn and open http://localhost:8000/health : both models must say `"loaded": true`.
