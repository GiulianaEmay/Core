"""Gestion de accesos de clientes en Clerk (usuario + clave creados por CORE).

Los usuarios creados por la API de Clerk quedan con el correo ya verificado,
asi que el cliente entra sin codigos. Como Clerk exige un correo, se usa uno
interno `usuario@ACCESS_EMAIL_DOMAIN` que nunca recibe mensajes.
"""

import re
import secrets

import httpx

from app.config import settings

_API = "https://api.clerk.com/v1"
USERNAME_RE = re.compile(r"^[a-z0-9_-]{4,40}$")
# Sin 0/O/1/l/I para que se pueda dictar o leer sin errores.
_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"


class ClerkError(Exception):
    """Error devuelto por Clerk, con un mensaje apto para mostrar al admin."""


def generar_password() -> str:
    """16 caracteres en 4 grupos (ej. K7mQ-x3Rw-Tp9Z-hN4c): ~90 bits, no adivinable."""
    return "-".join("".join(secrets.choice(_ALFABETO) for _ in range(4)) for _ in range(4))


def email_de(username: str) -> str:
    return f"{username}@{settings.access_email_domain}"


def _headers() -> dict[str, str]:
    if not settings.clerk_secret_key:
        raise ClerkError("Falta CLERK_SECRET_KEY en el backend")
    return {"Authorization": f"Bearer {settings.clerk_secret_key}"}


def _mensaje(resp: httpx.Response) -> str:
    try:
        errores = resp.json().get("errors", [])
    except ValueError:
        errores = []
    if errores:
        e = errores[0]
        return e.get("long_message") or e.get("message") or f"Error {resp.status_code} de Clerk"
    return f"Error {resp.status_code} de Clerk"


def crear_usuario(username: str, password: str, nombre: str, cliente_id: str | None = None) -> tuple[str, str]:
    """Crea el usuario en Clerk. Devuelve (clerk_user_id, email).

    El cliente se guarda en public_metadata para que el acceso funcione en
    cualquier base (local o produccion) que use esta misma instancia de Clerk."""
    email = email_de(username)
    resp = httpx.post(
        f"{_API}/users",
        headers=_headers(),
        json={
            "username": username, "email_address": [email], "password": password, "first_name": nombre,
            "public_metadata": {"cliente_id": cliente_id} if cliente_id else {},
        },
        timeout=15,
    )
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))
    return resp.json()["id"], email


def crear_usuario_con_email(email: str, password: str, nombre: str) -> str:
    """Crea un usuario que entra con su correo y clave, con el correo ya
    verificado (no exige codigo). Devuelve el clerk_user_id."""
    resp = httpx.post(
        f"{_API}/users",
        headers=_headers(),
        json={"email_address": [email], "password": password, "first_name": nombre},
        timeout=15,
    )
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))
    return resp.json()["id"]


def _buscar(params: dict) -> str | None:
    resp = httpx.get(f"{_API}/users", headers=_headers(), params=params, timeout=15)
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))
    usuarios = resp.json()
    return usuarios[0]["id"] if usuarios else None


def buscar_por_email(email: str) -> str | None:
    return _buscar({"email_address": email})


def buscar_por_username(username: str) -> str | None:
    return _buscar({"username": username})


def verificar_password(clerk_user_id: str, password: str) -> bool:
    resp = httpx.post(
        f"{_API}/users/{clerk_user_id}/verify_password", headers=_headers(), json={"password": password}, timeout=15
    )
    if resp.status_code == 200:
        return bool(resp.json().get("verified"))
    if resp.status_code in (400, 404, 422):
        return False
    raise ClerkError(_mensaje(resp))


def crear_ticket(clerk_user_id: str) -> str:
    """Token de un solo uso para iniciar sesion con la estrategia `ticket`.
    No pasa por la verificacion de dispositivo nuevo (solo aplica a clave)."""
    resp = httpx.post(
        f"{_API}/sign_in_tokens",
        headers=_headers(),
        json={"user_id": clerk_user_id, "expires_in_seconds": 120},
        timeout=15,
    )
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))
    return resp.json()["token"]


def cambiar_password(clerk_user_id: str, password: str) -> None:
    resp = httpx.patch(
        f"{_API}/users/{clerk_user_id}", headers=_headers(), json={"password": password}, timeout=15
    )
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))


def borrar_usuario(clerk_user_id: str) -> None:
    resp = httpx.delete(f"{_API}/users/{clerk_user_id}", headers=_headers(), timeout=15)
    if resp.status_code >= 400 and resp.status_code != 404:
        raise ClerkError(_mensaje(resp))
