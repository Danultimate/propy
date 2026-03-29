# Propy — Client Intelligence Dashboard

An internal agency tool that scrapes client websites, detects their tech stack, researches competitors, and uses AI to generate personalized automation proposals — viewable in-dashboard and exportable as PDF.

---

## What it does

For each client, Propy runs a 7-step analysis pipeline:

1. **Scrape** — fetches the client's website and extracts content
2. **Surface tech detection** — identifies CMS, analytics, ad pixels, SaaS tools
3. **Deep tech detection** *(on demand)* — fingerprints frameworks, CRM, payments, live chat
4. **Company research** — web search summary of the company and industry
5. **Competitor discovery** — auto-discovers competitors + merges manual overrides
6. **AI proposal** — generates a structured proposal with pain points, tool recommendations, and ROI estimates
7. **PDF export** — renders the proposal as a styled, downloadable PDF

The AI layer is model-agnostic — switch between Claude and OpenAI via a single environment variable.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Task Queue | Celery 5 + Redis 7 |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2 (async) + Alembic |
| PDF Export | Playwright (Chromium) |
| Web Search | Tavily |
| LLM | Claude (default) or OpenAI GPT-4o |
| Containers | Docker + Docker Compose |
| Reverse Proxy | Nginx (production) |

---

## Project Structure

```
propy/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + routers
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # Async SQLAlchemy setup
│   │   ├── llm/
│   │   │   └── adapter.py       # Model-agnostic LLM adapter
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   └── workers/
│   │       ├── celery_app.py    # Celery configuration
│   │       ├── tasks.py         # Async task definitions
│   │       └── pipeline.py      # 7-step pipeline logic
│   ├── alembic/                 # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/               # ClientsPage, ClientDetailPage, RunDetailPage
│   │   ├── components/          # Layout, StatusBadge
│   │   └── lib/                 # API client + types, utilities
│   └── nginx.conf               # Nginx config for SPA
├── nginx/
│   └── nginx.conf               # Reverse proxy + SSL (production)
├── scripts/
│   ├── deploy.sh                # One-command VPS deploy
│   └── backup.sh                # Daily pg_dump cron script
├── storage/reports/             # Generated PDFs
├── docker-compose.yml           # Development stack
├── docker-compose.prod.yml      # Production stack
└── .env.example                 # Environment variable template
```

---

## Getting Started (Local)

### Prerequisites

- Docker + Docker Compose
- API keys: Anthropic or OpenAI, and Tavily (for web search)

### Setup

```bash
git clone git@github.com:Danultimate/propy.git
cd propy

cp .env.example .env
# Edit .env with your API keys
```

### Start

```bash
docker compose up -d
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### Logs

```bash
docker compose logs -f backend   # FastAPI
docker compose logs -f worker    # Celery pipeline
```

### Stop

```bash
docker compose down
# Add -v to also remove volumes (full reset)
```

---

## Environment Variables

```bash
# Database
POSTGRES_USER=propy
POSTGRES_PASSWORD=changeme
POSTGRES_DB=propy
DATABASE_URL=postgresql+asyncpg://propy:changeme@db:5432/propy

# Redis
REDIS_URL=redis://redis:6379/0

# LLM — choose one
LLM_PROVIDER=claude        # claude | openai
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Web Search
TAVILY_API_KEY=

# App
SECRET_KEY=change-this-in-production
ENVIRONMENT=development    # development | production
```

---

## API Reference

### Clients
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients` | List all clients |
| `POST` | `/api/clients` | Create client |
| `GET` | `/api/clients/:id` | Get client |
| `PATCH` | `/api/clients/:id` | Update client |
| `DELETE` | `/api/clients/:id` | Delete client |

### Analysis Runs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/clients/:id/runs` | Trigger analysis |
| `GET` | `/api/clients/:id/runs` | List runs |
| `GET` | `/api/clients/:id/runs/:runId` | Get run + result |
| `POST` | `/api/clients/:id/runs/:runId/regenerate` | Regenerate proposal only |
| `GET` | `/api/clients/:id/runs/:runId/pdf` | Download PDF |

### Competitors (manual overrides)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients/:id/competitors` | List manual competitors |
| `POST` | `/api/clients/:id/competitors` | Add competitor |
| `DELETE` | `/api/clients/:id/competitors/:cId` | Remove competitor |

### Config
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config/providers` | List LLM providers |
| `PATCH` | `/api/config/provider` | Switch active provider |

---

## Proposal Structure

Every AI-generated proposal follows this structure:

1. **Executive Summary** — estimated hours/month saved and annual cost reduction
2. **Company & Tech Snapshot** — what they do, tech stack mapped as gaps
3. **Pain Points** — 3–5 evidence-backed, competitor-informed findings
4. **Recommended Tools** — tool name, what it solves, effort, estimated cost
5. **ROI Estimates** — hours saved + industry benchmarks per recommendation, summary table
6. **Next Steps** — 3 clear call-to-action bullets

---

## Deploying to a VPS

### 1. Prepare the server

```bash
# On your VPS
mkdir -p /opt/propy && cd /opt/propy
git clone git@github.com:Danultimate/propy.git .
cp .env.example .env
# Fill in production values — strong passwords, real API keys
```

### 2. SSL certificates

Place Let's Encrypt certificates at:
```
nginx/certs/live/your-domain.com/fullchain.pem
nginx/certs/live/your-domain.com/privkey.pem
```

Update `nginx/nginx.conf` — replace `your-domain.com` with your actual domain.

### 3. Deploy

```bash
bash scripts/deploy.sh
```

This pulls the latest code, builds images, runs migrations, and starts all services.

### 4. Set up daily backups

```bash
# Add to crontab (crontab -e)
0 2 * * * /opt/propy/scripts/backup.sh
```

Backups are stored at `/opt/propy/backups/` and kept for 14 days.

### Update

```bash
bash scripts/deploy.sh
```

---

## Database Schema

```
clients              — client records
analysis_runs        — pipeline execution history (status, timestamps)
analysis_results     — pipeline output (tech_stack JSON, proposal, pdf_path)
competitors_override — manually added competitors per client
```

Run statuses: `pending → running → completed | failed`

---

## Switching LLM Provider

Via the dashboard config panel, or directly:

```bash
# Switch to OpenAI
curl -X PATCH http://localhost:8000/api/config/provider \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

Make sure the corresponding API key is set in `.env`.
