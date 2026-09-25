from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import Rol


class UsuarioOut(BaseModel):
    id: int
    email: str
    nombre: str
    username: str | None = None
    rol: Rol
    cliente_id: str | None

    model_config = ConfigDict(from_attributes=True)


class UsuarioUpdate(BaseModel):
    rol: Rol | None = None
    cliente_id: str | None = None
    nombre: str | None = None


class ClienteIn(BaseModel):
    id: str = Field(min_length=2, max_length=10, pattern=r"^[A-Za-z0-9_-]+$")
    grupo: str
    plan: str = ""
    lider: str = ""
    areas: list[str] = []
    fuente_datos: str = ""
    analytics_enabled: bool = False
    permite_acciones: bool = False


class ClienteUpdate(BaseModel):
    grupo: str | None = None
    plan: str | None = None
    lider: str | None = None
    areas: list[str] | None = None
    fuente_datos: str | None = None
    analytics_enabled: bool | None = None
    permite_acciones: bool | None = None


class AccesoIn(BaseModel):
    username: str = Field(min_length=4, max_length=40, pattern=r"^[a-z0-9_-]+$")
    password: str | None = Field(default=None, min_length=8, max_length=72)
    nombre: str = ""


class PasswordIn(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=72)


class ClienteOut(ClienteIn):
    model_config = ConfigDict(from_attributes=True)


class EmpresaIn(BaseModel):
    cliente_id: str
    codigo: str = Field(min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")
    nombre: str
    ruc_num: str = ""
    orden: int = 0
    analytics: dict | None = None
    servicios: dict | None = None


class EmpresaUpdate(BaseModel):
    nombre: str | None = None
    ruc_num: str | None = None
    orden: int | None = None
    analytics: dict | None = None
    servicios: dict | None = None


class EmpresaOut(EmpresaIn):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DecisionIn(BaseModel):
    clave: str
    decision: Literal["Aprobado", "Observado"]
    comentario: str = ""


class SolicitudNueva(BaseModel):
    empresa: str
    area: str
    tipo: Literal["Consulta operativa", "Incidencia", "Otro"]
    sol: str = Field(min_length=5)


class EnvioIn(BaseModel):
    nombre: str = Field(min_length=1)
    url: str | None = None


class KpiIn(BaseModel):
    cliente_id: str
    area: str
    sub: str = ""
    n: str
    est: str = "gris"
    fuente: str = ""
    base: str = ""
    meta: str = ""
    nota: str = ""
    viz: str | None = None
    sub2: str = ""
    home: int | None = None
    unit: str | None = None
    ref: float | None = None
    refl: str | None = None
    parts: list | None = None
    vals: dict[str, str] = {}
    num: dict[str, float] = {}
    sub2x: dict[str, str] = {}


class KpiUpdate(BaseModel):
    area: str | None = None
    sub: str | None = None
    n: str | None = None
    est: str | None = None
    fuente: str | None = None
    base: str | None = None
    meta: str | None = None
    nota: str | None = None
    viz: str | None = None
    sub2: str | None = None
    home: int | None = None
    unit: str | None = None
    ref: float | None = None
    refl: str | None = None
    parts: list | None = None
    vals: dict[str, str] | None = None
    num: dict[str, float] | None = None
    sub2x: dict[str, str] | None = None
