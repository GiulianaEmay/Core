"""Ingreso con usuario (o correo) y clave.

Valida la clave contra Clerk y devuelve un ticket de un solo uso con el que el
navegador abre la sesion. Asi el ingreso no depende de que el correo reciba
codigos (los accesos de clientes usan un correo interno que no existe).
"""

import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import clerk_admin
from app.database import get_db
from app.models import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FALLOS = 5
VENTANA_SEG = 15 * 60
_fallos: dict[str, deque[float]] = defaultdict(deque)


class LoginIn(BaseModel):
    usuario: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=200)


def _ip(request: Request) -> str:
    reenviada = request.headers.get("x-forwarded-for", "")
    return reenviada.split(",")[0].strip() or (request.client.host if request.client else "?")


def _bloqueado(clave: str) -> bool:
    q = _fallos[clave]
    limite = time.monotonic() - VENTANA_SEG
    while q and q[0] < limite:
        q.popleft()
    return len(q) >= MAX_FALLOS


def resolver_clerk_id(identificador: str, db: Session) -> str | None:
    u = (
        db.query(Usuario)
        .filter(or_(Usuario.username == identificador, func.lower(Usuario.email) == identificador))
        .first()
    )
    if u:
        return u.clerk_user_id
    # Aun no existe en esta base (ej. acceso creado desde otro entorno):
    # se busca en Clerk y se registra aqui en su primer ingreso.
    if "@" in identificador:
        return clerk_admin.buscar_por_email(identificador)
    return clerk_admin.buscar_por_username(identificador)


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    ident = body.usuario.strip().lower()
    clave = f"{_ip(request)}|{ident}"
    if _bloqueado(clave):
        raise HTTPException(429, "Demasiados intentos. Espere 15 minutos e intente de nuevo.")
    try:
        clerk_id = resolver_clerk_id(ident, db)
        if not clerk_id or not clerk_admin.verificar_password(clerk_id, body.password):
            _fallos[clave].append(time.monotonic())
            raise HTTPException(401, "Usuario o clave incorrectos")
        _fallos.pop(clave, None)
        return {"ticket": clerk_admin.crear_ticket(clerk_id)}
    except clerk_admin.ClerkError as e:
        raise HTTPException(502, f"No se pudo validar el ingreso: {e}")
