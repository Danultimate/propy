"""
Celery tasks — analysis pipeline.
Each step persists partial results before the next begins.
"""
import uuid
from datetime import datetime

from celery import shared_task

from app.workers.celery_app import celery_app
from app.workers.pipeline import (
    scrape_website,
    detect_tech_surface,
    detect_tech_deep,
    research_company,
    discover_competitors,
    generate_proposal,
    export_pdf,
)


def _get_sync_db():
    """Synchronous DB session for use inside Celery tasks."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.config import settings

    # Convert asyncpg URL to sync psycopg2 URL
    sync_url = settings.database_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    engine = create_engine(sync_url)
    Session = sessionmaker(bind=engine)
    return Session()


@celery_app.task(bind=True, name="run_analysis_pipeline")
def run_analysis_pipeline(self, run_id: str, client_id: str, deep_scan: bool = False):
    from app.models.analysis import AnalysisRun, AnalysisResult, RunStatus, CompetitorOverride
    from app.models.client import Client

    db = _get_sync_db()
    try:
        run = db.get(AnalysisRun, uuid.UUID(run_id))
        client = db.get(Client, uuid.UUID(client_id))

        run.status = RunStatus.running
        run.started_at = datetime.utcnow()
        db.commit()

        # Create result row early to accumulate partial data
        result = AnalysisResult(run_id=run.id)
        db.add(result)
        db.commit()

        # Step 1 — Scrape
        scraped = scrape_website(client.website_url)

        # Step 2 — Surface tech detection
        surface_tech = detect_tech_surface(client.website_url)
        result.tech_stack = {"surface": surface_tech, "deep": []}
        db.commit()

        # Step 3 — Deep tech detection (on demand)
        if deep_scan:
            deep_tech = detect_tech_deep(client.website_url, scraped)
            result.tech_stack = {"surface": surface_tech, "deep": deep_tech}
            db.commit()

        # Step 4 — Company research
        company_summary = research_company(client.name, client.website_url, client.industry)
        result.company_summary = company_summary
        db.commit()

        # Step 5 — Competitor discovery
        overrides = db.query(CompetitorOverride).filter(
            CompetitorOverride.client_id == client.id
        ).all()
        manual = [{"name": c.name, "url": c.url, "source": "manual"} for c in overrides]
        auto = discover_competitors(client.name, client.industry)
        competitors = manual + [c for c in auto if c["name"] not in [m["name"] for m in manual]]
        result.competitors = competitors
        db.commit()

        # Step 6 — AI Proposal
        proposal = generate_proposal(
            client={"name": client.name, "industry": client.industry, "notes": client.notes, "website_url": client.website_url},
            tech_stack=result.tech_stack,
            company_summary=company_summary,
            competitors=competitors,
        )
        result.ai_proposal = proposal
        db.commit()

        # Step 7 — PDF Export
        pdf_path = export_pdf(proposal, run_id, client.name)
        result.pdf_path = pdf_path
        db.commit()

        run.status = RunStatus.completed
        run.completed_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        run = db.get(AnalysisRun, uuid.UUID(run_id))
        run.status = RunStatus.failed
        run.error_message = str(exc)
        run.completed_at = datetime.utcnow()
        db.commit()
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="regenerate_proposal_task")
def regenerate_proposal_task(self, new_run_id: str, source_result_id: str):
    from app.models.analysis import AnalysisRun, AnalysisResult, RunStatus
    from app.models.client import Client

    db = _get_sync_db()
    try:
        new_run = db.get(AnalysisRun, uuid.UUID(new_run_id))
        source_result = db.get(AnalysisResult, uuid.UUID(source_result_id))
        client = db.get(Client, new_run.client_id)

        new_run.status = RunStatus.running
        new_run.started_at = datetime.utcnow()
        db.commit()

        result = AnalysisResult(
            run_id=new_run.id,
            tech_stack=source_result.tech_stack,
            company_summary=source_result.company_summary,
            competitors=source_result.competitors,
        )
        db.add(result)
        db.commit()

        proposal = generate_proposal(
            client={"name": client.name, "industry": client.industry, "notes": client.notes, "website_url": client.website_url},
            tech_stack=source_result.tech_stack,
            company_summary=source_result.company_summary,
            competitors=source_result.competitors,
        )
        result.ai_proposal = proposal
        db.commit()

        pdf_path = export_pdf(proposal, new_run_id, client.name)
        result.pdf_path = pdf_path
        db.commit()

        new_run.status = RunStatus.completed
        new_run.completed_at = datetime.utcnow()
        db.commit()

    except Exception as exc:
        new_run = db.get(AnalysisRun, uuid.UUID(new_run_id))
        new_run.status = RunStatus.failed
        new_run.error_message = str(exc)
        new_run.completed_at = datetime.utcnow()
        db.commit()
        raise
    finally:
        db.close()
