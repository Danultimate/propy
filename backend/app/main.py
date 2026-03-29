from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import clients, runs, competitors, config

app = FastAPI(title="Propy API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else ["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(runs.router, prefix="/api/clients", tags=["runs"])
app.include_router(competitors.router, prefix="/api/clients", tags=["competitors"])
app.include_router(config.router, prefix="/api/config", tags=["config"])


@app.get("/health")
async def health():
    return {"status": "ok"}
