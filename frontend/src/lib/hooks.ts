"use client";

import { useCliente } from "./portal";
import type { Diag } from "./types";

/** Datos del cliente filtrados por la empresa (RUC) seleccionada. */
export function useEmpresaData() {
  const p = useCliente();
  const { data, ruc } = p;
  const de = <T extends { ruc: string }>(l: T[]) => l.filter((x) => x.ruc === ruc);
  const diag = (area: string): Diag =>
    data.diagRuc?.[ruc]?.[area] ?? data.diagnostico[area] ?? { est: "Por iniciar", av: 0, fecha: "" };
  return { ...p, de, diag };
}
