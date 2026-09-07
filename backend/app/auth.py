"""Verificacion de sesion. La identidad (password, Google, verificacion de
email) la maneja Clerk; aqui solo verificamos su JWT y mantenemos nuestra
propia tabla de Usuario (rol + empresa_id son conceptos de negocio que
Clerk no conoce)."""

import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db
from app.models import Usuario

bearer_scheme = HTTPBearer(auto_error=False)

_jwks_cache: dict = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


def _get_jwks() -> list[dict]:
    now = time.time()
    if not _jwks_cache["keys"] or now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS:
        resp = httpx.get(f"{settings.clerk_issuer}/.well-known/jwks.json", timeout=10)
        resp.raise_for_status()
        _jwks_cache["keys"] = resp.json()["keys"]
        _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


def _verify_session_token(token: str) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesion invalida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        header = jwt.get_unverified_header(token)
        jwks = _get_jwks()
        key = next((k for k in jwks if k["kid"] == header.get("kid")), None)
        if key is None:
            # las llaves pudieron rotar; refresca una vez y reintenta
            _jwks_cache["fetched_at"] = 0.0
            jwks = _get_jwks()
            key = next((k for k in jwks if k["kid"] == header.get("kid")), None)
        if key is None:
            raise credentials_error

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise credentials_error


def _obtener_o_crear_usuario(clerk_user_id: str, db: Session) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.clerk_user_id == clerk_user_id).first()
    if usuario:
        return usuario

    resp = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    email = next(
        (
            e["email_address"]
            for e in data.get("email_addresses", [])
            if e["id"] == data.get("primary_email_address_id")
        ),
        None,
    ) or (data["email_addresses"][0]["email_address"] if data.get("email_addresses") else None)
    if not email:
        raise HTTPException(status_code=400, detail="El usuario de Clerk no tiene email")

    nombre = " ".join(filter(None, [data.get("first_name"), data.get("last_name")])).strip()

    # El primer usuario que inicia sesion en una base nueva se vuelve admin;
    # de lo contrario nadie podria crear empresas ni asignar al resto.
    es_el_primero = db.query(Usuario).count() == 0
    rol = models.Rol.admin if es_el_primero else models.Rol.cliente

    usuario = Usuario(clerk_user_id=clerk_user_id, email=email, nombre=nombre, rol=rol)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de sesion",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _verify_session_token(credentials.credentials)
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sin sub")
    return _obtener_o_crear_usuario(clerk_user_id, db)
