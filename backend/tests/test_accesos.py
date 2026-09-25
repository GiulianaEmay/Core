import pytest

from app import clerk_admin
from app import models as m


@pytest.fixture()
def clerk(monkeypatch):
    """Clerk simulado: registra lo que se le pide, no toca la red."""
    llamadas = {"crear": [], "password": [], "borrar": []}

    def crear(username, password, nombre, cliente_id=None):
        llamadas["crear"].append((username, password, nombre))
        if username == "ocupado":
            raise clerk_admin.ClerkError("That username is taken. Please try another one.")
        return f"user_{username}", clerk_admin.email_de(username)

    monkeypatch.setattr(clerk_admin, "crear_usuario", crear)
    monkeypatch.setattr(clerk_admin, "cambiar_password", lambda uid, pw: llamadas["password"].append((uid, pw)))
    monkeypatch.setattr(clerk_admin, "borrar_usuario", lambda uid: llamadas["borrar"].append(uid))
    return llamadas


def test_generar_password_es_fuerte_y_distinta():
    pws = {clerk_admin.generar_password() for _ in range(50)}
    assert len(pws) == 50
    for pw in pws:
        assert len(pw) == 19 and pw.count("-") == 3
        assert not set(pw) & set("0O1lI")  # sin caracteres ambiguos


def test_cliente_en_modo_solo_lectura_no_puede_actuar(api, seeded):
    seeded.query(m.Cliente).filter_by(id="POL").update({"permite_acciones": False})
    seeded.commit()
    c = api("u_pol")
    assert c.get("/portal/clientes/POL").json()["permiteAcciones"] is False  # puede ver todo
    assert c.post("/portal/clientes/POL/decisiones", json={"clave": "A:A001", "decision": "Aprobado"}).status_code == 403
    assert c.post("/portal/clientes/POL/solicitudes", json={"empresa": "POL1", "area": "Legal", "tipo": "Otro", "sol": "hola mundo"}).status_code == 403
    assert c.put("/portal/clientes/POL/checklist/POL1/E1-POL-01/envio", json={"nombre": "x.pdf"}).status_code == 403
    assert c.put("/portal/clientes/POL/intereses/srv-recupera").status_code == 403
    assert c.delete("/portal/clientes/POL/intereses/srv-recupera").status_code == 403
    assert seeded.query(m.Decision).count() == 0


def test_admin_habilita_las_acciones_de_un_cliente(api):
    a = api("u_admin")
    a.patch("/admin/clientes/RAP", json={"permite_acciones": False})
    assert api("u_rap").put("/portal/clientes/RAP/intereses/analytics").status_code == 403
    a.patch("/admin/clientes/RAP", json={"permite_acciones": True})
    assert api("u_rap").put("/portal/clientes/RAP/intereses/analytics").status_code == 200


def test_crear_acceso_de_cliente(api, seeded, clerk):
    a = api("u_admin")
    r = a.post("/admin/clientes/POL/accesos", json={"username": "pollitos01"})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["username"] == "pollitos01" and cuerpo["email"].startswith("pollitos01@")
    assert len(cuerpo["password"]) == 19  # generada, se muestra una sola vez
    assert clerk["crear"][0][:2] == ("pollitos01", cuerpo["password"])

    u = seeded.query(m.Usuario).filter_by(username="pollitos01").one()
    assert u.cliente_id == "POL" and u.rol == m.Rol.cliente and u.clerk_user_id == "user_pollitos01"
    # la clave no se guarda en ningun lado
    assert cuerpo["password"] not in str([getattr(u, c.name) for c in u.__table__.columns])
    assert "pollitos01" in [x["username"] for x in a.get("/admin/clientes/POL/accesos").json()]


def test_crear_acceso_valida_y_rechaza_duplicados(api, clerk):
    a = api("u_admin")
    assert a.post("/admin/clientes/NOPE/accesos", json={"username": "abcdef"}).status_code == 404
    assert a.post("/admin/clientes/POL/accesos", json={"username": "MAYUS"}).status_code == 422  # solo minusculas
    assert a.post("/admin/clientes/POL/accesos", json={"username": "abc"}).status_code == 422  # muy corto
    assert a.post("/admin/clientes/POL/accesos", json={"username": "unico1", "password": "corta"}).status_code == 422
    assert a.post("/admin/clientes/POL/accesos", json={"username": "unico1"}).status_code == 200
    assert a.post("/admin/clientes/RAP/accesos", json={"username": "unico1"}).status_code == 409
    r = a.post("/admin/clientes/POL/accesos", json={"username": "ocupado"})
    assert r.status_code == 422 and "taken" in r.json()["detail"]


def test_solo_admin_gestiona_accesos(api, clerk):
    assert api("u_pol").post("/admin/clientes/POL/accesos", json={"username": "intruso1"}).status_code == 403
    assert api("u_pol").get("/admin/resumen-clientes").status_code == 403
    assert clerk["crear"] == []


def test_restablecer_password_y_borrar_acceso(api, seeded, clerk):
    a = api("u_admin")
    uid = a.post("/admin/clientes/POL/accesos", json={"username": "reset01"}).json()["id"]
    r = a.post(f"/admin/usuarios/{uid}/password", json={})
    assert r.status_code == 200 and len(r.json()["password"]) == 19
    assert clerk["password"][-1] == ("user_reset01", r.json()["password"])
    assert a.post(f"/admin/usuarios/{uid}/password", json={"password": "MiClaveLarga-2026"}).json()["password"] == "MiClaveLarga-2026"

    assert a.delete(f"/admin/usuarios/{uid}").status_code == 200
    assert clerk["borrar"] == ["user_reset01"]
    assert seeded.get(m.Usuario, uid) is None
    yo = seeded.query(m.Usuario).filter_by(clerk_user_id="u_admin").one()
    assert a.delete(f"/admin/usuarios/{yo.id}").status_code == 409  # no puede borrarse a si mismo


def test_resumen_de_clientes(api):
    filas = {f["id"]: f for f in api("u_admin").get("/admin/resumen-clientes").json()}
    assert set(filas) == {"POL", "RAP"}
    pol = filas["POL"]
    assert [e["codigo"] for e in pol["empresas"]] == ["POL1", "POL2"]
    assert pol["kpis"] == 48 and pol["fugas_abiertas"] > 0 and pol["docs_por_enviar"] > 0
    assert filas["RAP"]["kpis"] == 14
