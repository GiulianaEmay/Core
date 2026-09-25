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


def crear_usuario(username: str, password: str, nombre: str) -> tuple[str, str]:
    """Crea el usuario en Clerk. Devuelve (clerk_user_id, email)."""
    email = email_de(username)
    resp = httpx.post(
        f"{_API}/users",
        headers=_headers(),
        json={"username": username, "email_address": [email], "password": password, "first_name": nombre},
        timeout=15,
    )
    if resp.status_code >= 400:
        raise ClerkError(_mensaje(resp))
    return resp.json()["id"], email


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
