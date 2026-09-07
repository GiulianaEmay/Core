from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.post("", response_model=schemas.EmpresaOut)
def crear_empresa(
    payload: schemas.EmpresaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if current_user.rol != models.Rol.admin:
        raise HTTPException(status_code=403, detail="Requiere rol admin")
    if db.query(models.Empresa).filter(models.Empresa.ruc == payload.ruc).first():
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese RUC")
    empresa = models.Empresa(**payload.model_dump())
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


@router.get("", response_model=list[schemas.EmpresaOut])
def listar_empresas(
    db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)
):
    if current_user.rol == models.Rol.admin:
        return db.query(models.Empresa).all()
    if current_user.empresa_id is None:
        return []
    return db.query(models.Empresa).filter(models.Empresa.id == current_user.empresa_id).all()
