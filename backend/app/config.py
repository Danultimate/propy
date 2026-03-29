from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://propy:changeme@db:5432/propy"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # LLM
    llm_provider: str = "claude"  # claude | openai
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Web Search
    tavily_api_key: str = ""
    serpapi_key: str = ""

    # App
    secret_key: str = "change-me"
    environment: str = "development"

    # Storage
    storage_path: str = "/storage"


settings = Settings()
