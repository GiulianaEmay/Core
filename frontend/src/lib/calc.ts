import { HOY, addDays, daysBetween, pd, soles } from "./format";
import type { Actividad, ChecklistItem, Fase, Fuga, Palanca, ServiciosEmpresa, Solicitud } from "./types";

/* ---------------- fugas ---------------- */
export function nivelFuga(f: Fuga): [string, string] {
  if (f.est === "Cerrado") return ["verde", "Cerrada"];
  if (f.prob === "Alta" && f.monto && f.monto > 20000) return ["rojo", "Alto"];
  if (f.prob === "Alta") return ["ambar", f.monto ? "Medio" : "Alto · por valorizar"];
  if (f.monto && f.monto > 20000) return ["ambar", "Medio"];
  return ["gris", "Bajo"];
}

export function fugaSums(list: Fuga[]) {
  const ab = list.filter((x) => x.est !== "Cerrado");
  const sum = (arr: Fuga[]) => arr.reduce((s, x) => s + (x.monto || 0), 0);
  return {
    ab,
    anual: sum(ab.filter((x) => x.tipo === "Anual")),
    punt: sum(ab.filter((x) => x.tipo === "Puntual")),
    expo: sum(ab.filter((x) => x.tipo === "Exposición")),
    caja: sum(ab.filter((x) => x.tipo === "Caja")),
    porVal: ab.filter((x) => !x.monto).length,
    rec: sum(list.filter((x) => x.est === "Cerrado")),
    alto: ab.filter((x) => nivelFuga(x)[0] === "rojo").length,
  };
}

/* ---------------- ruta ---------------- */
export const faseAtrasada = (f: Fase) =>
  !!f.fin && pd(f.fin) < HOY && !["Aprobado", "No programado"].includes(f.gate);

export type PorAprobar = { key: string; tipo: string; area: string; t: string; d: string };
export function porAprobar(actividades: Actividad[], fases: Fase[], decididas: Set<string>): PorAprobar[] {
  const out: PorAprobar[] = [];
  actividades.forEach((a) => {
    if (a.est === "Por aprobar")
      out.push({ key: `A:${a.uid}`, tipo: "Entregable", area: a.area, t: a.act, d: `${a.area} · fase ${a.fase} · ${a.ent}` });
  });
  fases.forEach((f) => {
    if (f.gate === "En aprobación cliente")
      out.push({ key: `G:${f.area}${f.fase}`, tipo: "Cierre de fase", area: f.area, t: `Cierre de ${f.fase} · ${f.nom}`, d: `${f.area} · criterio: ${f.crit}` });
  });
  return out.filter((x) => !decididas.has(x.key));
}

/* ---------------- solicitudes ---------------- */
export function slaSol(s: Solicitud) {
  const lim = addDays(s.fecha, s.plazo);
  if (s.est === "Atendida" || s.est === "Cerrada")
    return { lim, txt: s.atendida ? "Atendida" : "Atendida · sin fecha registrada", cls: "p-solid", venc: false };
  const d = daysBetween(HOY, lim);
  if (d < 0) return { lim, txt: `Vencida · ${-d} días`, cls: "p-rojo", venc: true };
  if (d <= 3) return { lim, txt: `Por vencer · ${d} días`, cls: "p-ambar", venc: false };
  return { lim, txt: `En plazo · faltan ${d} días`, cls: "p-verde", venc: false };
}

/* ---------------- checklist ---------------- */
/** Un documento con envio del cliente que aun esta "Por enviar" se muestra como Enviado. */
export const chkEstado = (x: ChecklistItem) => (x.envio && x.est === "Por enviar" ? "Enviado" : x.est);

/* ---------------- Analytics: palancas de valor ---------------- */
export function levImpact(p: Palanca, x: number, km: number) {
  if (p.id === "deuda")
    return { u: (p.deuda! * (p.kd! - x)) / 100, c: 0, txt: `Tasa ${p.kd!.toFixed(1)}% → ${x.toFixed(1)}%`, need: false, mes: null as number | null };
  if (p.id === "km") {
    if (!km) return { u: 0, c: 0, txt: "Ingrese los km que recorre al mes", need: true, mes: null };
    return { u: km * 12 * (p.costo! - x), c: 0, txt: `S/ ${p.costo!.toFixed(2)} → S/ ${x.toFixed(2)} por km`, need: false, mes: null };
  }
  if (p.tipo === "utilidad") return { u: (p.base! * x) / 100, c: 0, txt: `${x}% capturado`, need: false, mes: null };
  if (p.tipo === "cajaMes") {
    const m = (p.ventas! * (p.coef! - x)) / 100;
    return { u: 0, c: m * 12, mes: m, txt: `Coeficiente ${p.coef!.toFixed(1)}% → ${x.toFixed(1)}%`, need: false };
  }
  return { u: 0, c: (p.base! * x) / 100, txt: `${x}% recuperable`, need: false, mes: null };
}

export function levCfg(p: Palanca) {
  if (p.id === "deuda") return { min: p.min ?? 0, max: p.kd!, step: 0.1, lab: "Nueva tasa anual (%)" };
  if (p.id === "km") return { min: p.ref ?? 0, max: p.costo!, step: 0.01, lab: "Costo por km objetivo (S/)" };
  if (p.tipo === "cajaMes") return { min: 0, max: p.coef!, step: 0.1, lab: "Nuevo coeficiente (%)" };
  if (p.tipo === "utilidad") return { min: 0, max: 100, step: 5, lab: "Porcentaje que se captura" };
  return { min: 0, max: 100, step: 5, lab: "Porcentaje recuperable" };
}

/* ---------------- Servicios ---------------- */
export const SERVICIOS_VACIO: ServiciosEmpresa = {
  recupera: [], noaplica: [], presta: [], fiscal: { SUNAT: [], SUNAFIL: [] },
  bench: { rubro: "", propios: [] }, sueldo: {}, hook: "",
};

const puntaje = (x: [string, string, string]) => (x[1] === "verde" ? 1 : x[1] === "ambar" ? 0.5 : 0);

export function prestaScore(sv: ServiciosEmpresa) {
  const it = sv.presta.filter((x) => x[1] !== "gris");
  const p = it.reduce((s, x) => s + puntaje(x), 0);
  return { s: it.length ? Math.round((p / it.length) * 100) : 0, n: it.length, ok: it.filter((x) => x[1] === "verde").length };
}
export function fiscalScore(sv: ServiciosEmpresa) {
  const all = [...sv.fiscal.SUNAT, ...sv.fiscal.SUNAFIL];
  if (!all.length) return 0;
  return Math.round((all.reduce((s, x) => s + puntaje(x), 0) / all.length) * 100);
}

export const SRV = [
  { id: "recupera", t: "Recupere su dinero", d: "Saldos, fondos y cobros que el Estado o sus clientes le deben.", cobro: "Pago por éxito", ic: "↩", top: true },
  { id: "sueldo", t: "¿Cuánto me puedo pagar?", d: "Lo que puede retirar este mes sin poner en riesgo la caja ni la deuda.", cobro: "Incluido en Analytics", ic: "◎", top: true },
  { id: "promo", t: "Simulador de promociones", d: "Antes de un descuento o un 2x1: cuánto más tiene que vender para no perder.", cobro: "Por uso", ic: "%", top: false },
  { id: "contrata", t: "Contrate sin sorpresas", d: "Costo real de un trabajador según su régimen, contrato y alta en planilla.", cobro: "Por contratación", ic: "+", top: false },
  { id: "presta", t: "¿Qué tan fácil es que le presten?", d: "Qué mira el banco de su empresa y el expediente listo para pedir crédito.", cobro: "Por expediente", ic: "▲", top: false },
  { id: "bench", t: "Compárese con su sector", d: "Sus indicadores frente a empresas de su rubro en la red CORE, en anónimo.", cobro: "Red CORE", ic: "≋", top: false },
  { id: "fiscal", t: "Kit ante fiscalización", d: "Si llega SUNAT o SUNAFIL: documentos, simulacro y abogado en un clic.", cobro: "Suscripción", ic: "⛨", top: false },
] as const;

export function srvHook(id: string, sv: ServiciosEmpresa): string {
  if (id === "recupera") {
    const m = sv.recupera.filter((x) => x.monto).reduce((s, x) => s + (x.monto || 0), 0);
    return m ? `Hasta ${soles(m)} identificados` : `${sv.recupera.length} fuentes por revisar`;
  }
  if (id === "presta") return `Su puntaje hoy: ${prestaScore(sv).s}/100`;
  if (id === "fiscal") return `Preparación hoy: ${fiscalScore(sv)}%`;
  if (id === "sueldo") return sv.sueldo.utilidad ? `Con su utilidad de ${soles(sv.sueldo.utilidad)} al mes` : "Se calcula con su utilidad neta";
  if (id === "bench") return `Rubro: ${sv.bench.rubro}`;
  if (id === "promo") return "Pruébelo ahora con uno de sus productos";
  if (id === "contrata") return "Calculado con la remuneración mínima vigente (S/ 1,130)";
  return "";
}

/* ---------------- calculadoras (devuelven datos, la vista los pinta) ---------------- */
export type Fila = { l: string; v: string; fuerte?: boolean; rojo?: boolean };
export type Resultado =
  | { tipo: "vacio"; msg: string }
  | { tipo: "alerta"; msg: string }
  | { tipo: "ok"; titulo: string; grande: string; unidad?: string; nota?: string; filas: Fila[]; pie?: string; barras?: [string, number, string][]; alertaExtra?: string };

export function calcSueldo(v: { u: number | null; q: number; r: number; caja: number | null; g: number; m: number }): Resultado {
  if (v.u == null) return { tipo: "vacio", msg: "Ingrese la utilidad neta del mes para calcular." };
  const a = v.u - v.q - (v.u * v.r) / 100;
  const b = v.caja == null ? null : v.caja - v.g * v.m;
  const ret = Math.max(0, b == null ? a : Math.min(a, b));
  const lim = b != null && b < a ? "la caja" : "la utilidad";
  const filas: Fila[] = [
    { l: "Utilidad neta", v: soles(v.u) },
    { l: "(−) Cuotas de deuda", v: soles(v.q) },
    { l: `(−) Reinversión ${v.r}%`, v: soles((v.u * v.r) / 100) },
    { l: "Disponible por utilidad", v: soles(Math.max(0, a)), fuerte: true },
  ];
  if (b != null) filas.push({ l: `Caja hoy − colchón de ${v.m} meses`, v: soles(Math.max(0, b)), fuerte: true });
  return {
    tipo: "ok", titulo: "Puede retirar este mes", grande: soles(ret), filas,
    pie: a <= 0
      ? "Este mes la utilidad no alcanza para retirar sin afectar la deuda o la reinversión."
      : `El límite lo pone ${lim}.${v.caja == null ? " Agregue su caja para validar que alcanza." : ""}`,
  };
}

export function calcPromo(v: { p: number | null; c: number | null; q: number | null; d: number }): Resultado {
  if (v.p == null || v.c == null || v.q == null) return { tipo: "vacio", msg: "Ingrese precio, costo y unidades para simular." };
  const m0 = v.p - v.c;
  const m1 = v.p * (1 - v.d / 100) - v.c;
  if (m0 <= 0) return { tipo: "alerta", msg: "Hoy ya vende por debajo de su costo variable: revise el precio antes de cualquier promoción." };
  if (m1 <= 0) return { tipo: "alerta", msg: `Con ${v.d}% de descuento vende a pérdida: cada unidad le cuesta ${soles(-m1 + 0.0001)} más de lo que cobra.` };
  const need = (m0 * v.q) / m1;
  const up = (need / v.q - 1) * 100;
  return {
    tipo: "ok", titulo: "Para ganar lo mismo que hoy", grande: Math.ceil(need).toLocaleString("en-US"), unidad: "unidades al mes",
    nota: `Tiene que vender ${up.toFixed(0)}% más solo para quedar igual.`,
    filas: [
      { l: "Margen por unidad hoy", v: "S/ " + m0.toFixed(2) },
      { l: "Margen por unidad con promoción", v: "S/ " + m1.toFixed(2), rojo: true },
      { l: "Ganancia bruta del mes hoy", v: soles(m0 * v.q), fuerte: true },
    ],
    barras: [["Hoy", v.q, "var(--blue)"], ["Necesarias", need, "var(--amber)"]],
    pie: "Margen de contribución: no incluye gastos fijos ni costos de publicidad de la promoción.",
  };
}

export function calcContrata(v: { s: number | null; rg: "G" | "P" | "M"; af: boolean; es: boolean }): Resultado {
  if (v.s == null) return { tipo: "vacio", msg: "Ingrese el sueldo." };
  const af = v.af ? 113 : 0;
  const rem = v.s + af;
  let grati = 0;
  let cts = 0;
  if (v.rg === "G") { grati = 2 * rem; cts = (rem * 7) / 6; }
  if (v.rg === "P") { grati = rem; cts = (0.5 * rem * 13) / 12; }
  const bon = v.es ? grati * 0.09 : 0;
  const ess = v.es ? rem * 12 * 0.09 : 0;
  const sue = rem * 12;
  const tot = sue + grati + bon + cts + ess;
  const filas: Fila[] = [{ l: `Sueldos del año${af ? " (con asignación familiar S/ 113)" : ""}`, v: soles(sue) }];
  if (grati) filas.push({ l: "Gratificaciones", v: soles(grati) });
  if (bon) filas.push({ l: "Bonificación extraordinaria 9%", v: soles(bon) });
  if (cts) filas.push({ l: "CTS", v: soles(cts) });
  if (ess) filas.push({ l: "EsSalud 9%", v: soles(ess) });
  filas.push({ l: "Total al año", v: soles(tot), fuerte: true });
  return {
    tipo: "ok", titulo: "Costo real para su empresa", grande: soles(tot / 12), unidad: "al mes",
    nota: `Por cada S/ 1 de sueldo, su empresa gasta S/ ${((tot / sue) * (rem / v.s)).toFixed(2)}.`,
    filas,
    alertaExtra: v.s < 1130 ? "El sueldo está por debajo de la remuneración mínima vital (S/ 1,130)." : undefined,
    pie: `Vacaciones: se pagan dentro de los 12 sueldos (${v.rg === "G" ? "30" : "15"} días). ${v.rg === "M" ? "Microempresa: gratificación y CTS no son obligatorias. " : ""}No incluye seguro Vida Ley, SCTR ni reemplazo durante vacaciones. Referencia: RMV S/ 1,130 vigente en 2026.`,
  };
}
