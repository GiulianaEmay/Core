import pytest
from fastapi.testclient import TestClient

from app import clerk_admin
from app import models as m
from app.database import get_db
from app.main import app
from app.routers import login as login_mod


@pytest.fixture()
def cli(seeded, monkeypatch):
    """Cliente HTTP sin sesion + Clerk simulado. Claves validas: 'buena'."""
    seeded.add(m.Usuario(clerk_user_id="user_rap", email="rap_portal@clientes.example.com", username="rap_portal", rol=m.Rol.cliente, cliente_id="RAP"))
    seeded.commit()
    tickets = []
    monkeypatch.setattr(clerk_admin, "buscar_por_email", lambda e: "user_admin_nuevo" if e == "ceo@core.com" else None)
    monkeypatch.setattr(clerk_admin, "buscar_por_username", lambda u: "user_otro_entorno" if u == "pollitos" else None)
    monkeypatch.setattr(clerk_admin, "verificar_password", lambda uid, pw: pw == "buena")
    monkeypatch.setattr(clerk_admin, "crear_ticket", lambda uid: tickets.append(uid) or f"tk_{uid}")
    login_mod._fallos.clear()

    def override_db():
        yield seeded

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app), tickets
    app.dependency_overrides.clear()


def test_cliente_entra_con_su_usuario(cli):
    c, tickets = cli
    r = c.post("/auth/login", json={"usuario": " RAP_Portal ", "password": "buena"})
    assert r.status_code == 200 and r.json() == {"ticket": "tk_user_rap"}


def test_cliente_tambien_puede_usar_su_correo(cli):
    c, _ = cli
    assert c.post("/auth/login", json={"usuario": "rap_portal@clientes.example.com", "password": "buena"}).status_code == 200


def test_admin_que_aun_no_inicio_sesion_entra_con_su_correo(cli):
    c, tickets = cli
    assert c.post("/auth/login", json={"usuario": "CEO@core.com", "password": "buena"}).json() == {"ticket": "tk_user_admin_nuevo"}


def test_acceso_creado_en_otro_entorno_se_encuentra_en_clerk(cli):
    c, _ = cli
    assert c.post("/auth/login", json={"usuario": "pollitos", "password": "buena"}).json() == {"ticket": "tk_user_otro_entorno"}


def test_primer_ingreso_de_un_acceso_de_cliente_lo_vincula_y_no_lo_hace_admin(seeded, monkeypatch):
    from app import auth

    class Resp:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "email_addresses": [{"id": "e1", "email_address": "pollitos@clientes.example.com", "verification": {"status": "verified"}}],
                "primary_email_address_id": "e1", "first_name": "Pollitos", "username": "pollitos",
                "public_metadata": {"cliente_id": "POL"},
            }

    monkeypatch.setattr(auth.httpx, "get", lambda *a, **k: Resp())
    seeded.query(m.Usuario).delete()  # base "nueva": sin la regla, el primero seria admin
    seeded.commit()
    u = auth._obtener_o_crear_usuario("user_pollitos", seeded)
    assert (u.rol, u.cliente_id, u.username) == (m.Rol.cliente, "POL", "pollitos")


def test_clave_o_usuario_incorrectos_no_dan_ticket_ni_pistas(cli):
    c, tickets = cli
    a = c.post("/auth/login", json={"usuario": "rap_portal", "password": "mala"})
    b = c.post("/auth/login", json={"usuario": "no_existe", "password": "buena"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json() == {"detail": "Usuario o clave incorrectos"}
    assert tickets == []


def test_bloquea_tras_varios_intentos_fallidos(cli):
    c, tickets = cli
    for _ in range(login_mod.MAX_FALLOS):
        assert c.post("/auth/login", json={"usuario": "rap_portal", "password": "mala"}).status_code == 401
    r = c.post("/auth/login", json={"usuario": "rap_portal", "password": "buena"})
    assert r.status_code == 429 and tickets == []
