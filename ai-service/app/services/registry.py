import json, os, datetime as dt
from pathlib import Path
import joblib, pandas as pd

DEFAULT_DIR = Path(os.environ.get("AI_MODEL_DIR", Path(__file__).resolve().parent.parent / "models"))

class ModelUnavailable(Exception): ...
class BadInput(Exception): ...

class Registry:
    def __init__(self, model_dir=None):
        self.dir = Path(model_dir) if model_dir else DEFAULT_DIR
        self._cache = {}

    def _load(self, name):
        if name not in self._cache:
            p, m = self.dir / f"{name}.joblib", self.dir / f"{name}.meta.json"
            if not p.exists() or not m.exists():
                raise ModelUnavailable(f"{name} has not been trained yet. Run the training script with a real dataset.")
            self._cache[name] = (joblib.load(p), json.loads(m.read_text()))
        return self._cache[name]

    def status(self):
        out = {}
        for n in ("price_model", "crop_model"):
            try: out[n] = {"loaded": True, "version": self._load(n)[1]["model_version"]}
            except ModelUnavailable: out[n] = {"loaded": False}
        return out

    def predict_price(self, crop, market=None, state=None, date=None):
        model, meta = self._load("price_model")
        crop_n = crop.strip().lower()
        if crop_n not in meta["commodities"]:
            raise BadInput(f"Crop '{crop}' was not in the training data. Supported: {', '.join(meta['commodities'][:30])}")
        try: d = pd.to_datetime(date) if date else pd.Timestamp(dt.date.today())
        except Exception: raise BadInput("date must be a valid date (YYYY-MM-DD)")
        row = pd.DataFrame([{"commodity": crop_n, "state": (state or "Unknown").strip().lower(),
                             "market": (market or "Unknown").strip().lower(), "month": d.month, "year": d.year}])
        price = float(model.predict(row)[0])
        return {"predicted_price": round(price, 2), "price_unit": meta["price_unit"], "prediction_date": str(d.date()),
                "model_version": meta["model_version"], "metrics_on_holdout": meta["metrics_on_holdout"], "data_range": meta["data_range"],
                "training_rows": meta["rows"], "coverage": {"commodities": len(meta["commodities"]), "states": len(meta["states"]), "markets": len(meta["markets"]), "days": meta.get("coverage_days")},
                "warnings": meta.get("warnings", []),
                "limitations": ["Estimate from past mandi prices; it is not a live or guaranteed market price.",
                                "Only crops, states and markets present in the training data are supported.",
                                "Predictions far outside the training date range extrapolate poorly.",
                                "Prices are modal mandi prices, not export or retail prices."],
                "disclaimer": "Model estimate from historical data. Not a live market price."}

    def recommend_crop(self, values: dict, top_k=3):
        model, meta = self._load("crop_model")
        row = pd.DataFrame([{f: values[f] for f in meta["features"]}])
        proba = model.predict_proba(row)[0]
        order = proba.argsort()[::-1][:top_k]
        imp = sorted(meta["feature_importance"].items(), key=lambda kv: -kv[1])[:3]
        return {"recommendations": [{"crop": str(model.classes_[i]), "probability": round(float(proba[i]), 4)} for i in order],
                "factors_considered": {"inputs": values, "most_influential_features": [k for k, _ in imp]},
                "model_version": meta["model_version"], "metrics_on_holdout": meta["metrics_on_holdout"], "note": meta["note"]}
