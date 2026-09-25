export type Campo = {
  k: string;
  label: string;
  tipo: "text" | "textarea" | "number" | "date" | "select" | "bool" | "empresa" | "json" | "valores";
  opciones?: string[];
  /** en blanco se guarda como null (columnas opcionales) */
  nulo?: boolean;
  /** solo editable al crear (claves) */
  soloCrear?: boolean;
  ancho?: boolean;
  ayuda?: string;
  /** valor que se guarda cuando un campo JSON se deja en blanco (por defecto null) */
  vacio?: unknown;
};

export type Entidad = {
  entidad: string;
  titulo: string;
  /** clave para PATCH/DELETE (por defecto id) */
  idKey?: string;
  campos: Campo[];
  columnas: string[];
  /** true = se filtra por cliente (o empresa); false = global */
  porCliente: boolean;
  ayuda?: string;
};

const AREAS = ["Finanzas", "Operaciones", "Legal"];
const t = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "text", ...extra });
const ta = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "textarea", ancho: true, ...extra });
const n = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "number", ...extra });
const d = (k: string, label: string, extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "date", nulo: true, ...extra });
const s = (k: string, label: string, opciones: string[], extra: Partial<Campo> = {}): Campo => ({ k, label, tipo: "select", opciones, ...extra });
const emp = (nulo = false): Campo => ({ k: "empresa_codigo", label: "Empresa", tipo: "empresa", nulo });
const json = (k: string, label: string, ayuda?: string, vacio?: unknown): Campo => ({ k, label, tipo: "json", ancho: true, ayuda, vacio });

export const ESTADOS_SEMAFORO = ["rojo", "ambar", "verde", "azul", "gris"];

export const ENTIDADES: Record<string, Entidad> = {
  clientes: {
    entidad: "clientes", titulo: "Clientes", idKey: "id", porCliente: false,
    columnas: ["id", "grupo", "lider", "analytics_enabled"],
    campos: [
      t("id", "Código del cliente", { soloCrear: true, ayuda: "Corto y sin espacios, ej. POL" }),
      t("grupo", "Grupo / razón comercial"),
      t("plan", "Plan", { ancho: true }),
      t("lider", "Líder de cuenta"),
      { k: "areas", label: "Áreas contratadas", tipo: "json", ancho: true, ayuda: 'Lista JSON, ej. ["Finanzas","Legal"]', vacio: [] },
      ta("fuente_datos", "Fuente de datos (se muestra al pie de Fugas)"),
      { k: "analytics_enabled", label: "Analytics activo en su plan", tipo: "bool" },
      { k: "permite_acciones", label: "Modo interactivo (el cliente puede aprobar, solicitar y enviar documentos). Apagado = solo consulta", tipo: "bool", ancho: true },
    ],
  },
  empresas: {
    entidad: "empresas", titulo: "Empresas (RUC)", idKey: "codigo", porCliente: true,
    ayuda: "Use “Analytics y Servicios” en cada empresa para cargar sus cifras (palancas, rentabilidad, dinero por recuperar…).",
    columnas: ["codigo", "nombre", "ruc_num", "orden"],
    campos: [
      t("codigo", "Código de empresa", { soloCrear: true, ayuda: "Único, ej. POL1" }),
      t("nombre", "Nombre"),
      t("ruc_num", "RUC"),
      n("orden", "Orden"),
    ],
  },
  diagnosticos: {
    entidad: "diagnosticos", titulo: "Diagnóstico por área", porCliente: true,
    ayuda: "Sin empresa = diagnóstico general del cliente; con empresa = lo sobrescribe para ese RUC.",
    columnas: ["empresa_codigo", "area", "est", "av", "fecha"],
    campos: [emp(true), s("area", "Área", AREAS), s("est", "Estado", ["Por iniciar", "En curso", "Completo"]), n("av", "Avance %"), t("fecha", "Fecha (texto)")],
  },
  fases: {
    entidad: "fases", titulo: "Fases", porCliente: true,
    columnas: ["empresa_codigo", "area", "fase", "nom", "gate", "av", "fin"],
    campos: [
      emp(), s("area", "Área", AREAS), t("fase", "Fase (F0, F1…)"), t("nom", "Nombre de la fase"), n("paso", "Paso del Método"),
      { k: "contratada", label: "Contratada", tipo: "bool" },
      s("alc", "Alcance", ["Roadmap", "Recomendada", "En alcance 2026", "Propuesta"]),
      n("av", "Avance %"),
      s("gate", "Estado del cierre", ["Pendiente", "En preparación", "Propuesta enviada", "En aprobación cliente", "Aprobado", "No programado"]),
      d("ini", "Inicio"), d("fin", "Fin"), ta("crit", "Criterio de cierre"),
    ],
  },
  actividades: {
    entidad: "actividades", titulo: "Actividades", porCliente: true,
    columnas: ["uid", "empresa_codigo", "area", "fase", "num", "act", "est", "av"],
    campos: [
      emp(), t("uid", "ID único (A001)"), s("area", "Área", AREAS), t("fase", "Fase"), t("num", "N° dentro de la fase"),
      s("est", "Estado", ["Planificado", "En curso", "En revisión", "Por aprobar", "Completado", "Bloqueado"]), n("av", "Avance %"),
      ta("act", "Actividad"), ta("ent", "Entregable"), ta("nota", "Nota visible al cliente"),
    ],
  },
  solicitudes: {
    entidad: "solicitudes", titulo: "Solicitudes", porCliente: true,
    columnas: ["n", "empresa_codigo", "fecha", "sol", "tipo", "est", "creada_por"],
    campos: [
      emp(), n("n", "N°"), d("fecha", "Fecha de registro", { nulo: false }), s("area", "Área", AREAS),
      s("tipo", "Tipo", ["Consulta operativa", "Incidencia", "Otro"]), n("plazo", "Plazo (días)"),
      s("est", "Estado", ["Abierta", "En atención", "Atendida", "Cerrada"]), d("atendida", "Fecha de atención"),
      ta("sol", "Solicitud"), t("creada_por", "Registrada por"),
    ],
  },
  checklist: {
    entidad: "checklist", titulo: "Checklist de documentos", porCliente: true,
    ayuda: "Cuando el cliente registra un envío, revíselo aquí y cambie el estado a En revisión o Completo.",
    columnas: ["empresa_codigo", "cod", "doc", "area", "est", "enviado_nombre"],
    campos: [
      emp(), t("cod", "Código"), t("doc", "Documento", { ancho: true }), t("tipo", "Tipo"), s("area", "Área", AREAS), t("sub", "Subtema"),
      t("resp", "Responsable en la empresa"), s("est", "Estado", ["Por enviar", "En elaboración", "En revisión", "Completo"]), d("fecha", "Fecha límite"),
      t("enviado_nombre", "Envío: nombre", { nulo: true }), t("enviado_url", "Envío: enlace", { nulo: true }),
      d("enviado_fecha", "Envío: fecha"), t("enviado_por", "Envío: por", { nulo: true }),
    ],
  },
  fugas: {
    entidad: "fugas", titulo: "Fugas de valor", porCliente: true,
    columnas: ["empresa_codigo", "fuga", "area", "prob", "monto", "tipo", "est"],
    campos: [
      emp(), s("area", "Área", AREAS), s("prob", "Probabilidad", ["Alta", "Media", "Baja"]),
      n("monto", "Monto (S/)", { nulo: true }), s("tipo", "Tipo", ["Anual", "Puntual", "Caja", "Exposición", "Por valorizar"]),
      s("est", "Estado", ["Abierto", "Cerrado"]), ta("fuga", "Fuga"), ta("nota", "Nota"), ta("trat", "Tratamiento"), t("fuente", "Fuente", { ancho: true }),
    ],
  },
  kpis: {
    entidad: "kpis", titulo: "Indicadores (KPI)", porCliente: true,
    ayuda: "Escriba el valor de cada empresa: “Se muestra” es el texto de la tarjeta; “Número” alimenta la gráfica (anillo, barras). Vacío = “Por medir”.",
    columnas: ["area", "sub", "n", "est", "viz", "home"],
    campos: [
      s("area", "Área", AREAS), t("sub", "Subtema"), t("n", "Nombre del indicador", { ancho: true }), s("est", "Semáforo", ["rojo", "ambar", "verde", "azul", "gris"]),
      s("viz", "Gráfica", ["", "big", "ring", "parts", "status", "ref", "bars"], { nulo: true }), n("home", "Posición en el panel (vacío = no aparece)", { nulo: true }),
      t("unit", "Unidad (S/ o %)", { nulo: true }), n("ref", "Referencia (viz ref)", { nulo: true }), t("refl", "Texto de la referencia", { nulo: true }),
      t("fuente", "Fuente", { ancho: true }), t("base", "Base"), t("meta", "Meta"), ta("nota", "Nota"), t("sub2", "Texto secundario"),
      { k: "__valores", label: "Valores por empresa", tipo: "valores", ancho: true },
      json("parts", "Partes (solo gráfica “parts”)", '[["Recepción",50],["Archivo",80]] — cada parte es [nombre, porcentaje]'),
    ],
  },
  academia: {
    entidad: "academia", titulo: "Academia (capacitaciones)", porCliente: false,
    columnas: ["area", "t", "modo", "dur", "prof"],
    campos: [s("area", "Área", AREAS), t("t", "Título", { ancho: true }), ta("d", "Descripción"), s("modo", "Modalidad", ["Virtual", "Presencial", "En su empresa"]), t("dur", "Duración"), t("prof", "Dicta")],
  },
};

/** Pestañas de la ficha de un cliente, en orden. */
export const TABS_CLIENTE = ["empresas", "diagnosticos", "fases", "actividades", "solicitudes", "checklist", "fugas", "kpis"] as const;
