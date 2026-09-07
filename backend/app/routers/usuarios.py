from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def _requiere_admin(current_user: models.Usuario):
    if current_user.rol != models.Rol.admin:
        raise HTTPException(status_code=403, detail="Requiere rol admin")


@router.get("/me", response_model=schemas.UsuarioOut)
def yo(current_user: models.Usuario = Depends(get_current_user)):
    return current_user


@router.get("", response_model=list[schemas.UsuarioOut])
def listar_usuarios(
    db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)
):
    """Lista todos los usuarios provisionados (los que ya iniciaron sesion
    al menos una vez via Clerk). Solo admin: para vincularlos a una empresa."""
    _requiere_admin(current_user)
    return db.query(models.Usuario).all()


@router.patch("/{usuario_id}", response_model=schemas.UsuarioOut)
def actualizar_usuario(
    usuario_id: int,
    payload: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Asigna empresa y/o rol a un usuario ya provisionado. Solo admin."""
    _requiere_admin(current_user)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if payload.empresa_id is not None:
        if not db.query(models.Empresa).filter(models.Empresa.id == payload.empresa_id).first():
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        usuario.empresa_id = payload.empresa_id
    if payload.rol is not None:
        usuario.rol = payload.rol

    db.commit()
    db.refresh(usuario)
    return usuario
