from pydantic import BaseModel

from app.models import PeriodoTipo, Rol


class EmpresaCreate(BaseModel):
    ruc: str
    razon_social: str
    regimen: str = ""
    rubro: str = ""
    plan: str = "trial"
    meses_colchon_caja: float = 1.0
    wacc_tasa_libre_riesgo: float = 0.0
    wacc_prima_mercado: float = 0.0
    wacc_beta: float = 1.0
    wacc_riesgo_pais: float = 0.0
    wacc_prima_tamano: float = 0.0
    wacc_costo_deuda_tea: float = 0.0


class EmpresaOut(BaseModel):
    id: int
    ruc: str
    razon_social: str
    regimen: str
    rubro: str
    plan: str

    class Config:
        from_attributes = True


class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    rol: Rol
    empresa_id: int | None

    class Config:
        from_attributes = True


class UsuarioUpdate(BaseModel):
    rol: Rol | None = None
    empresa_id: int | None = None


class PeriodoCreate(BaseModel):
    empresa_id: int
    tipo: PeriodoTipo = PeriodoTipo.mensual
    anio: int
    mes: int | None = None


class PeriodoOut(BaseModel):
    id: int
    empresa_id: int
    tipo: PeriodoTipo
    anio: int
    mes: int | None

    class Config:
        from_attributes = True


class SaldoIn(BaseModel):
    clave: str
    valor: float
    fuente: str = ""


class SaldoOut(SaldoIn):
    id: int

    class Config:
        from_attributes = True


class LineaContabilidad(BaseModel):
    clave: str
    cuenta: str
    signo: str
    importe: float
    pct_ingresos: float


class ContabilidadOut(BaseModel):
    periodo_id: int
    ingresos: float
    ebitda: float
    ebit: float
    margen_operativo: float
    utilidad_neta: float
    lineas: list[LineaContabilidad]
