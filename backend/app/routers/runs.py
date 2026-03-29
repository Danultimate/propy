import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.analysis import AnalysisRun, AnalysisResult, RunStatus
from app.schemas.analysis import RunCreate, AnalysisRunOut
from app.workers.tasks import run_analysis_pipeline

router = APIRouter()


@router.post("/{client_id}/runs", response_model=AnalysisRunOut, status_code=201)
async def trigger_run(client_id: uuid.UUID, payload: RunCreate, db: AsyncSession = Depends(get_db)):
    run = AnalysisRun(
        client_id=client_id,
        triggered_by=payload.triggered_by,
        status=RunStatus.pending,
    )
    db.add(run)
    await db.commit()

    # Reload with relationship eagerly to avoid lazy-load error during serialization
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.id == run.id)
        .options(selectinload(AnalysisRun.result))
    )
    run = result.scalar_one()

    # Dispatch to Celery
    run_analysis_pipeline.delay(str(run.id), str(client_id), payload.deep_scan)

    return run


@router.get("/{client_id}/runs", response_model=list[AnalysisRunOut])
async def list_runs(client_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.client_id == client_id)
        .options(selectinload(AnalysisRun.result))
        .order_by(AnalysisRun.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{client_id}/runs/{run_id}", response_model=AnalysisRunOut)
async def get_run(client_id: uuid.UUID, run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.id == run_id, AnalysisRun.client_id == client_id)
        .options(selectinload(AnalysisRun.result))
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("/{client_id}/runs/{run_id}/regenerate", response_model=AnalysisRunOut, status_code=201)
async def regenerate_proposal(client_id: uuid.UUID, run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.id == run_id, AnalysisRun.client_id == client_id)
        .options(selectinload(AnalysisRun.result))
    )
    existing_run = result.scalar_one_or_none()
    if not existing_run or not existing_run.result:
        raise HTTPException(status_code=404, detail="Run or result not found")

    # Create a new run seeded with existing research data
    new_run = AnalysisRun(
        client_id=client_id,
        triggered_by=existing_run.triggered_by,
        status=RunStatus.pending,
    )
    db.add(new_run)
    await db.commit()
    await db.refresh(new_run)

    from app.workers.tasks import regenerate_proposal_task
    regenerate_proposal_task.delay(str(new_run.id), str(existing_run.result.id))

    return new_run


@router.get("/{client_id}/runs/{run_id}/pdf")
async def download_pdf(client_id: uuid.UUID, run_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.id == run_id, AnalysisRun.client_id == client_id)
        .options(selectinload(AnalysisRun.result))
    )
    run = result.scalar_one_or_none()
    if not run or not run.result or not run.result.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(run.result.pdf_path, media_type="application/pdf", filename="proposal.pdf")
