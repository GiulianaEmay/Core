const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

export const HOY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export const soles = (n: number) => "S/ " + Math.round(n).toLocaleString("en-US");
export const fmtM = (v: number) => (v >= 1e6 ? "S/ " + (v / 1e6).toFixed(2) + " M" : soles(v));

export function fmtN(v: number, unit?: string): string {
  if (unit === "S/") return fmtM(v);
  if (unit === "%") return v.toFixed(1) + "%";
  return String(v);
}

/** "2026-07-28" -> Date local (sin desfase de zona horaria) */
export function pd(s: string): Date {
  const p = s.slice(0, 10).split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
export const fd = (s: string | null) => {
  if (!s) return "—";
  const d = pd(s);
  return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`;
};
export const fdc = (d: Date) => `${d.getDate()} ${MES[d.getMonth()]}`;
export function addDays(s: string, n: number): Date {
  const d = pd(s);
  d.setDate(d.getDate() + n);
  return d;
}
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);
export const mesCorto = (i: number) => MES[i];

export const AREA_LBL: Record<string, string> = {
  Finanzas: "Finanzas y contabilidad",
  Operaciones: "Operaciones y tecnología",
  Legal: "Legal y patrimonio",
};
export const AREA_CH: Record<string, [string, string, string]> = {
  Finanzas: ["F", "#3A2A00", "#F2C230"],
  Operaciones: ["O", "#0E3A22", "#3FD168"],
  Legal: ["L", "#2A1A55", "#B892FF"],
};
export const COL: Record<string, string> = {
  rojo: "var(--red)", ambar: "var(--amber)", verde: "var(--green)", azul: "var(--blue)", gris: "#B9C1D9",
};
export const ESTL: Record<string, string> = {
  rojo: "Atender", ambar: "En riesgo", verde: "En orden", gris: "Por medir", azul: "Referencia",
};
export const EST_PILL: Record<string, string> = {
  Completado: "p-solid", "Por aprobar": "p-ambar", "En revisión": "p-azul", "En curso": "p-azul",
  Planificado: "p-gris", Bloqueado: "p-rojo",
};
