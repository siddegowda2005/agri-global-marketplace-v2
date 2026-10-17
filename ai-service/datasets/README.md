# Datasets (not bundled)
Place REAL data here, then train. Nothing is generated or faked.
- Price model: `price_data.csv` - Agmarknet / data.gov.in "Current daily price of commodities" exports
  (columns: Commodity, State, Market, Arrival_Date, Modal_Price). Prices are INR per quintal.
  `python training/train_price.py datasets/price_data.csv`
- Crop model: `Crop_recommendation.csv` - public Kaggle "Crop Recommendation Dataset" (N,P,K,temperature,humidity,ph,rainfall,label).
  `python training/train_crop.py datasets/Crop_recommendation.csv`
Record the exact source URL and download date in docs/ai-datasets.md.
