from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user, hash_password
from app.database import get_db

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.post("", response_model=schemas.UsuarioOut)
def crear_usuario(payload: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")
    if payload.empresa_id is not None:
        if not db.query(models.Empresa).filter(models.Empresa.id == payload.empresa_id).first():
            raise HTTPException(status_code=404, detail="Empresa no encontrada")

    usuario = models.Usuario(
        email=payload.email,
        password_hash=hash_password(payload.password),
        nombre=payload.nombre,
        rol=payload.rol,
        empresa_id=payload.empresa_id,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/me", response_model=schemas.UsuarioOut)
def yo(current_user: models.Usuario = Depends(get_current_user)):
    return current_user
