import uuid
from datetime import datetime
from pydantic import BaseModel, HttpUrl


class ClientCreate(BaseModel):
    name: str
    website_url: str
    industry: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    website_url: str | None = None
    industry: str | None = None
    notes: str | None = None


class ClientOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    website_url: str
    industry: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
