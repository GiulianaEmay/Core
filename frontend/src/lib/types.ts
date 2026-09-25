export type Area = "Finanzas" | "Operaciones" | "Legal";
export type Semaforo = "rojo" | "ambar" | "verde" | "azul" | "gris";

export type Usuario = {
  id: number;
  email: string;
  nombre: string;
  username?: string | null;
  rol: "admin" | "cliente";
  cliente_id: string | null;
};

export type ClienteResumen = { id: string; grupo: string; plan: string };
export type Diag = { est: string; av: number; fecha: string };
export type Empresa = { ruc: string; nombre: string; rucNum: string };

export type Actividad = {
  uid: string; ruc: string; area: Area; fase: string; id: string; act: string;
  ent: string; est: string; av: number; nota: string;
};
export type Fase = {
  ruc: string; area: Area; fase: string; nom: string; paso: number; contratada: boolean;
  alc: string; av: number; gate: string; crit: string; ini: string | null; fin: string | null;
};
export type Solicitud = {
  ruc: string; n: number; fecha: string; sol: string; area: Area; tipo: string;
  plazo: number; est: string; atendida: string | null;
};
export type Envio = { nombre: string | null; url: string | null; fecha: string | null; por: string | null };
export type ChecklistItem = {
  ruc: string; cod: string; doc: string; tipo: string; area: Area; sub: string;
  resp: string; est: string; fecha: string | null; envio: Envio | null;
};
export type Fuga = {
  ruc: string; fuga: string; area: Area; prob: string; monto: number | null; tipo: string;
  nota: string; trat: string; est: string; fuente: string;
};
export type Kpi = {
  id: number; area: Area; sub: string; n: string; vals: Record<string, string>;
  est: Semaforo; fuente: string; base: string; meta: string; nota: string;
  viz: string | null; sub2: string; home: number | null;
  num?: Record<string, number>; sub2x?: Record<string, string>;
  parts?: [string, number][]; ref?: number; refl?: string; unit?: string;
};

export type Palanca = {
  id: string; n: string; tipo: "utilidad" | "caja" | "cajaMes"; nota: string; def: number;
  deuda?: number; kd?: number; min?: number; base?: number; ventas?: number; coef?: number;
  ref?: number; costo?: number;
};
export type AnalyticsEmpresa = {
  rubro: string; palancas: Palanca[]; bloqueadas: string[]; bloqNota: string;
  rent: { ventas_m?: number; ebitda?: number; gf?: number; utilidad_m?: number; fuente?: string };
  insumos: [string, "ok" | "est" | "no", string?][];
  deuda: number;
  blindaje: [string, string, number][];
  activos: { nota: string; items: [string, string, number | null][] };
};
export type Recupera = { n: string; est: string; monto: number | null; txt: string; nota: string; fuente: string };
export type ServiciosEmpresa = {
  recupera: Recupera[]; noaplica: string[]; presta: [string, Semaforo, string][];
  fiscal: { SUNAT: [string, Semaforo, string][]; SUNAFIL: [string, Semaforo, string][] };
  bench: { rubro: string; propios: [string, string][] };
  sueldo: { utilidad?: number }; hook: string;
};
export type Decision = { clave: string; t: string; dec: "Aprobado" | "Observado"; com: string; por: string; ts: string };

export type ClienteData = {
  id: string; grupo: string; plan: string; lider: string; areas: Area[]; fuenteDatos: string;
  /** false = el cliente solo visualiza; true = ademas puede aprobar, solicitar, enviar documentos y pedir servicios */
  permiteAcciones: boolean;
  empresas: Empresa[];
  diagnostico: Record<string, Diag>;
  diagRuc: Record<string, Record<string, Diag>>;
  actividades: Actividad[]; fases: Fase[]; solicitudes: Solicitud[];
  checklist: ChecklistItem[]; fugas: Fuga[]; kpis: Kpi[];
  analytics: { enabled: boolean; porRuc: Record<string, AnalyticsEmpresa> };
  servicios: Record<string, ServiciosEmpresa>;
  decisiones: Decision[]; intereses: string[];
};

export type PortalConfig = {
  subs: Record<string, string[]>;
  regla: string;
  academia: { area: Area; t: string; d: string; modo: string; dur: string; prof: string }[];
};
