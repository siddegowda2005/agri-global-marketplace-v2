# AI-Powered International Agricultural Marketplace
Status: backend + AI service written; frontend in progress. See PROJECT_PROGRESS.md.
## Run
```
# backend (needs MongoDB)
cd backend && cp ../.env.example .env && npm install && npm run dev
# tests
cd backend && npm test
# AI service
cd ai-service && pip install -r requirements.txt
python training/train_price.py datasets/price_data.csv
python training/train_crop.py datasets/Crop_recommendation.csv
uvicorn app.main:app --port 8000
cd ai-service && python -m pytest
```
Datasets are not bundled; see ai-service/datasets/README.md.
