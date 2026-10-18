"""Pipeline-mechanics tests. The CSVs here are TEST FIXTURES generated with a fixed seed;
they only prove the code works. Real models must be trained on real datasets."""
import numpy as np, pandas as pd, pytest
from fastapi.testclient import TestClient
import train_price, train_crop
from app.main import create_app

@pytest.fixture(scope="module")
def price_csv(tmp_path_factory):
    rng = np.random.default_rng(0)
    dates = pd.date_range("2022-01-01", periods=600, freq="D")
    rows = []
    for d in dates:
        for crop, base in (("Tomato", 1500), ("Onion", 1200)):
            rows.append({"Commodity": crop, "State": "Karnataka", "Market": "Mysuru", "Arrival_Date": d.strftime("%d-%m-%Y"),
                         "Modal_Price": base + 200 * np.sin(d.month) + rng.normal(0, 30)})
    p = tmp_path_factory.mktemp("d") / "p.csv"; pd.DataFrame(rows).to_csv(p, index=False); return p

@pytest.fixture(scope="module")
def crop_csv(tmp_path_factory):
    rng = np.random.default_rng(1); rows = []
    for label, (n, r) in {"rice": (80, 220), "maize": (60, 90)}.items():
        for _ in range(100):
            rows.append(dict(N=n + rng.normal(0, 5), P=40 + rng.normal(0, 5), K=40 + rng.normal(0, 5), temperature=25 + rng.normal(0, 2),
                             humidity=70 + rng.normal(0, 5), ph=6.5 + rng.normal(0, .2), rainfall=r + rng.normal(0, 10), label=label))
    p = tmp_path_factory.mktemp("c") / "c.csv"; pd.DataFrame(rows).to_csv(p, index=False); return p

@pytest.fixture(scope="module")
def client(price_csv, crop_csv, tmp_path_factory):
    out = tmp_path_factory.mktemp("models")
    train_price.train(price_csv, out); train_crop.train(crop_csv, out)
    return TestClient(create_app(out))

def test_price_metrics_reported_and_time_split(price_csv, tmp_path):
    m = train_price.train(price_csv, tmp_path)
    assert {"mae", "rmse", "r2"} <= set(m["metrics_on_holdout"])
    assert m["train_range"][1] <= m["test_range"][0]  # no future leakage
    assert m["metrics_on_holdout"]["r2"] > 0.5

def test_price_rejects_bad_dataset(tmp_path):
    p = tmp_path / "bad.csv"; pd.DataFrame({"x": [1]}).to_csv(p, index=False)
    with pytest.raises(ValueError): train_price.train(p, tmp_path)

def test_price_endpoint_valid(client):
    r = client.post("/predict/price", json={"crop": "tomato", "state": "Karnataka", "market": "Mysuru", "date": "2024-06-01"})
    assert r.status_code == 200
    b = r.json(); assert b["predicted_price"] > 0 and b["model_version"] and b["price_unit"] and b["prediction_date"] == "2024-06-01"
    assert "Not a live market price" in b["disclaimer"]
    assert b["coverage"]["commodities"] == 2 and b["training_rows"] > 0 and b["limitations"] and "warnings" in b

def test_price_endpoint_invalid(client):
    assert client.post("/predict/price", json={"crop": "unobtainium"}).status_code == 422
    assert client.post("/predict/price", json={"crop": "tomato", "date": "not-a-date"}).status_code == 422
    assert client.post("/predict/price", json={}).status_code == 422

def test_price_handles_missing_optional_fields(client):
    assert client.post("/predict/price", json={"crop": "onion"}).status_code == 200

def test_crop_endpoint(client):
    r = client.post("/recommend/crop", json=dict(N=82, P=40, K=40, temperature=25, humidity=70, ph=6.5, rainfall=220))
    assert r.status_code == 200
    recs = r.json()["recommendations"]; assert recs[0]["crop"] == "rice"
    assert abs(sum(x["probability"] for x in recs) - 1) < 1.0001 and r.json()["factors_considered"]["most_influential_features"]

def test_crop_validation(client):
    assert client.post("/recommend/crop", json=dict(N=-1, P=1, K=1, temperature=25, humidity=70, ph=6.5, rainfall=1)).status_code == 422
    assert client.post("/recommend/crop", json=dict(N=1, P=1, K=1, temperature=25, humidity=70, ph=20, rainfall=1)).status_code == 422
    assert client.post("/recommend/crop", json={"N": 1}).status_code == 422

def test_untrained_returns_503_not_fake_data(tmp_path):
    c = TestClient(create_app(tmp_path))
    assert c.post("/predict/price", json={"crop": "tomato"}).status_code == 503
    assert c.post("/recommend/crop", json=dict(N=1, P=1, K=1, temperature=25, humidity=70, ph=6.5, rainfall=1)).status_code == 503
    assert c.get("/health").json()["models"]["price_model"]["loaded"] is False

def test_crop_dataset_validation(tmp_path):
    p = tmp_path / "x.csv"; pd.DataFrame({"N": [1]}).to_csv(p, index=False)
    with pytest.raises(ValueError): train_crop.train(p, tmp_path)


def test_dedupes_and_normalises_names(tmp_path):
    rows = [{"Commodity": " Tomato  ", "State": "KARNATAKA", "Market": "Mysuru", "Arrival_Date": "01-01-2023", "Modal_Price": p} for p in (1000, 1200)]
    rows += [{"Commodity": "tomato", "State": "karnataka", "Market": "mysuru", "Arrival_Date": "02-01-2023", "Modal_Price": 1100}, {"Commodity": "bad", "State": "x", "Market": "y", "Arrival_Date": "03-01-2023", "Modal_Price": -5}]
    p = tmp_path / "d.csv"; pd.DataFrame(rows).to_csv(p, index=False)
    df = train_price.load_dataset(p)
    assert len(df) == 2 and set(df.commodity) == {"tomato"} and df.iloc[0].modal_price == 1100.0

def test_short_history_triggers_warning(price_csv, tmp_path):
    short = pd.read_csv(price_csv).head(400); p = tmp_path / "s.csv"; short.to_csv(p, index=False)
    assert any("spans only" in w for w in train_price.train(p, tmp_path / "m", min_rows=100)["warnings"])

def test_fetch_parser_skips_bad_rows():
    import fetch_price_data as fp
    rows = fp.parse_records({"records": [{"commodity": "Tomato", "state": "Karnataka", "market": "Mysuru", "arrival_date": "01/10/2026", "modal_price": "1500"},
                                         {"commodity": "Tomato", "arrival_date": "01/10/2026", "modal_price": "NA"}, {"commodity": "Onion", "arrival_date": "01/10/2026", "modal_price": "0"}]})
    assert len(rows) == 1 and rows[0]["Modal_Price"] == 1500.0

def test_merge_csv_dedupes(tmp_path):
    import fetch_price_data as fp
    r = {"Commodity": "Tomato", "State": "K", "Market": "M", "Arrival_Date": "01/10/2026", "Modal_Price": 10.0}
    assert fp.merge_csv(tmp_path / "a.csv", [r]) == 1 and fp.merge_csv(tmp_path / "a.csv", [r, {**r, "Arrival_Date": "02/10/2026"}]) == 2

def test_prepare_crop_data_validation():
    import prepare_crop_data as pc
    rng = np.random.default_rng(3)
    good = pd.DataFrame({"Nitrogen": rng.integers(0, 140, 200), "P": rng.integers(0, 140, 200), "K": rng.integers(0, 200, 200), "temperature": rng.uniform(10, 40, 200), "humidity": rng.uniform(20, 99, 200), "pH": rng.uniform(4, 9, 200), "rainfall": rng.uniform(20, 300, 200), "Crop": ["rice", "maize"] * 100})
    df, rep = pc.clean(good); assert rep["classes"] == 2 and list(df.columns)[:3] == ["N", "P", "K"]
    with pytest.raises(ValueError): pc.clean(good.drop(columns=["rainfall"]))
    bad = good.copy(); bad["pH"] = 99
    with pytest.raises(ValueError): pc.clean(bad)

def test_lifespan_startup_loads_models(client):
    assert client.get("/health").json()["models"]["price_model"]["loaded"] is True
