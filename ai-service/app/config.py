from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000
    max_file_size_mb: int = 10
    log_level: str = "info"
    upload_dir: str = "./uploads"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
