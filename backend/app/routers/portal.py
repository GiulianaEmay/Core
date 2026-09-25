"""API del portal: lo que ve y hace un usuario del cliente (y el admin al
entrar como cliente para ver lo mismo que ve el cliente)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models as m
from app import schemas
from app.auth import get_current_user
from app.database import get_db
from app.deps import cliente_autorizado
from app.portal_data import cliente_payload

router = APIRouter(prefix="/portal", tags=["portal"])

PLAZO_POR_TIPO = {"Consulta operativa": 15, "Incidencia": 30, "Otro": 7}


def _puede_actuar(cliente_id: str, user: m.Usuario, db: Session) -> None:
    """Las acciones (aprobar, solicitar, enviar documentos, pedir servicios)
    solo existen si CORE las habilito para ese cliente; por defecto el
    portal es solo de consulta."""
    cliente = cliente_autorizado(cliente_id, user, db)
    if not cliente.permite_acciones:
        raise HTTPException(status_code=403, detail="Este portal esta en modo solo lectura")


@router.get("/me")
def me(user: m.Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.rol == m.Rol.admin:
        clientes = db.query(m.Cliente).order_by(m.Cliente.id).all()
    else:
        clientes = [user.cliente] if user.cliente else []
    return {
        "usuario": schemas.UsuarioOut.model_validate(user),
        "clientes": [{"id": c.id, "grupo": c.grupo, "plan": c.plan} for c in clientes],
    }


@router.get("/config")
def config(_: m.Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    cfg = {c.clave: c.valor for c in db.query(m.Config).all()}
    academia = [
        {"area": a.area, "t": a.t, "d": a.d, "modo": a.modo, "dur": a.dur, "prof": a.prof}
        for a in db.query(m.Academia).order_by(m.Academia.id)
    ]
    return {"subs": cfg.get("subs", {}), "regla": cfg.get("regla", ""), "academia": academia}


@router.get("/clientes/{cliente_id}")
def ver_cliente(
    cliente_id: str, user: m.Usuario = Depends(get_current_user), db: Session = Depends(get_db)
):
    cliente_autorizado(cliente_id, user, db)
    return cliente_payload(db, cliente_id)


def _empresa_del_cliente(db: Session, cliente_id: str, codigo: str) -> m.Empresa:
    e = db.query(m.Empresa).filter(m.Empresa.codigo == codigo, m.Empresa.cliente_id == cliente_id).first()
    if e is None:
        raise HTTPException(status_code=404, detail="Empresa no encontrada en este cliente")
    return e


def _pendientes(db: Session, cliente_id: str) -> dict[str, str]:
    """clave -> titulo de lo que espera la aprobacion del cliente."""
    codigos = [e.codigo for e in db.query(m.Empresa).filter(m.Empresa.cliente_id == cliente_id)]
    out: dict[str, str] = {}
    for a in db.query(m.Actividad).filter(m.Actividad.empresa_codigo.in_(codigos), m.Actividad.est == "Por aprobar"):
        out[f"A:{a.uid}"] = a.act
    for f in db.query(m.Fase).filter(m.Fase.empresa_codigo.in_(codigos), m.Fase.gate == "En aprobación cliente"):
        out[f"G:{f.area}{f.fase}"] = f"Cierre de {f.fase} · {f.nom}"
    return out


@router.post("/clientes/{cliente_id}/decisiones")
def decidir(
    cliente_id: str,
    body: schemas.DecisionIn,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    pendientes = _pendientes(db, cliente_id)
    if body.clave not in pendientes:
        raise HTTPException(status_code=404, detail="Ese item no esta pendiente de aprobacion")
    if db.query(m.Decision).filter_by(cliente_id=cliente_id, clave=body.clave).first():
        raise HTTPException(status_code=409, detail="Ya se registro una decision para este item")
    if body.decision == "Observado" and len(body.comentario.strip()) < 3:
        raise HTTPException(status_code=422, detail="Escribe que debe corregirse")

    db.add(
        m.Decision(
            cliente_id=cliente_id, clave=body.clave, titulo=pendientes[body.clave],
            decision=body.decision, comentario=body.comentario.strip(), por=user.nombre or user.email,
        )
    )
    db.commit()
    return cliente_payload(db, cliente_id)["decisiones"]


@router.post("/clientes/{cliente_id}/solicitudes")
def nueva_solicitud(
    cliente_id: str,
    body: schemas.SolicitudNueva,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    _empresa_del_cliente(db, cliente_id, body.empresa)
    codigos = [e.codigo for e in db.query(m.Empresa).filter(m.Empresa.cliente_id == cliente_id)]
    ultimo = db.query(m.Solicitud.n).filter(m.Solicitud.empresa_codigo.in_(codigos)).order_by(m.Solicitud.n.desc()).first()
    n = (ultimo[0] if ultimo else 0) + 1
    s = m.Solicitud(
        empresa_codigo=body.empresa, n=n, fecha=date.today(), sol=body.sol.strip(), area=body.area,
        tipo=body.tipo, plazo=PLAZO_POR_TIPO[body.tipo], est="Abierta", creada_por=user.nombre or user.email,
    )
    db.add(s)
    db.commit()
    return {"n": n}


def _item_checklist(db: Session, cliente_id: str, empresa: str, cod: str) -> m.ChecklistItem:
    _empresa_del_cliente(db, cliente_id, empresa)
    x = db.query(m.ChecklistItem).filter_by(empresa_codigo=empresa, cod=cod).first()
    if x is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return x


@router.put("/clientes/{cliente_id}/checklist/{empresa}/{cod}/envio")
def registrar_envio(
    cliente_id: str,
    empresa: str,
    cod: str,
    body: schemas.EnvioIn,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    x = _item_checklist(db, cliente_id, empresa, cod)
    x.enviado_nombre, x.enviado_url = body.nombre, body.url
    x.enviado_fecha, x.enviado_por = date.today(), user.nombre or user.email
    db.commit()
    return {"ok": True}


@router.delete("/clientes/{cliente_id}/checklist/{empresa}/{cod}/envio")
def quitar_envio(
    cliente_id: str,
    empresa: str,
    cod: str,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    x = _item_checklist(db, cliente_id, empresa, cod)
    if x.est not in ("Por enviar",):
        raise HTTPException(status_code=409, detail="El documento ya esta en revision: pidele a tu lider de cuenta")
    x.enviado_nombre = x.enviado_url = x.enviado_fecha = x.enviado_por = None
    db.commit()
    return {"ok": True}


@router.put("/clientes/{cliente_id}/intereses/{clave:path}")
def marcar_interes(
    cliente_id: str,
    clave: str,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    if not db.query(m.Interes).filter_by(cliente_id=cliente_id, clave=clave).first():
        db.add(m.Interes(cliente_id=cliente_id, clave=clave, por=user.nombre or user.email))
        db.commit()
    return {"ok": True}


@router.delete("/clientes/{cliente_id}/intereses/{clave:path}")
def quitar_interes(
    cliente_id: str,
    clave: str,
    user: m.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _puede_actuar(cliente_id, user, db)
    db.query(m.Interes).filter_by(cliente_id=cliente_id, clave=clave).delete()
    db.commit()
    return {"ok": True}
