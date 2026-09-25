from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.database import get_db


def requiere_admin(user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    if user.rol != models.Rol.admin:
        raise HTTPException(status_code=403, detail="Requiere rol admin")
    return user


def cliente_autorizado(cliente_id: str, user: models.Usuario, db: Session) -> models.Cliente:
    """Devuelve el cliente si el usuario puede verlo (admin: cualquiera;
    cliente: solo el suyo). Distingue 404 de 403 solo para admin."""
    cliente = db.get(models.Cliente, cliente_id)
    if user.rol != models.Rol.admin and user.cliente_id != cliente_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este cliente")
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente
