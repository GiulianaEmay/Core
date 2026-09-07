const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {}

export async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.detail ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Usuario = {
  id: number;
  email: string;
  nombre: string;
  rol: "admin" | "cliente";
  empresa_id: number | null;
};

export type Periodo = {
  id: number;
  empresa_id: number;
  tipo: "mensual" | "trimestral" | "anual";
  anio: number;
  mes: number | null;
};

export type LineaContabilidad = {
  clave: string;
  cuenta: string;
  signo: string;
  importe: number;
  pct_ingresos: number;
};

export type Contabilidad = {
  periodo_id: number;
  ingresos: number;
  ebitda: number;
  ebit: number;
  margen_operativo: number;
  utilidad_neta: number;
  lineas: LineaContabilidad[];
};
