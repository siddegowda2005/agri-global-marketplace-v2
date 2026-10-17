"""Train the crop price model on REAL market data (e.g. Agmarknet CSV export).

Required columns (case-insensitive, aliases accepted):
  commodity, state (optional), market (optional), date, modal_price
Usage: python training/train_price.py datasets/price_data.csv
Validation is time-aware: the most recent 20% of dates form the test set.
"""
import sys
from pathlib import Path
import numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
sys.path.insert(0, str(Path(__file__).parent))
from common import save_artifact, now_iso

ALIASES = {"commodity": ["commodity", "crop", "commodity_name"], "state": ["state"], "market": ["market", "mandi"],
           "date": ["date", "arrival_date", "price_date"], "modal_price": ["modal_price", "modal price", "modal_price_rs/quintal"]}
CAT, NUM = ["commodity", "state", "market"], ["month", "year"]

def load_dataset(path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    rename = {}
    for std, opts in ALIASES.items():
        for o in opts:
            if o.replace(" ", "_") in df.columns: rename[o.replace(" ", "_")] = std; break
    df = df.rename(columns=rename)
    missing = [c for c in ("commodity", "date", "modal_price") if c not in df.columns]
    if missing: raise ValueError(f"Dataset missing required columns: {missing}")
    for c in ("state", "market"):
        if c not in df.columns: df[c] = "Unknown"
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df = df.dropna(subset=["date", "modal_price", "commodity"])
    df = df[df["modal_price"] > 0].copy()
    for c in ("commodity", "state", "market"): df[c] = df[c].fillna("Unknown").astype(str).str.strip().str.lower()
    df["month"], df["year"] = df["date"].dt.month, df["date"].dt.year
    return df.sort_values("date").reset_index(drop=True)

def build_pipeline(seed=42):
    pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), CAT), ("num", "passthrough", NUM)])
    return Pipeline([("pre", pre), ("rf", RandomForestRegressor(n_estimators=200, min_samples_leaf=2, n_jobs=-1, random_state=seed))])

def train(csv_path, out_dir, test_fraction=0.2, min_rows=200):
    df = load_dataset(csv_path)
    if len(df) < min_rows: raise ValueError(f"Need at least {min_rows} valid rows, found {len(df)}")
    cut = int(len(df) * (1 - test_fraction))
    train_df, test_df = df.iloc[:cut], df.iloc[cut:]
    if test_df.empty or train_df.empty: raise ValueError("Not enough data for a time-based split")
    pipe = build_pipeline().fit(train_df[CAT + NUM], train_df["modal_price"])
    pred = pipe.predict(test_df[CAT + NUM])
    base = test_df["commodity"].map(train_df.groupby("commodity")["modal_price"].mean()).fillna(train_df["modal_price"].mean())
    metrics = {"mae": float(mean_absolute_error(test_df["modal_price"], pred)),
               "rmse": float(np.sqrt(mean_squared_error(test_df["modal_price"], pred))),
               "r2": float(r2_score(test_df["modal_price"], pred)),
               "baseline_mae_commodity_mean": float(mean_absolute_error(test_df["modal_price"], base))}
    final = build_pipeline().fit(df[CAT + NUM], df["modal_price"])  # refit on all data for serving
    meta = {"model_version": f"price-rf-{now_iso()[:10]}", "trained_at": now_iso(), "rows": int(len(df)),
            "train_range": [str(train_df.date.min().date()), str(train_df.date.max().date())],
            "test_range": [str(test_df.date.min().date()), str(test_df.date.max().date())],
            "data_range": [str(df.date.min().date()), str(df.date.max().date())],
            "validation": "time-based holdout (latest 20% of dates)", "metrics_on_holdout": metrics,
            "price_unit": "INR per quintal (as in source data)", "commodities": sorted(df.commodity.unique().tolist()),
            "states": sorted(df.state.unique().tolist()), "markets": sorted(df.market.unique().tolist())}
    save_artifact(final, meta, Path(out_dir), "price_model")
    return meta

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    m = train(sys.argv[1], Path(__file__).parent.parent / "app" / "models")
    print(m["metrics_on_holdout"])
