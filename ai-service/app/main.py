import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from app.schemas.models import PriceRequest, CropRequest
from app.services.registry import Registry, ModelUnavailable, BadInput

def create_app(model_dir=None) -> FastAPI:
    reg = Registry(model_dir)

    @asynccontextmanager
    async def lifespan(_app):
        st = reg.status()  # load models at startup so problems show in the console immediately
        for name, info in st.items():
            logging.getLogger("uvicorn.error").info("%s: %s", name, "loaded " + info["version"] if info["loaded"] else "NOT TRAINED (see README)")
        yield

    app = FastAPI(title="Agri AI Service", version="1.1.0", lifespan=lifespan)

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
