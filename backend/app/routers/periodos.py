from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.calculations import calcular_contabilidad
from app.database import get_db

router = APIRouter(prefix="/periodos", tags=["periodos"])


def _empresa_o_403(empresa_id: int, current_user: models.Usuario, db: Session) -> models.Empresa:
    empresa = db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if current_user.rol != models.Rol.admin and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta empresa")
    return empresa


def _periodo_o_403(periodo_id: int, current_user: models.Usuario, db: Session) -> models.Periodo:
    periodo = db.query(models.Periodo).filter(models.Periodo.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    _empresa_o_403(periodo.empresa_id, current_user, db)
    return periodo


@router.post("", response_model=schemas.PeriodoOut)
def crear_periodo(
    payload: schemas.PeriodoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _empresa_o_403(payload.empresa_id, current_user, db)
    existente = (
        db.query(models.Periodo)
        .filter(
            models.Periodo.empresa_id == payload.empresa_id,
            models.Periodo.tipo == payload.tipo,
            models.Periodo.anio == payload.anio,
            models.Periodo.mes == payload.mes,
        )
        .first()
    )
    if existente:
        return existente
    periodo = models.Periodo(**payload.model_dump())
    db.add(periodo)
    db.commit()
    db.refresh(periodo)
    return periodo


@router.get("", response_model=list[schemas.PeriodoOut])
def listar_periodos(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _empresa_o_403(empresa_id, current_user, db)
    return (
        db.query(models.Periodo)
        .filter(models.Periodo.empresa_id == empresa_id)
        .order_by(models.Periodo.anio.desc(), models.Periodo.mes.desc())
        .all()
    )


@router.put("/{periodo_id}/saldos", response_model=list[schemas.SaldoOut])
def cargar_saldos(
    periodo_id: int,
    payload: list[schemas.SaldoIn],
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Sube (o reemplaza) los saldos crudos de un periodo. Es el paso
    'se conecta o sube el balance' de la Fase 1: por ahora carga manual,
    mas adelante puede venir de una integracion (Concar, SUNAT, bancos)."""
    _periodo_o_403(periodo_id, current_user, db)

    db.query(models.Saldo).filter(models.Saldo.periodo_id == periodo_id).delete()
    saldos = [
        models.Saldo(periodo_id=periodo_id, clave=s.clave, valor=s.valor, fuente=s.fuente)
        for s in payload
    ]
    db.add_all(saldos)
    db.commit()
    for s in saldos:
        db.refresh(s)
    return saldos


@router.get("/{periodo_id}/contabilidad", response_model=schemas.ContabilidadOut)
def ver_contabilidad(
    periodo_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _periodo_o_403(periodo_id, current_user, db)

    saldos = db.query(models.Saldo).filter(models.Saldo.periodo_id == periodo_id).all()
    if not saldos:
        raise HTTPException(status_code=404, detail="Este periodo todavia no tiene saldos cargados")

    er = {s.clave: s.valor for s in saldos}
    resultado = calcular_contabilidad(er)

    for nombre in ("ebit", "ebitda", "margen_operativo", "utilidad_neta"):
        indicador = (
            db.query(models.Indicador)
            .filter(models.Indicador.periodo_id == periodo_id, models.Indicador.nombre == nombre)
            .first()
        )
        valor = resultado[nombre]
        if indicador:
            indicador.valor = valor
        else:
            db.add(models.Indicador(periodo_id=periodo_id, nombre=nombre, valor=valor))
    db.commit()

    return schemas.ContabilidadOut(periodo_id=periodo_id, **resultado)
