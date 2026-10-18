"""Train both models from datasets/ and report whether they load. Run from ai-service/: python training/train_all.py"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(Path(__file__).parent))
import train_price, train_crop
from app.services.registry import Registry
MODELS = ROOT / "app" / "models"; DATA = ROOT / "datasets"
ok = True
for name, fn, csv in (("price", train_price.train, DATA / "price_data.csv"), ("crop", train_crop.train, DATA / "Crop_recommendation.csv")):
    if not csv.exists():
        print(f"[{name}] SKIPPED: {csv.name} not found. See datasets/README.md"); ok = False; continue
    try:
        meta = fn(csv, MODELS); print(f"[{name}] trained {meta['model_version']} rows={meta['rows']} metrics={meta['metrics_on_holdout']}")
        for w in meta.get("warnings", []): print(f"[{name}] WARNING: {w}")
    except Exception as e:
        print(f"[{name}] FAILED: {e}"); ok = False
print("Health:", Registry(MODELS).status()); sys.exit(0 if ok else 1)
