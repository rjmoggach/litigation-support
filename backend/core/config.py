from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "robertmoggach-www"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    RESET_TOKEN_EXPIRE_MINUTES: int = 60
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # Refresh Token Configuration
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_ALGORITHM: str = "HS256"
    REFRESH_RATE_LIMIT_PER_MINUTE: int = 10

    DATABASE_URL: str = ""  # Will be set from .env
    POSTGRES_PASSWORD: str = ""
    POSTGRES_USER: str = "postgres"
    POSTGRES_DB: str = "scaffold_app"

    # SMTP Configuration
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@example.com"
    SMTP_FROM_NAME: str = "Litigation Support"

    # Legacy Mailjet support (optional)
    MAILJET_API_KEY: str = ""
    MAILJET_SECRET_KEY: str = ""
    EMAIL_FROM: str = "litigation-support@robertmoggach.com"
    EMAIL_FROM_NAME: str = "Litigation Support"
    FRONTEND_URL: str = "http://localhost:3000"

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Storage Settings
    # Dropbox
    DROPBOX_ACCESS_TOKEN: str = ""
    DROPBOX_APP_KEY: str = ""
    DROPBOX_APP_SECRET: str = ""
    DROPBOX_REFRESH_TOKEN: str = ""
    DROPBOX_OAUTH2_REFRESH_TOKEN: str = ""  # Alternative name

    # AWS S3 (for future use)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str = ""
    AWS_S3_REGION: str = "us-east-1"

    # OAuth Configuration (matching frontend)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    NEXTAUTH_SECRET: str = ""

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
