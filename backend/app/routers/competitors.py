import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.analysis import CompetitorOverride
from app.schemas.analysis import CompetitorOverrideCreate, CompetitorOverrideOut

router = APIRouter()


@router.get("/{client_id}/competitors", response_model=list[CompetitorOverrideOut])
async def list_competitors(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CompetitorOverride)
        .where(CompetitorOverride.client_id == client_id)
        .order_by(CompetitorOverride.created_at)
    )
    return result.scalars().all()


@router.post("/{client_id}/competitors", response_model=CompetitorOverrideOut, status_code=201)
async def add_competitor(client_id: uuid.UUID, payload: CompetitorOverrideCreate, db: AsyncSession = Depends(get_db)):
    competitor = CompetitorOverride(client_id=client_id, **payload.model_dump())
    db.add(competitor)
    await db.commit()
    await db.refresh(competitor)
    return competitor


@router.delete("/{client_id}/competitors/{competitor_id}", status_code=204)
async def remove_competitor(client_id: uuid.UUID, competitor_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CompetitorOverride).where(
            CompetitorOverride.id == competitor_id,
            CompetitorOverride.client_id == client_id,
        )
    )
    competitor = result.scalar_one_or_none()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    await db.delete(competitor)
    await db.commit()
