from pydantic import BaseModel, EmailStr

from app.models import Rol


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


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str = ""
    rol: Rol = Rol.cliente
    empresa_id: int | None = None


class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    rol: Rol
    empresa_id: int | None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
