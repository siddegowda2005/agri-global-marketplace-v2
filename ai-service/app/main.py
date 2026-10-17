from fastapi import FastAPI, HTTPException
from app.schemas.models import PriceRequest, CropRequest
from app.services.registry import Registry, ModelUnavailable, BadInput

def create_app(model_dir=None) -> FastAPI:
    app = FastAPI(title="Agri AI Service", version="1.0.0")
    reg = Registry(model_dir)

    @app.get("/health")
    def health(): return {"status": "ok", "models": reg.status()}

    @app.post("/predict/price")
    def price(req: PriceRequest):
        try: return reg.predict_price(req.crop, req.market, req.state, req.date)
        except ModelUnavailable as e: raise HTTPException(503, str(e))
        except BadInput as e: raise HTTPException(422, str(e))

    @app.post("/recommend/crop")
    def crop(req: CropRequest):
        try: return reg.recommend_crop(req.model_dump())
        except ModelUnavailable as e: raise HTTPException(503, str(e))
    return app

app = create_app()
