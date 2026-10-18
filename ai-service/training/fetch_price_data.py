"""Download Indian mandi (market) prices from the official Open Government Data (data.gov.in) API.

You need a FREE personal API key from https://data.gov.in (register, then "My Account"). No CAPTCHA is bypassed.
  Windows PowerShell:  $env:DATA_GOV_API_KEY="your-key"; python training/fetch_price_data.py --commodity Tomato --commodity Onion
Resource: "Current Daily Price of Various Commodities from Various Markets (Mandis)".
IMPORTANT: this API returns the most recent day(s) of prices, not a multi-year history. Run it daily (or use a historical
dataset you are licensed to use, e.g. a Kaggle Agmarknet export) and records are APPENDED and de-duplicated. The trainer
warns when the collected history is short. Nothing here is generated or simulated.
"""
import argparse, csv, json, os, sys, time, urllib.parse, urllib.request
from pathlib import Path

RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
FIELDS = ["Commodity", "State", "Market", "Arrival_Date", "Modal_Price"]

def parse_records(payload: dict):
    """Convert API JSON into CSV rows; skips rows without a usable positive modal price."""
    rows = []
    for r in payload.get("records", []):
        try: price = float(r.get("modal_price"))
        except (TypeError, ValueError): continue
        if price <= 0 or not r.get("commodity") or not r.get("arrival_date"): continue
        rows.append({"Commodity": r["commodity"], "State": r.get("state", ""), "Market": r.get("market", ""), "Arrival_Date": r["arrival_date"], "Modal_Price": price})
    return rows

def fetch(api_key, commodity=None, state=None, max_records=5000, resource=RESOURCE, pause=0.5):
    out, offset, page = [], 0, 1000
    while offset < max_records:
        q = {"api-key": api_key, "format": "json", "offset": offset, "limit": min(page, max_records - offset)}
        if commodity: q["filters[commodity]"] = commodity
        if state: q["filters[state]"] = state
        url = f"https://api.data.gov.in/resource/{resource}?{urllib.parse.urlencode(q)}"
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "agri-project/1.0"}), timeout=60) as resp:
            payload = json.load(resp)
        batch = parse_records(payload)
        out.extend(batch)
        if not payload.get("records") or len(payload["records"]) < q["limit"]: break
        offset += q["limit"]; time.sleep(pause)
    return out

def merge_csv(path: Path, rows):
    existing = []
    if path.exists():
        with path.open(newline="", encoding="utf-8") as f: existing = list(csv.DictReader(f))
    seen, merged = set(), []
    for r in existing + rows:
        k = (str(r["Commodity"]).lower(), str(r["State"]).lower(), str(r["Market"]).lower(), str(r["Arrival_Date"]))
        if k not in seen: seen.add(k); merged.append(r)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader(); w.writerows({k: r[k] for k in FIELDS} for r in merged)
    return len(merged)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--commodity", action="append", help="repeatable; omit for all commodities")
    ap.add_argument("--state"); ap.add_argument("--max-records", type=int, default=5000)
    ap.add_argument("--out", default=str(Path(__file__).parent.parent / "datasets" / "price_data.csv"))
    a = ap.parse_args()
    key = os.environ.get("DATA_GOV_API_KEY")
    if not key: sys.exit("Set DATA_GOV_API_KEY (free key from https://data.gov.in). Not bypassing any authentication.")
    rows = []
    for c in (a.commodity or [None]):
        try: got = fetch(key, c, a.state, a.max_records)
        except Exception as e: print(f"Failed for {c or 'all'}: {e}"); continue
        print(f"{c or 'all'}: {len(got)} records"); rows += got
    if not rows: sys.exit("No records downloaded. Check the API key, filters and internet access.")
    print(f"Saved {merge_csv(Path(a.out), rows)} total rows to {a.out}")
