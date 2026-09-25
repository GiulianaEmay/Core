import pytest

from app import clerk_admin, crear_admin


def test_crea_el_usuario_con_clave_generada(monkeypatch):
    creado = []
    monkeypatch.setattr(clerk_admin, "crear_usuario_con_email", lambda e, p, n: creado.append((e, p, n)) or "user_1")
    uid, pw, existia = crear_admin.crear_o_restablecer("a@b.com", "Admin", None)
    assert (uid, existia) == ("user_1", False)
    assert len(pw) == 19 and creado == [("a@b.com", pw, "Admin")]


def test_si_el_correo_ya_existe_restablece_la_clave(monkeypatch):
    cambios = []

    def crear(e, p, n):
        raise clerk_admin.ClerkError("That email address is taken")

    monkeypatch.setattr(clerk_admin, "crear_usuario_con_email", crear)
    monkeypatch.setattr(clerk_admin, "buscar_por_email", lambda e: "user_9")
    monkeypatch.setattr(clerk_admin, "cambiar_password", lambda uid, pw: cambios.append((uid, pw)))
    uid, pw, existia = crear_admin.crear_o_restablecer("a@b.com", "Admin", "MiClaveLarga-2026")
    assert (uid, pw, existia) == ("user_9", "MiClaveLarga-2026", True)
    assert cambios == [("user_9", "MiClaveLarga-2026")]


def test_un_error_distinto_a_ya_existe_no_se_esconde(monkeypatch):
    def crear(e, p, n):
        raise clerk_admin.ClerkError("Password has been found in an online data breach")

    monkeypatch.setattr(clerk_admin, "crear_usuario_con_email", crear)
    monkeypatch.setattr(clerk_admin, "buscar_por_email", lambda e: None)
    with pytest.raises(clerk_admin.ClerkError, match="breach"):
        crear_admin.crear_o_restablecer("a@b.com", "Admin", "12345678")
