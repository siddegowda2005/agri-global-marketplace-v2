from typing import Optional
from pydantic import BaseModel, Field

class PriceRequest(BaseModel):
    crop: str = Field(min_length=2, max_length=60)
    market: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=60)
    date: Optional[str] = None

class CropRequest(BaseModel):
    N: float = Field(ge=0, le=300); P: float = Field(ge=0, le=300); K: float = Field(ge=0, le=300)
    temperature: float = Field(ge=-10, le=60); humidity: float = Field(ge=0, le=100)
    ph: float = Field(ge=0, le=14); rainfall: float = Field(ge=0, le=5000)
