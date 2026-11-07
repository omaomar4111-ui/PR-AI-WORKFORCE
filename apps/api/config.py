from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_SECRET: str = "pr_ai_workforce_local_dev_secret_key_2026_super_secure"
    DEBUG: bool = True
    
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/pr_ai_workforce"
    SUPABASE_URL: str = "https://mock-pr-workforce.supabase.co"
    SUPABASE_ANON_KEY: str = "mock_anon_key_for_dev_mode"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock_service_role_key_for_dev_mode"
    SUPABASE_JWT_SECRET: str = "mock_jwt_secret_32_chars_minimum_dev_2026"
    
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenTelemetry Observability Configuration
    OTEL_EXPORTER: str = "console"
    OTEL_SAMPLING_RATE: float = 1.0
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"

settings = Settings()
