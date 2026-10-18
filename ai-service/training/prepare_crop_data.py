"""Validate (and optionally download) a crop-recommendation dataset.
Usage:  python training/prepare_crop_data.py PATH_OR_URL     (writes datasets/Crop_recommendation.csv)
Get the data legitimately: e.g. the public Kaggle "Crop Recommendation Dataset" (download in your browser after logging in to Kaggle,
or `kaggle datasets download -d atharvaingle/crop-recommendation-dataset` if you have Kaggle API credentials), then pass the CSV path.
Only http(s) URLs you explicitly provide are fetched. Required columns: N, P, K, temperature, humidity, ph, rainfall, label.
"""
import sys, urllib.request
from pathlib import Path
import pandas as pd
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
RANGES = {"N": (0, 300), "P": (0, 300), "K": (0, 300), "temperature": (-10, 60), "humidity": (0, 100), "ph": (0, 14), "rainfall": (0, 5000)}
ALIAS = {"n": "N", "nitrogen": "N", "p": "P", "phosphorus": "P", "k": "K", "potassium": "K", "temp": "temperature", "ph_value": "ph", "crop": "label", "label": "label"}

def clean(df: pd.DataFrame):
    df = df.rename(columns={c: ALIAS.get(c.strip().lower(), c.strip().lower() if c.strip().lower() in [f.lower() for f in FEATURES] else c) for c in df.columns})
    df = df.rename(columns={c: next((f for f in FEATURES if f.lower() == c.lower()), c) for c in df.columns})
    missing = [c for c in FEATURES + ["label"] if c not in df.columns]
    if missing: raise ValueError(f"Missing required columns: {missing}")
    n0 = len(df)
    df = df[FEATURES + ["label"]].copy()
    for f in FEATURES: df[f] = pd.to_numeric(df[f], errors="coerce")
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    df = df.dropna()
    for f, (lo, hi) in RANGES.items(): df = df[df[f].between(lo, hi)]
    df = df.drop_duplicates().reset_index(drop=True)
    report = {"rows_in": n0, "rows_out": len(df), "classes": int(df["label"].nunique()), "smallest_class": int(df["label"].value_counts().min()) if len(df) else 0}
    if len(df) < 100 or report["classes"] < 2: raise ValueError(f"Dataset too small or has <2 classes: {report}")
    return df, report

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    src, out = sys.argv[1], Path(__file__).parent.parent / "datasets" / "Crop_recommendation.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    if src.startswith(("http://", "https://")):
        tmp = out.with_suffix(".download"); urllib.request.urlretrieve(src, tmp); src = str(tmp)
    df, rep = clean(pd.read_csv(src)); df.to_csv(out, index=False); print("OK", rep, "->", out)
