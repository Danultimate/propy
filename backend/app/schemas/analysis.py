import uuid
from datetime import datetime
from pydantic import BaseModel

from app.models.analysis import RunStatus


class RunCreate(BaseModel):
    triggered_by: str | None = None
    deep_scan: bool = False


class CompetitorOverrideCreate(BaseModel):
    name: str
    url: str | None = None
    added_by: str | None = None


class CompetitorOverrideOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    url: str | None
    added_by: str | None
    created_at: datetime


class AnalysisResultOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    run_id: uuid.UUID
    tech_stack: dict | None
    company_summary: str | None
    competitors: list | None
    ai_proposal: str | None
    pdf_path: str | None
    created_at: datetime


class AnalysisRunOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: uuid.UUID
    triggered_by: str | None
    status: RunStatus
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    created_at: datetime
    result: AnalysisResultOut | None = None
