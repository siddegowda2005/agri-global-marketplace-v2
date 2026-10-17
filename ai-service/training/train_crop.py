"""Train the crop recommendation model on a REAL dataset (e.g. Kaggle 'Crop Recommendation Dataset').

Required columns: N, P, K, temperature, humidity, ph, rainfall, label
Usage: python training/train_crop.py datasets/Crop_recommendation.csv
"""
import sys
from pathlib import Path
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
sys.path.insert(0, str(Path(__file__).parent))
from common import save_artifact, now_iso
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

def train(csv_path, out_dir, seed=42):
    df = pd.read_csv(csv_path)
    missing = [c for c in FEATURES + ["label"] if c not in df.columns]
    if missing: raise ValueError(f"Dataset missing required columns: {missing}")
    df = df.dropna(subset=FEATURES + ["label"]).copy()
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    if len(df) < 100 or df["label"].nunique() < 2: raise ValueError("Dataset too small or has fewer than 2 classes")
    counts = df["label"].value_counts()
    strat = df["label"] if counts.min() >= 2 else None
    Xtr, Xte, ytr, yte = train_test_split(df[FEATURES], df["label"], test_size=0.2, random_state=seed, stratify=strat)
    clf = RandomForestClassifier(n_estimators=200, random_state=seed, n_jobs=-1).fit(Xtr, ytr)
    pred = clf.predict(Xte)
    metrics = {"accuracy": float(accuracy_score(yte, pred)), "f1_macro": float(f1_score(yte, pred, average="macro"))}
    final = RandomForestClassifier(n_estimators=200, random_state=seed, n_jobs=-1).fit(df[FEATURES], df["label"])
    meta = {"model_version": f"crop-rf-{now_iso()[:10]}", "trained_at": now_iso(), "rows": int(len(df)),
            "validation": "stratified 80/20 holdout", "metrics_on_holdout": metrics, "features": FEATURES,
            "classes": sorted(final.classes_.tolist()),
            "feature_importance": dict(zip(FEATURES, map(float, final.feature_importances_))),
            "note": "Recommends crops from soil nutrients and climate only. It does not predict market demand."}
    save_artifact(final, meta, Path(out_dir), "crop_model")
    return meta

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    print(train(sys.argv[1], Path(__file__).parent.parent / "app" / "models")["metrics_on_holdout"])
