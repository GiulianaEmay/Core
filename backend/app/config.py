from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./core.db"
    clerk_secret_key: str = ""
    clerk_issuer: str = ""
    allowed_origins: str = "http://localhost:3000"

    # Correos que siempre son admin (equipo CORE), separados por coma. Si esta
    # vacio, el primer usuario que inicia sesion en una base nueva es admin.
    admin_emails: str = ""
    # Dominio del correo interno de los accesos que crea CORE (usuario@dominio).
    # Nunca recibe correo; solo es el identificador que Clerk exige.
    access_email_domain: str = "clientes.example.com"

    @property
    def admin_emails_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
