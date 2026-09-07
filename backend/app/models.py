import enum
from datetime import datetime, UTC

from sqlalchemy import (
    Enum,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Rol(str, enum.Enum):
    admin = "admin"
    cliente = "cliente"


class PeriodoTipo(str, enum.Enum):
    mensual = "mensual"
    trimestral = "trimestral"
    anual = "anual"


class Empresa(Base):
    """Cada cliente de la plataforma: RUC, razon social, y los parametros
    (WACC, colchon de caja) que hoy estan escritos a mano en el prototipo."""

    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(primary_key=True)
    ruc: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    razon_social: Mapped[str] = mapped_column(String(200))
    regimen: Mapped[str] = mapped_column(String(100), default="")
    rubro: Mapped[str] = mapped_column(String(100), default="")
    plan: Mapped[str] = mapped_column(String(50), default="trial")

    meses_colchon_caja: Mapped[float] = mapped_column(Float, default=1.0)
    wacc_tasa_libre_riesgo: Mapped[float] = mapped_column(Float, default=0.0)
    wacc_prima_mercado: Mapped[float] = mapped_column(Float, default=0.0)
    wacc_beta: Mapped[float] = mapped_column(Float, default=1.0)
    wacc_riesgo_pais: Mapped[float] = mapped_column(Float, default=0.0)
    wacc_prima_tamano: Mapped[float] = mapped_column(Float, default=0.0)
    wacc_costo_deuda_tea: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="empresa")
    periodos: Mapped[list["Periodo"]] = relationship(back_populates="empresa")


class Usuario(Base):
    """Quien entra, con que rol y a que empresa pertenece."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(200), default="")
    rol: Mapped[Rol] = mapped_column(Enum(Rol), default=Rol.cliente)

    empresa_id: Mapped[int | None] = mapped_column(ForeignKey("empresas.id"), nullable=True)
    empresa: Mapped[Empresa | None] = relationship(back_populates="usuarios")

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class Periodo(Base):
    """Cada mes/trimestre/anio de una empresa, para navegar en el tiempo."""

    __tablename__ = "periodos"
    __table_args__ = (UniqueConstraint("empresa_id", "tipo", "anio", "mes", name="uq_periodo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    empresa_id: Mapped[int] = mapped_column(ForeignKey("empresas.id"))
    empresa: Mapped[Empresa] = relationship(back_populates="periodos")

    tipo: Mapped[PeriodoTipo] = mapped_column(Enum(PeriodoTipo), default=PeriodoTipo.mensual)
    anio: Mapped[int] = mapped_column()
    mes: Mapped[int | None] = mapped_column(nullable=True)  # null para periodos anuales

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))

    saldos: Mapped[list["Saldo"]] = relationship(back_populates="periodo")
    indicadores: Mapped[list["Indicador"]] = relationship(back_populates="periodo")


class Saldo(Base):
    """Dato crudo que baja de una fuente (asiento contable, tributo, planilla).
    Clave libre (ej. 'er.ingresos', 'bal.caja', 'op.planilla') para poder
    mapear 1:1 el bloque INPUTS del prototipo sin rediseñar el esquema."""

    __tablename__ = "saldos"

    id: Mapped[int] = mapped_column(primary_key=True)
    periodo_id: Mapped[int] = mapped_column(ForeignKey("periodos.id"))
    periodo: Mapped[Periodo] = relationship(back_populates="saldos")

    clave: Mapped[str] = mapped_column(String(100), index=True)
    valor: Mapped[float] = mapped_column(Float)
    fuente: Mapped[str] = mapped_column(String(200), default="")  # ej. "balance de comprobacion"

    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class Indicador(Base):
    """Indicador ya calculado y guardado por periodo (EVA, ROIC, DSO, WACC...),
    listo para mostrar rapido sin recalcular en cada carga de pantalla."""

    __tablename__ = "indicadores"
    __table_args__ = (UniqueConstraint("periodo_id", "nombre", name="uq_indicador_periodo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    periodo_id: Mapped[int] = mapped_column(ForeignKey("periodos.id"))
    periodo: Mapped[Periodo] = relationship(back_populates="indicadores")

    nombre: Mapped[str] = mapped_column(String(100), index=True)
    valor: Mapped[float] = mapped_column(Float)
    calculado_en: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
