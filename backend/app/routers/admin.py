"""Panel de gestion de CORE (rol admin): CRUD de todo lo que muestra el portal."""

import json
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import create_model
from sqlalchemy.orm import Session

from app import models as m
from app import clerk_admin, schemas
from app.database import get_db
from app.deps import requiere_admin
from app.portal_data import borrar_contenido_cliente, borrar_empresa, cliente_payload, importar, kpi_dict

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_admin)])


# --------------------------------------------------------------- clientes
@router.get("/clientes", response_model=list[schemas.ClienteOut])
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(m.Cliente).order_by(m.Cliente.id).all()


@router.post("/clientes", response_model=schemas.ClienteOut)
def crear_cliente(body: schemas.ClienteIn, db: Session = Depends(get_db)):
    if db.get(m.Cliente, body.id):
        raise HTTPException(409, "Ya existe un cliente con ese id")
    c = m.Cliente(**body.model_dump())
    db.add(c)
    db.commit()
    return c


@router.patch("/clientes/{cliente_id}", response_model=schemas.ClienteOut)
def editar_cliente(cliente_id: str, body: schemas.ClienteUpdate, db: Session = Depends(get_db)):
    c = db.get(m.Cliente, cliente_id)
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    return c


@router.delete("/clientes/{cliente_id}")
def borrar_cliente(cliente_id: str, db: Session = Depends(get_db)):
    c = db.get(m.Cliente, cliente_id)
    if not c:
        raise HTTPException(404, "Cliente no encontrado")
    borrar_contenido_cliente(db, cliente_id)
    db.query(m.Decision).filter_by(cliente_id=cliente_id).delete()
    db.query(m.Interes).filter_by(cliente_id=cliente_id).delete()
    db.query(m.Usuario).filter_by(cliente_id=cliente_id).update({"cliente_id": None})
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.get("/clientes/{cliente_id}/exportar")
def exportar_cliente(cliente_id: str, db: Session = Depends(get_db)):
    p = cliente_payload(db, cliente_id)
    if p is None:
        raise HTTPException(404, "Cliente no encontrado")
    return p


# --------------------------------------------------------------- empresas
@router.get("/empresas", response_model=list[schemas.EmpresaOut])
def listar_empresas(cliente_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(m.Empresa)
    if cliente_id:
        q = q.filter(m.Empresa.cliente_id == cliente_id)
    return q.order_by(m.Empresa.cliente_id, m.Empresa.orden).all()


@router.post("/empresas", response_model=schemas.EmpresaOut)
def crear_empresa(body: schemas.EmpresaIn, db: Session = Depends(get_db)):
    if not db.get(m.Cliente, body.cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    if db.query(m.Empresa).filter_by(codigo=body.codigo).first():
        raise HTTPException(409, "Ya existe una empresa con ese codigo")
    e = m.Empresa(**body.model_dump())
    db.add(e)
    db.commit()
    return e


@router.patch("/empresas/{codigo}", response_model=schemas.EmpresaOut)
def editar_empresa(codigo: str, body: schemas.EmpresaUpdate, db: Session = Depends(get_db)):
    e = db.query(m.Empresa).filter_by(codigo=codigo).first()
    if not e:
        raise HTTPException(404, "Empresa no encontrada")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    return e


@router.delete("/empresas/{codigo}")
def quitar_empresa(codigo: str, db: Session = Depends(get_db)):
    if not db.query(m.Empresa).filter_by(codigo=codigo).first():
        raise HTTPException(404, "Empresa no encontrada")
    borrar_empresa(db, codigo)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------- usuarios
@router.get("/usuarios", response_model=list[schemas.UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(m.Usuario).order_by(m.Usuario.id).all()


@router.patch("/usuarios/{usuario_id}", response_model=schemas.UsuarioOut)
def editar_usuario(usuario_id: int, body: schemas.UsuarioUpdate, db: Session = Depends(get_db)):
    u = db.get(m.Usuario, usuario_id)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    datos = body.model_dump(exclude_unset=True)
    if datos.get("cliente_id") and not db.get(m.Cliente, datos["cliente_id"]):
        raise HTTPException(404, "Cliente no encontrado")
    for k, v in datos.items():
        setattr(u, k, v)
    db.commit()
    return u


@router.delete("/usuarios/{usuario_id}")
def borrar_usuario(usuario_id: int, yo: m.Usuario = Depends(requiere_admin), db: Session = Depends(get_db)):
    u = db.get(m.Usuario, usuario_id)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if u.id == yo.id:
        raise HTTPException(409, "No puede borrar su propio usuario")
    try:
        clerk_admin.borrar_usuario(u.clerk_user_id)
    except clerk_admin.ClerkError as e:
        raise HTTPException(502, str(e))
    db.delete(u)
    db.commit()
    return {"ok": True}


# ------------------------------------------- accesos (usuario + clave) de clientes
def _acceso_out(u: m.Usuario) -> dict:
    return {"id": u.id, "username": u.username, "email": u.email, "nombre": u.nombre, "rol": u.rol.value}


@router.get("/clientes/{cliente_id}/accesos")
def listar_accesos(cliente_id: str, db: Session = Depends(get_db)):
    if not db.get(m.Cliente, cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    return [_acceso_out(u) for u in db.query(m.Usuario).filter_by(cliente_id=cliente_id).order_by(m.Usuario.id)]


@router.post("/clientes/{cliente_id}/accesos")
def crear_acceso(cliente_id: str, body: schemas.AccesoIn, db: Session = Depends(get_db)):
    """Crea el login del cliente (usuario + clave) y lo deja vinculado a su
    grupo. La clave se devuelve UNA sola vez: no se guarda en ningun lado."""
    cliente = db.get(m.Cliente, cliente_id)
    if not cliente:
        raise HTTPException(404, "Cliente no encontrado")
    if db.query(m.Usuario).filter_by(username=body.username).first():
        raise HTTPException(409, "Ese usuario ya existe")
    password = body.password or clerk_admin.generar_password()
    try:
        clerk_id, email = clerk_admin.crear_usuario(body.username, password, body.nombre or cliente.grupo, cliente_id)
    except clerk_admin.ClerkError as e:
        raise HTTPException(422, str(e))
    u = m.Usuario(
        clerk_user_id=clerk_id, email=email, username=body.username, nombre=body.nombre or cliente.grupo,
        rol=m.Rol.cliente, cliente_id=cliente_id,
    )
    db.add(u)
    db.commit()
    return {**_acceso_out(u), "password": password}


@router.post("/usuarios/{usuario_id}/password")
def restablecer_password(usuario_id: int, body: schemas.PasswordIn, db: Session = Depends(get_db)):
    u = db.get(m.Usuario, usuario_id)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    password = body.password or clerk_admin.generar_password()
    try:
        clerk_admin.cambiar_password(u.clerk_user_id, password)
    except clerk_admin.ClerkError as e:
        raise HTTPException(422, str(e))
    return {**_acceso_out(u), "password": password}


@router.get("/resumen-clientes")
def resumen_clientes(db: Session = Depends(get_db)):
    """Una fila por cliente con lo que el equipo CORE necesita ver de un vistazo."""
    filas = []
    for c in db.query(m.Cliente).order_by(m.Cliente.id):
        cods = [e.codigo for e in c.empresas]
        fugas = db.query(m.Fuga).filter(m.Fuga.empresa_codigo.in_(cods), m.Fuga.est != "Cerrado").all()
        decididas = {d.clave for d in db.query(m.Decision).filter_by(cliente_id=c.id)}
        por_aprobar = sum(
            1 for a in db.query(m.Actividad).filter(m.Actividad.empresa_codigo.in_(cods), m.Actividad.est == "Por aprobar")
            if f"A:{a.uid}" not in decididas
        ) + sum(
            1 for f in db.query(m.Fase).filter(m.Fase.empresa_codigo.in_(cods), m.Fase.gate == "En aprobación cliente")
            if f"G:{f.area}{f.fase}" not in decididas
        )
        filas.append({
            "id": c.id, "grupo": c.grupo, "plan": c.plan, "lider": c.lider,
            "permite_acciones": c.permite_acciones, "analytics_enabled": c.analytics_enabled,
            "empresas": [{"codigo": e.codigo, "nombre": e.nombre, "ruc_num": e.ruc_num} for e in c.empresas],
            "usuarios": db.query(m.Usuario).filter_by(cliente_id=c.id).count(),
            "kpis": db.query(m.KpiDef).filter_by(cliente_id=c.id).count(),
            "fugas_abiertas": len(fugas),
            "fugas_anual": sum(f.monto or 0 for f in fugas if f.tipo == "Anual"),
            "por_aprobar": por_aprobar,
            "solicitudes_abiertas": db.query(m.Solicitud).filter(
                m.Solicitud.empresa_codigo.in_(cods), m.Solicitud.est.in_(["Abierta", "En atención"])
            ).count(),
            "docs_por_enviar": db.query(m.ChecklistItem).filter(
                m.ChecklistItem.empresa_codigo.in_(cods), m.ChecklistItem.est == "Por enviar"
            ).count(),
        })
    return filas


# --------------------------------------------------- lo que hicieron clientes
@router.get("/decisiones")
def listar_decisiones(cliente_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(m.Decision)
    if cliente_id:
        q = q.filter_by(cliente_id=cliente_id)
    return [
        {"id": d.id, "cliente_id": d.cliente_id, "clave": d.clave, "titulo": d.titulo, "decision": d.decision, "comentario": d.comentario, "por": d.por, "ts": d.ts.isoformat()}
        for d in q.order_by(m.Decision.ts.desc())
    ]


@router.delete("/decisiones/{decision_id}")
def reabrir_decision(decision_id: int, db: Session = Depends(get_db)):
    """Borra la decision: el item vuelve a quedar pendiente para el cliente."""
    db.query(m.Decision).filter_by(id=decision_id).delete()
    db.commit()
    return {"ok": True}


@router.get("/intereses")
def listar_intereses(cliente_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(m.Interes)
    if cliente_id:
        q = q.filter_by(cliente_id=cliente_id)
    return [
        {"id": i.id, "cliente_id": i.cliente_id, "clave": i.clave, "por": i.por, "ts": i.ts.isoformat()}
        for i in q.order_by(m.Interes.ts.desc())
    ]


@router.delete("/intereses/{interes_id}")
def cerrar_interes(interes_id: int, db: Session = Depends(get_db)):
    db.query(m.Interes).filter_by(id=interes_id).delete()
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- importar
@router.post("/importar")
def importar_datos(data: dict = Body(...), db: Session = Depends(get_db)):
    """Carga el objeto DATA del portal (formato de CORE_Portal_Cliente.html).
    Reemplaza el contenido de los clientes que vengan en el JSON."""
    if "clientes" not in data:
        raise HTTPException(422, "El JSON debe traer la clave 'clientes'")
    return importar(db, data)


@router.post("/importar-base")
def importar_base(db: Session = Depends(get_db)):
    """Carga los datos base incluidos en el sistema (portal_data.json:
    Pollitos de Oro y Rapesa). Reemplaza el contenido de esos clientes."""
    ruta = Path(__file__).resolve().parents[1] / "seed" / "portal_data.json"
    return importar(db, json.loads(ruta.read_text(encoding="utf-8")))


# ------------------------------------------------------------------- KPIs
def _aplicar_kpi(k: m.KpiDef, datos: dict[str, Any]) -> None:
    vals, num, sub2x = datos.pop("vals", None), datos.pop("num", None), datos.pop("sub2x", None)
    for campo, v in datos.items():
        setattr(k, campo, v)
    if vals is not None:
        num, sub2x = num or {}, sub2x or {}
        # Actualiza en sitio: reemplazar la coleccion inserta antes de borrar
        # y choca con la unicidad (kpi_id, empresa_codigo).
        existentes = {v.empresa_codigo: v for v in k.valores}
        for cod in set(existentes) - set(vals):
            k.valores.remove(existentes[cod])
        for cod, val in vals.items():
            v = existentes.get(cod)
            if v is None:
                v = m.KpiValor(empresa_codigo=cod)
                k.valores.append(v)
            v.val, v.num, v.sub2x = val, num.get(cod), sub2x.get(cod)


@router.get("/kpis")
def listar_kpis(cliente_id: str, db: Session = Depends(get_db)):
    ks = db.query(m.KpiDef).filter_by(cliente_id=cliente_id).order_by(m.KpiDef.orden, m.KpiDef.id).all()
    return [kpi_dict(k) for k in ks]


@router.post("/kpis")
def crear_kpi(body: schemas.KpiIn, db: Session = Depends(get_db)):
    if not db.get(m.Cliente, body.cliente_id):
        raise HTTPException(404, "Cliente no encontrado")
    ultimo = db.query(m.KpiDef.orden).filter_by(cliente_id=body.cliente_id).order_by(m.KpiDef.orden.desc()).first()
    k = m.KpiDef(cliente_id=body.cliente_id, orden=(ultimo[0] + 1) if ultimo else 0, area=body.area, n=body.n)
    datos = body.model_dump(exclude={"cliente_id", "area", "n"})
    _aplicar_kpi(k, datos)
    db.add(k)
    db.commit()
    return kpi_dict(k)


@router.patch("/kpis/{kpi_id}")
def editar_kpi(kpi_id: int, body: schemas.KpiUpdate, db: Session = Depends(get_db)):
    k = db.get(m.KpiDef, kpi_id)
    if not k:
        raise HTTPException(404, "KPI no encontrado")
    _aplicar_kpi(k, body.model_dump(exclude_unset=True))
    db.commit()
    return kpi_dict(k)


@router.delete("/kpis/{kpi_id}")
def borrar_kpi(kpi_id: int, db: Session = Depends(get_db)):
    k = db.get(m.KpiDef, kpi_id)
    if not k:
        raise HTTPException(404, "KPI no encontrado")
    db.delete(k)
    db.commit()
    return {"ok": True}


# ------------------------------------------- CRUD generico por entidad
# entidad -> (modelo, {campo: (tipo, default)}). `...` = obligatorio.
ENTIDADES: dict[str, tuple[type, dict[str, tuple[Any, Any]]]] = {
    "actividades": (m.Actividad, {
        "uid": (str, ...), "empresa_codigo": (str, ...), "area": (str, ...), "fase": (str, ...),
        "num": (str, ""), "act": (str, ...), "ent": (str, ""), "est": (str, "Planificado"),
        "av": (int, 0), "nota": (str, ""),
    }),
    "fases": (m.Fase, {
        "empresa_codigo": (str, ...), "area": (str, ...), "fase": (str, ...), "nom": (str, ...),
        "paso": (int, 0), "contratada": (bool, False), "alc": (str, ""), "av": (int, 0),
        "gate": (str, "Pendiente"), "crit": (str, ""), "ini": (date | None, None), "fin": (date | None, None),
    }),
    "solicitudes": (m.Solicitud, {
        "empresa_codigo": (str, ...), "n": (int, ...), "fecha": (date, ...), "sol": (str, ...),
        "area": (str, ...), "tipo": (str, "Consulta operativa"), "plazo": (int, 15),
        "est": (str, "Abierta"), "atendida": (date | None, None), "creada_por": (str, ""),
    }),
    "checklist": (m.ChecklistItem, {
        "empresa_codigo": (str, ...), "cod": (str, ...), "doc": (str, ...), "tipo": (str, ""),
        "area": (str, ...), "sub": (str, ""), "resp": (str, ""), "est": (str, "Por enviar"),
        "fecha": (date | None, None), "enviado_nombre": (str | None, None),
        "enviado_url": (str | None, None), "enviado_fecha": (date | None, None),
        "enviado_por": (str | None, None),
    }),
    "fugas": (m.Fuga, {
        "empresa_codigo": (str, ...), "fuga": (str, ...), "area": (str, ...), "prob": (str, "Media"),
        "monto": (float | None, None), "tipo": (str, "Por valorizar"), "nota": (str, ""),
        "trat": (str, ""), "est": (str, "Abierto"), "fuente": (str, ""),
    }),
    "diagnosticos": (m.Diagnostico, {
        "cliente_id": (str, ...), "empresa_codigo": (str | None, None), "area": (str, ...),
        "est": (str, "Por iniciar"), "av": (int, 0), "fecha": (str, ""),
    }),
    "academia": (m.Academia, {
        "area": (str, ...), "t": (str, ...), "d": (str, ""), "modo": (str, "Virtual"),
        "dur": (str, ""), "prof": (str, ""),
    }),
}


def _registrar_entidad(nombre: str, modelo: type, campos: dict[str, tuple[Any, Any]]) -> None:
    Crear = create_model(f"{nombre}_in", **campos)
    Editar = create_model(f"{nombre}_upd", **{k: (t | None, None) for k, (t, _) in campos.items()})
    tiene_empresa = "empresa_codigo" in campos and nombre != "diagnosticos"

    def _validar(datos: dict, db: Session) -> None:
        cod = datos.get("empresa_codigo")
        if cod and not db.query(m.Empresa).filter_by(codigo=cod).first():
            raise HTTPException(422, f"La empresa '{cod}' no existe")
        if datos.get("cliente_id") and not db.get(m.Cliente, datos["cliente_id"]):
            raise HTTPException(422, f"El cliente '{datos['cliente_id']}' no existe")

    def _fila(x: Any) -> dict:
        d = {c: getattr(x, c) for c in campos}
        d["id"] = x.id
        return {k: (v.isoformat() if isinstance(v, date) else v) for k, v in d.items()}

    @router.get(f"/{nombre}", name=f"listar_{nombre}")
    def listar(cliente_id: str | None = None, empresa: str | None = None, db: Session = Depends(get_db)):
        q = db.query(modelo)
        if empresa and tiene_empresa:
            q = q.filter(modelo.empresa_codigo == empresa)
        elif cliente_id and tiene_empresa:
            codigos = [e.codigo for e in db.query(m.Empresa).filter_by(cliente_id=cliente_id)]
            q = q.filter(modelo.empresa_codigo.in_(codigos))
        elif cliente_id and nombre == "diagnosticos":
            q = q.filter(modelo.cliente_id == cliente_id)
        return [_fila(x) for x in q.order_by(modelo.id).all()]

    @router.post(f"/{nombre}", name=f"crear_{nombre}")
    def crear(body: Crear, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        datos = body.model_dump()
        _validar(datos, db)
        x = modelo(**datos)
        db.add(x)
        db.commit()
        return _fila(x)

    @router.patch(f"/{nombre}/{{item_id}}", name=f"editar_{nombre}")
    def editar(item_id: int, body: Editar, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        x = db.get(modelo, item_id)
        if not x:
            raise HTTPException(404, "No encontrado")
        datos = body.model_dump(exclude_unset=True)
        _validar(datos, db)
        for k, v in datos.items():
            setattr(x, k, v)
        db.commit()
        return _fila(x)

    @router.delete(f"/{nombre}/{{item_id}}", name=f"borrar_{nombre}")
    def borrar(item_id: int, db: Session = Depends(get_db)):
        x = db.get(modelo, item_id)
        if not x:
            raise HTTPException(404, "No encontrado")
        db.delete(x)
        db.commit()
        return {"ok": True}


for _nombre, (_modelo, _campos) in ENTIDADES.items():
    _registrar_entidad(_nombre, _modelo, _campos)
