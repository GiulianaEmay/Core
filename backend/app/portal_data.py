"""Importacion y armado de datos del portal.

`importar` carga el objeto DATA del portal (CORE_Portal_Cliente.html) en la
base; `cliente_payload` hace el camino inverso y devuelve un cliente con la
misma forma que usaba el portal, para que el frontend consuma un solo objeto.
"""

from datetime import date

from sqlalchemy.orm import Session

from app import models as m

# Tablas que cuelgan de la empresa por `empresa_codigo`.
_HIJOS_EMPRESA = (m.Fase, m.Actividad, m.Solicitud, m.ChecklistItem, m.Fuga)


def _fecha(s: str | None) -> date | None:
    return date.fromisoformat(str(s)[:10]) if s else None


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def borrar_empresa(db: Session, codigo: str) -> None:
    for modelo in _HIJOS_EMPRESA:
        db.query(modelo).filter(modelo.empresa_codigo == codigo).delete()
    db.query(m.KpiValor).filter(m.KpiValor.empresa_codigo == codigo).delete()
    db.query(m.Diagnostico).filter(m.Diagnostico.empresa_codigo == codigo).delete()
    db.query(m.Empresa).filter(m.Empresa.codigo == codigo).delete()


def borrar_contenido_cliente(db: Session, cliente_id: str) -> None:
    """Borra empresas, KPIs y diagnosticos del cliente. Conserva usuarios,
    decisiones e intereses (los generan las personas, no el import)."""
    for e in db.query(m.Empresa).filter(m.Empresa.cliente_id == cliente_id).all():
        borrar_empresa(db, e.codigo)
    for k in db.query(m.KpiDef).filter(m.KpiDef.cliente_id == cliente_id).all():
        db.delete(k)  # cascade borra sus valores
    db.query(m.Diagnostico).filter(m.Diagnostico.cliente_id == cliente_id).delete()
    db.flush()


def importar(db: Session, data: dict) -> dict:
    """Carga (reemplaza) el contenido de los clientes presentes en `data`.
    Devuelve un resumen con conteos."""
    resumen: dict = {"clientes": 0}

    if "subs" in data:
        db.merge(m.Config(clave="subs", valor=data["subs"]))
    if "regla" in data:
        db.merge(m.Config(clave="regla", valor=data["regla"]))
    if "academia" in data:
        db.query(m.Academia).delete()
        db.add_all(m.Academia(**{k: c.get(k, "") for k in ("area", "t", "d", "modo", "dur", "prof")}) for c in data["academia"])
        resumen["academia"] = len(data["academia"])

    for cid, c in data.get("clientes", {}).items():
        borrar_contenido_cliente(db, cid)
        analytics = c.get("analytics") or {}
        cliente = db.get(m.Cliente, cid) or m.Cliente(id=cid)
        cliente.grupo = c.get("grupo", cid)
        cliente.plan = c.get("plan", "")
        cliente.lider = c.get("lider", "")
        cliente.areas = c.get("areas", [])
        cliente.fuente_datos = c.get("fuenteDatos", "")
        cliente.analytics_enabled = bool(analytics.get("enabled"))
        db.add(cliente)

        por_ruc = analytics.get("porRuc", {})
        servicios = c.get("servicios", {})
        for i, e in enumerate(c.get("empresas", [])):
            cod = e["ruc"]
            db.add(
                m.Empresa(
                    cliente_id=cid,
                    codigo=cod,
                    nombre=e.get("nombre", cod),
                    ruc_num=e.get("rucNum", ""),
                    orden=i,
                    analytics=por_ruc.get(cod),
                    servicios=servicios.get(cod),
                )
            )
        db.flush()

        for area, d in (c.get("diagnostico") or {}).items():
            db.add(m.Diagnostico(cliente_id=cid, empresa_codigo=None, area=area, est=d["est"], av=d["av"], fecha=d.get("fecha", "")))
        for cod, areas in (c.get("diagRuc") or {}).items():
            for area, d in areas.items():
                db.add(m.Diagnostico(cliente_id=cid, empresa_codigo=cod, area=area, est=d["est"], av=d["av"], fecha=d.get("fecha", "")))

        for a in c.get("actividades", []):
            db.add(m.Actividad(uid=a["uid"], empresa_codigo=a["ruc"], area=a["area"], fase=a["fase"], num=a.get("id", ""), act=a["act"], ent=a.get("ent", ""), est=a.get("est", "Planificado"), av=a.get("av", 0), nota=a.get("nota", "")))
        for f in c.get("fases", []):
            db.add(m.Fase(empresa_codigo=f["ruc"], area=f["area"], fase=f["fase"], nom=f["nom"], paso=f.get("paso", 0), contratada=bool(f.get("contratada")), alc=f.get("alc", ""), av=f.get("av", 0), gate=f.get("gate", "Pendiente"), crit=f.get("crit", ""), ini=_fecha(f.get("ini")), fin=_fecha(f.get("fin"))))
        for s in c.get("solicitudes", []):
            db.add(m.Solicitud(empresa_codigo=s["ruc"], n=s["n"], fecha=_fecha(s["fecha"]), sol=s["sol"], area=s["area"], tipo=s.get("tipo", ""), plazo=s.get("plazo", 15), est=s.get("est", "Abierta"), atendida=_fecha(s.get("atendida"))))
        for x in c.get("checklist", []):
            envio = x.get("envio") or {}  # presente cuando el JSON viene de una exportacion
            db.add(m.ChecklistItem(
                empresa_codigo=x["ruc"], cod=x["cod"], doc=x["doc"], tipo=x.get("tipo", ""), area=x["area"],
                sub=x.get("sub", ""), resp=x.get("resp", ""), est=x.get("est", "Por enviar"), fecha=_fecha(x.get("fecha")),
                enviado_nombre=envio.get("nombre"), enviado_url=envio.get("url"),
                enviado_fecha=_fecha(envio.get("fecha")), enviado_por=envio.get("por"),
            ))
        for f in c.get("fugas", []):
            db.add(m.Fuga(empresa_codigo=f["ruc"], fuga=f["fuga"], area=f["area"], prob=f.get("prob", "Media"), monto=f.get("monto"), tipo=f.get("tipo", "Por valorizar"), nota=f.get("nota", ""), trat=f.get("trat", ""), est=f.get("est", "Abierto"), fuente=f.get("fuente", "")))

        for orden, k in enumerate(c.get("kpis", [])):
            kpi = m.KpiDef(
                cliente_id=cid, orden=orden, area=k["area"], sub=k.get("sub", ""), n=k["n"],
                est=k.get("est", "gris"), fuente=k.get("fuente", ""), base=k.get("base", ""),
                meta=k.get("meta", ""), nota=k.get("nota", ""), viz=k.get("viz"), sub2=k.get("sub2", ""),
                home=k.get("home"), unit=k.get("unit"), ref=k.get("ref"), refl=k.get("refl"), parts=k.get("parts"),
            )
            for cod, val in (k.get("vals") or {}).items():
                kpi.valores.append(
                    m.KpiValor(empresa_codigo=cod, val=val, num=(k.get("num") or {}).get(cod), sub2x=(k.get("sub2x") or {}).get(cod))
                )
            db.add(kpi)

        resumen["clientes"] += 1
        resumen[cid] = {
            "empresas": len(c.get("empresas", [])), "actividades": len(c.get("actividades", [])),
            "fases": len(c.get("fases", [])), "solicitudes": len(c.get("solicitudes", [])),
            "checklist": len(c.get("checklist", [])), "fugas": len(c.get("fugas", [])), "kpis": len(c.get("kpis", [])),
        }

    db.commit()
    return resumen


def _por_empresa(db: Session, modelo, codigos: list[str]):
    return db.query(modelo).filter(modelo.empresa_codigo.in_(codigos)).order_by(modelo.id).all()


def kpi_dict(k: m.KpiDef) -> dict:
    out: dict = {
        "id": k.id, "area": k.area, "sub": k.sub, "n": k.n,
        "vals": {v.empresa_codigo: v.val for v in k.valores},
        "est": k.est, "fuente": k.fuente, "base": k.base, "meta": k.meta, "nota": k.nota,
        "viz": k.viz, "sub2": k.sub2, "home": k.home,
    }
    nums = {v.empresa_codigo: v.num for v in k.valores if v.num is not None}
    sub2x = {v.empresa_codigo: v.sub2x for v in k.valores if v.sub2x}
    if nums:
        out["num"] = nums
    if sub2x:
        out["sub2x"] = sub2x
    if k.parts:
        out["parts"] = k.parts
    for campo in ("ref", "refl", "unit"):
        if getattr(k, campo) is not None:
            out[campo] = getattr(k, campo)
    return out


def cliente_payload(db: Session, cliente_id: str) -> dict | None:
    c = db.get(m.Cliente, cliente_id)
    if c is None:
        return None
    codigos = [e.codigo for e in c.empresas]

    diag_general: dict = {}
    diag_ruc: dict = {}
    for d in db.query(m.Diagnostico).filter(m.Diagnostico.cliente_id == cliente_id).order_by(m.Diagnostico.id):
        valor = {"est": d.est, "av": d.av, "fecha": d.fecha}
        if d.empresa_codigo is None:
            diag_general[d.area] = valor
        else:
            diag_ruc.setdefault(d.empresa_codigo, {})[d.area] = valor

    checklist = []
    for x in _por_empresa(db, m.ChecklistItem, codigos):
        item = {
            "ruc": x.empresa_codigo, "cod": x.cod, "doc": x.doc, "tipo": x.tipo, "area": x.area,
            "sub": x.sub, "resp": x.resp, "est": x.est, "fecha": _iso(x.fecha), "envio": None,
        }
        if x.enviado_nombre or x.enviado_url:
            item["envio"] = {"nombre": x.enviado_nombre, "url": x.enviado_url, "fecha": _iso(x.enviado_fecha), "por": x.enviado_por}
        checklist.append(item)

    kpis = (
        db.query(m.KpiDef).filter(m.KpiDef.cliente_id == cliente_id).order_by(m.KpiDef.orden, m.KpiDef.id).all()
    )
    decisiones = db.query(m.Decision).filter(m.Decision.cliente_id == cliente_id).order_by(m.Decision.ts.desc()).all()

    return {
        "id": c.id, "grupo": c.grupo, "plan": c.plan, "lider": c.lider, "areas": c.areas,
        "fuenteDatos": c.fuente_datos,
        "permiteAcciones": c.permite_acciones,
        "empresas": [{"ruc": e.codigo, "nombre": e.nombre, "rucNum": e.ruc_num} for e in c.empresas],
        "diagnostico": diag_general,
        "diagRuc": diag_ruc,
        "actividades": [
            {"uid": a.uid, "ruc": a.empresa_codigo, "area": a.area, "fase": a.fase, "id": a.num, "act": a.act, "ent": a.ent, "est": a.est, "av": a.av, "nota": a.nota}
            for a in _por_empresa(db, m.Actividad, codigos)
        ],
        "fases": [
            {"ruc": f.empresa_codigo, "area": f.area, "fase": f.fase, "nom": f.nom, "paso": f.paso, "contratada": f.contratada, "alc": f.alc, "av": f.av, "gate": f.gate, "crit": f.crit, "ini": _iso(f.ini), "fin": _iso(f.fin)}
            for f in _por_empresa(db, m.Fase, codigos)
        ],
        "solicitudes": [
            {"ruc": s.empresa_codigo, "n": s.n, "fecha": _iso(s.fecha), "sol": s.sol, "area": s.area, "tipo": s.tipo, "plazo": s.plazo, "est": s.est, "atendida": _iso(s.atendida)}
            for s in _por_empresa(db, m.Solicitud, codigos)
        ],
        "checklist": checklist,
        "fugas": [
            {"ruc": f.empresa_codigo, "fuga": f.fuga, "area": f.area, "prob": f.prob, "monto": f.monto, "tipo": f.tipo, "nota": f.nota, "trat": f.trat, "est": f.est, "fuente": f.fuente}
            for f in _por_empresa(db, m.Fuga, codigos)
        ],
        "kpis": [kpi_dict(k) for k in kpis],
        "analytics": {
            "enabled": c.analytics_enabled,
            "porRuc": {e.codigo: e.analytics for e in c.empresas if e.analytics},
        },
        "servicios": {e.codigo: e.servicios for e in c.empresas if e.servicios},
        "decisiones": [
            {"clave": d.clave, "t": d.titulo, "dec": d.decision, "com": d.comentario, "por": d.por, "ts": d.ts.isoformat()}
            for d in decisiones
        ],
        "intereses": [i.clave for i in db.query(m.Interes).filter(m.Interes.cliente_id == cliente_id)],
    }
