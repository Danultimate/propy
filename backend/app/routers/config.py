from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter()

SUPPORTED_PROVIDERS = ["claude", "openai", "gemini"]


class ProviderUpdate(BaseModel):
    provider: str


@router.get("/providers")
async def list_providers():
    return {
        "providers": SUPPORTED_PROVIDERS,
        "active": settings.llm_provider,
    }


@router.patch("/provider")
async def set_provider(payload: ProviderUpdate):
    if payload.provider not in SUPPORTED_PROVIDERS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unsupported provider. Choose from: {SUPPORTED_PROVIDERS}")
    settings.llm_provider = payload.provider
    return {"active": settings.llm_provider}
