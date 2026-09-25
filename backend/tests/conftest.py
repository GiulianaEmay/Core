import json
from pathlib import Path

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models as m
from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.portal_data import importar

DATA_PATH = Path(__file__).resolve().parents[1] / "app" / "seed" / "portal_data.json"


@pytest.fixture(scope="session")
def data():
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()


@pytest.fixture()
def seeded(db, data):
    importar(db, data)
    db.query(m.Cliente).update({"permite_acciones": True})  # las pruebas de acciones necesitan el modo interactivo
    for clerk_id, email, rol, cliente in [
        ("u_admin", "admin@core.pe", m.Rol.admin, None),
        ("u_pol", "pol@cliente.pe", m.Rol.cliente, "POL"),
        ("u_rap", "rap@cliente.pe", m.Rol.cliente, "RAP"),
        ("u_nada", "sin@cliente.pe", m.Rol.cliente, None),
    ]:
        db.add(m.Usuario(clerk_user_id=clerk_id, email=email, nombre=email.split("@")[0], rol=rol, cliente_id=cliente))
    db.commit()
    return db


@pytest.fixture()
def api(seeded):
    """Devuelve una funcion api(usuario) -> TestClient autenticado como ese usuario."""

    def override_db():
        yield seeded

    def override_user(request: Request):
        return seeded.query(m.Usuario).filter_by(clerk_user_id=request.headers["X-Test-User"]).one()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user

    def como(clerk_id: str) -> TestClient:
        return TestClient(app, headers={"X-Test-User": clerk_id})

    yield como
    app.dependency_overrides.clear()
