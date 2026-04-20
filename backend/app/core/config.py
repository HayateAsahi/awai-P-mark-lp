from functools import lru_cache

from pydantic import Field
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "awai-lp-contact-api"
    contact_from_email: str = Field(..., alias="CONTACT_FROM_EMAIL")
    contact_to_email: str = Field(..., alias="CONTACT_TO_EMAIL")
    contact_auto_reply_subject: str = Field(
        "【株式会社あわいコンサルティング】お問い合わせありがとうございます",
        alias="CONTACT_AUTO_REPLY_SUBJECT",
    )
    contact_smtp_host: str = Field(..., alias="CONTACT_SMTP_HOST")
    contact_smtp_port: int = Field(465, alias="CONTACT_SMTP_PORT")
    contact_smtp_username: str = Field("", alias="CONTACT_SMTP_USERNAME")
    contact_smtp_password: str = Field(..., alias="CONTACT_SMTP_PASSWORD")
    contact_smtp_use_ssl: bool = Field(True, alias="CONTACT_SMTP_USE_SSL")
    contact_smtp_use_starttls: bool = Field(False, alias="CONTACT_SMTP_USE_STARTTLS")
    contact_allowed_origins: str = Field(
        "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080",
        alias="CONTACT_ALLOWED_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator(
        "contact_smtp_use_ssl",
        "contact_smtp_use_starttls",
        mode="before",
    )
    @classmethod
    def parse_bool(cls, value: object) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
        raise ValueError("Expected a boolean value")

    @field_validator("contact_smtp_port", mode="before")
    @classmethod
    def parse_int(cls, value: object) -> int:
        if isinstance(value, int):
            port = value
        elif isinstance(value, str) and value.strip():
            try:
                port = int(value.strip())
            except ValueError as exc:
                raise ValueError("Expected an integer value") from exc
        else:
            raise ValueError("Expected an integer value")

        if port <= 0:
            raise ValueError("Port must be greater than 0")
        return port

    @model_validator(mode="after")
    def validate_smtp_settings(self) -> "Settings":
        if self.contact_smtp_use_ssl and self.contact_smtp_use_starttls:
            raise ValueError(
                "CONTACT_SMTP_USE_SSL and CONTACT_SMTP_USE_STARTTLS cannot both be true"
            )
        if not self.contact_smtp_username:
            self.contact_smtp_username = self.contact_from_email
        return self

    @property
    def allowed_origins(self) -> list[str]:
        raw_value = self.contact_allowed_origins.strip()
        if raw_value == "*":
            return ["*"]

        return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
