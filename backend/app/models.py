"""Modelo de datos del Portal del Cliente CORE.

Jerarquia: Cliente (grupo) -> Empresas (identificadas por `codigo`, ej. POL1).
Casi todo cuelga de la empresa (fases, actividades, fugas...). Los datos
anidados y de forma libre por empresa (analytics, servicios) se guardan como
JSON: los administra CORE desde el panel admin.
"""

import enum
from datetime import date, datetime, UTC

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    false,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Rol(str, enum.Enum):
    admin = "admin"  # equipo CORE: gestiona todo
    cliente = "cliente"  # usuario de un cliente: ve y opera solo su grupo


def _now() -> datetime:
    return datetime.now(UTC)


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)  # POL, RAP
    grupo: Mapped[str] = mapped_column(String(200))
    plan: Mapped[str] = mapped_column(String(300), default="")
    lider: Mapped[str] = mapped_column(String(200), default="")
    areas: Mapped[list] = mapped_column(JSON, default=list)
    fuente_datos: Mapped[str] = mapped_column(Text, default="")
    analytics_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # False = el cliente solo visualiza. True = ademas puede aprobar/observar,
    # registrar solicitudes y documentos, y pedir servicios.
    permite_acciones: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())

    empresas: Mapped[list["Empresa"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan", order_by="Empresa.orden"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="cliente")


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # POL1
    nombre: Mapped[str] = mapped_column(String(200))
    ruc_num: Mapped[str] = mapped_column(String(60), default="")
    orden: Mapped[int] = mapped_column(Integer, default=0)
    analytics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    servicios: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    cliente: Mapped[Cliente] = relationship(back_populates="empresas")


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), default="")
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)  # accesos creados por CORE
    rol: Mapped[Rol] = mapped_column(Enum(Rol), default=Rol.cliente)
    cliente_id: Mapped[str | None] = mapped_column(ForeignKey("clientes.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    cliente: Mapped[Cliente | None] = relationship(back_populates="usuarios")


class Diagnostico(Base):
    """Avance del diagnostico por area. empresa_codigo NULL = general del
    cliente; con valor = sobrescribe para esa empresa."""

    __tablename__ = "diagnosticos"
    __table_args__ = (UniqueConstraint("cliente_id", "empresa_codigo", "area"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    empresa_codigo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    area: Mapped[str] = mapped_column(String(40))
    est: Mapped[str] = mapped_column(String(40), default="Por iniciar")
    av: Mapped[int] = mapped_column(Integer, default=0)
    fecha: Mapped[str] = mapped_column(String(40), default="")


class Fase(Base):
    __tablename__ = "fases"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_codigo: Mapped[str] = mapped_column(ForeignKey("empresas.codigo"), index=True)
    area: Mapped[str] = mapped_column(String(40))
    fase: Mapped[str] = mapped_column(String(10))  # F0, F1...
    nom: Mapped[str] = mapped_column(String(200))
    paso: Mapped[int] = mapped_column(Integer, default=0)
    contratada: Mapped[bool] = mapped_column(Boolean, default=False)
    alc: Mapped[str] = mapped_column(String(60), default="")
    av: Mapped[int] = mapped_column(Integer, default=0)
    gate: Mapped[str] = mapped_column(String(60), default="Pendiente")
    crit: Mapped[str] = mapped_column(Text, default="")
    ini: Mapped[date | None] = mapped_column(Date, nullable=True)
    fin: Mapped[date | None] = mapped_column(Date, nullable=True)


class Actividad(Base):
    __tablename__ = "actividades"

    id: Mapped[int] = mapped_column(primary_key=True)
    uid: Mapped[str] = mapped_column(String(20), index=True)  # A001
    empresa_codigo: Mapped[str] = mapped_column(ForeignKey("empresas.codigo"), index=True)
    area: Mapped[str] = mapped_column(String(40))
    fase: Mapped[str] = mapped_column(String(10))
    num: Mapped[str] = mapped_column(String(20), default="")  # "0.1"
    act: Mapped[str] = mapped_column(Text)
    ent: Mapped[str] = mapped_column(Text, default="")
    est: Mapped[str] = mapped_column(String(40), default="Planificado")
    av: Mapped[int] = mapped_column(Integer, default=0)
    nota: Mapped[str] = mapped_column(Text, default="")


class Solicitud(Base):
    __tablename__ = "solicitudes"
    __table_args__ = (UniqueConstraint("empresa_codigo", "n"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_codigo: Mapped[str] = mapped_column(ForeignKey("empresas.codigo"), index=True)
    n: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[date] = mapped_column(Date)
    sol: Mapped[str] = mapped_column(Text)
    area: Mapped[str] = mapped_column(String(40))
    tipo: Mapped[str] = mapped_column(String(60), default="Consulta operativa")
    plazo: Mapped[int] = mapped_column(Integer, default=15)
    est: Mapped[str] = mapped_column(String(40), default="Abierta")
    atendida: Mapped[date | None] = mapped_column(Date, nullable=True)
    creada_por: Mapped[str] = mapped_column(String(200), default="")


class ChecklistItem(Base):
    __tablename__ = "checklist"
    __table_args__ = (UniqueConstraint("empresa_codigo", "cod"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_codigo: Mapped[str] = mapped_column(ForeignKey("empresas.codigo"), index=True)
    cod: Mapped[str] = mapped_column(String(40))
    doc: Mapped[str] = mapped_column(String(300))
    tipo: Mapped[str] = mapped_column(String(80), default="")
    area: Mapped[str] = mapped_column(String(40))
    sub: Mapped[str] = mapped_column(String(200), default="")
    resp: Mapped[str] = mapped_column(String(200), default="")
    est: Mapped[str] = mapped_column(String(40), default="Por enviar")
    fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Registro del envio hecho por el cliente. Guarda nombre y/o enlace del
    # archivo; el almacenamiento real de archivos (Drive, S3...) es un paso
    # posterior.
    enviado_nombre: Mapped[str | None] = mapped_column(String(300), nullable=True)
    enviado_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    enviado_fecha: Mapped[date | None] = mapped_column(Date, nullable=True)
    enviado_por: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Fuga(Base):
    __tablename__ = "fugas"

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_codigo: Mapped[str] = mapped_column(ForeignKey("empresas.codigo"), index=True)
    fuga: Mapped[str] = mapped_column(Text)
    area: Mapped[str] = mapped_column(String(40))
    prob: Mapped[str] = mapped_column(String(20), default="Media")
    monto: Mapped[float | None] = mapped_column(Float, nullable=True)
    tipo: Mapped[str] = mapped_column(String(40), default="Por valorizar")
    nota: Mapped[str] = mapped_column(Text, default="")
    trat: Mapped[str] = mapped_column(Text, default="")
    est: Mapped[str] = mapped_column(String(20), default="Abierto")
    fuente: Mapped[str] = mapped_column(String(300), default="")


class KpiDef(Base):
    __tablename__ = "kpis"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)
    area: Mapped[str] = mapped_column(String(40))
    sub: Mapped[str] = mapped_column(String(120), default="")
    n: Mapped[str] = mapped_column(String(200))
    est: Mapped[str] = mapped_column(String(20), default="gris")  # rojo/ambar/verde/azul/gris
    fuente: Mapped[str] = mapped_column(String(300), default="")
    base: Mapped[str] = mapped_column(String(200), default="")
    meta: Mapped[str] = mapped_column(String(200), default="")
    nota: Mapped[str] = mapped_column(Text, default="")
    viz: Mapped[str | None] = mapped_column(String(20), nullable=True)  # big/ring/parts/status/ref/bars
    sub2: Mapped[str] = mapped_column(String(300), default="")
    home: Mapped[int | None] = mapped_column(Integer, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(10), nullable=True)
    ref: Mapped[float | None] = mapped_column(Float, nullable=True)
    refl: Mapped[str | None] = mapped_column(String(200), nullable=True)
    parts: Mapped[list | None] = mapped_column(JSON, nullable=True)

    valores: Mapped[list["KpiValor"]] = relationship(
        back_populates="kpi", cascade="all, delete-orphan"
    )


class KpiValor(Base):
    """Valor de un KPI para una empresa concreta."""

    __tablename__ = "kpi_valores"
    __table_args__ = (UniqueConstraint("kpi_id", "empresa_codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_id: Mapped[int] = mapped_column(ForeignKey("kpis.id"), index=True)
    empresa_codigo: Mapped[str] = mapped_column(String(20))
    val: Mapped[str] = mapped_column(String(200))
    num: Mapped[float | None] = mapped_column(Float, nullable=True)
    sub2x: Mapped[str | None] = mapped_column(String(300), nullable=True)

    kpi: Mapped[KpiDef] = relationship(back_populates="valores")


class Academia(Base):
    __tablename__ = "academia"

    id: Mapped[int] = mapped_column(primary_key=True)
    area: Mapped[str] = mapped_column(String(40))
    t: Mapped[str] = mapped_column(String(300))
    d: Mapped[str] = mapped_column(Text, default="")
    modo: Mapped[str] = mapped_column(String(60), default="Virtual")
    dur: Mapped[str] = mapped_column(String(40), default="")
    prof: Mapped[str] = mapped_column(String(200), default="")


class Decision(Base):
    """Aprobacion u observacion del cliente sobre un entregable o cierre de fase."""

    __tablename__ = "decisiones"
    __table_args__ = (UniqueConstraint("cliente_id", "clave"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    clave: Mapped[str] = mapped_column(String(80))  # "A:A001" | "G:FinanzasF0"
    titulo: Mapped[str] = mapped_column(Text, default="")
    decision: Mapped[str] = mapped_column(String(20))  # Aprobado | Observado
    comentario: Mapped[str] = mapped_column(Text, default="")
    por: Mapped[str] = mapped_column(String(200), default="")
    ts: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Interes(Base):
    """Interes del cliente en un servicio / capacitacion / activar Analytics."""

    __tablename__ = "intereses"
    __table_args__ = (UniqueConstraint("cliente_id", "clave"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    clave: Mapped[str] = mapped_column(String(300))  # "srv-recupera" | "analytics" | titulo de clase
    por: Mapped[str] = mapped_column(String(200), default="")
    ts: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Config(Base):
    """Constantes editables del portal: subtemas por area, regla de fugas..."""

    __tablename__ = "config"

    clave: Mapped[str] = mapped_column(String(60), primary_key=True)
    valor: Mapped[dict | list | str | None] = mapped_column(JSON, nullable=True)
