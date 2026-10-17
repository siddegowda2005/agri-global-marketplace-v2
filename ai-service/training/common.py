import json, datetime as dt
from pathlib import Path
import joblib

def save_artifact(pipeline, metadata: dict, out_dir: Path, name: str):
    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, out_dir / f"{name}.joblib")
    (out_dir / f"{name}.meta.json").write_text(json.dumps(metadata, indent=2, default=str))

def now_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
