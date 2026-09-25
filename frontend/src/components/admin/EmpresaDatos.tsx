"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/admin";
import type { AnalyticsEmpresa, ServiciosEmpresa } from "@/lib/types";
import { Filas, Lineas, Num, Txt, aTuplas, deTuplas } from "./FormKit";

type Obj = Record<string, unknown>;
const SEM: [string, string][] = [["verde", "En orden (verde)"], ["ambar", "En proceso (ámbar)"], ["rojo", "Falta (rojo)"], ["gris", "Por verificar (gris)"]];

/** Quita los campos vacíos de un objeto (los numéricos opcionales no deben guardarse como null). */
const limpiar = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

function GuardarBarra({ guardando, onGuardar, onQuitar }: { guardando: boolean; onGuardar: () => void; onQuitar?: () => void }) {
  return (
    <div className="row" style={{ justifyContent: "flex-end" }}>
      {onQuitar && <button type="button" className="btn warn" onClick={onQuitar}>Vaciar todo</button>}
      <button type="button" className="btn" disabled={guardando} onClick={onGuardar}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
    </div>
  );
}

function useGuardar(codigo: string, campo: "analytics" | "servicios") {
  const { api, toast } = useAdmin();
  const [guardando, setGuardando] = useState(false);
  return {
    guardando,
    guardar: async (valor: unknown) => {
      setGuardando(true);
      try {
        await api(`/admin/empresas/${encodeURIComponent(codigo)}`, { method: "PATCH", body: JSON.stringify({ [campo]: valor }) });
        toast("Guardado: el portal del cliente ya muestra los nuevos números");
      } catch (e) { toast(e instanceof Error ? e.message : "No se pudo guardar"); } finally { setGuardando(false); }
    },
  };
}

/* ============================== ANALYTICS ============================== */
const A0: AnalyticsEmpresa = { rubro: "", palancas: [], bloqueadas: [], bloqNota: "", rent: {}, insumos: [], deuda: 0, blindaje: [], activos: { nota: "", items: [] } };

export function AnalyticsForm({ codigo, inicial }: { codigo: string; inicial: AnalyticsEmpresa | null }) {
  const [A, setA] = useState<AnalyticsEmpresa>({ ...A0, ...(inicial ?? {}), rent: { ...(inicial?.rent ?? {}) }, activos: { ...A0.activos, ...(inicial?.activos ?? {}) } });
  const { guardando, guardar } = useGuardar(codigo, "analytics");
  const set = <K extends keyof AnalyticsEmpresa>(k: K, v: AnalyticsEmpresa[K]) => setA((a) => ({ ...a, [k]: v }));
  const rent = (k: keyof AnalyticsEmpresa["rent"], v: number | string | undefined) => setA((a) => ({ ...a, rent: { ...a.rent, [k]: v } }));

  const listo = (): AnalyticsEmpresa => ({
    ...A,
    rent: limpiar(A.rent as Obj) as AnalyticsEmpresa["rent"],
    palancas: A.palancas.map((p) => limpiar(p as unknown as Obj) as never),
  });

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2>Analytics de la empresa</h2>
        <span className="muted mini">Estos números alimentan la pantalla “Analytics de valor”: las palancas, la rentabilidad, el blindaje y la valorización se recalculan solos.</span>
      </div>

      <div className="form-grid">
        <Txt label="Rubro" value={A.rubro} onChange={(v) => set("rubro", v)} ancho />
        <Num label="Deuda financiera conocida (S/)" value={A.deuda} onChange={(v) => set("deuda", v ?? 0)} />
        <Num label="Ventas mensuales (S/)" value={A.rent.ventas_m} onChange={(v) => rent("ventas_m", v)} />
        <Num label="Margen EBITDA (%)" value={A.rent.ebitda} onChange={(v) => rent("ebitda", v)} ayuda="Sobre las ventas, ej. 16.2" />
        <Num label="Gasto financiero anual (S/)" value={A.rent.gf} onChange={(v) => rent("gf", v)} />
        <Num label="Utilidad mensual (S/)" value={A.rent.utilidad_m} onChange={(v) => rent("utilidad_m", v)} ayuda="Solo si no hay EBITDA" />
        <Txt label="Fuente de la rentabilidad (texto al pie)" value={A.rent.fuente} onChange={(v) => rent("fuente", v)} ancho />
      </div>

      <Filas
        titulo="Palancas de valor" ayuda="Cada palanca es un slider en el portal. Llene solo los campos que aplican (ej. deuda: deuda + tasa actual + tasa mínima)."
        items={A.palancas as unknown as Obj[]} vacio={() => ({ id: "", n: "", tipo: "utilidad", def: 50, nota: "" })}
        onChange={(v) => set("palancas", v as never)}
        cols={[
          { k: "id", label: "Código (deuda, km, pac…)" }, { k: "n", label: "Nombre" },
          { k: "tipo", label: "Tipo", tipo: "select", opciones: [["utilidad", "Utilidad (se repite cada año)"], ["caja", "Caja (una vez)"], ["cajaMes", "Caja mensual (pagos a cuenta)"]] },
          { k: "def", label: "Valor inicial del slider", tipo: "number" },
          { k: "base", label: "Base (S/)", tipo: "number" }, { k: "deuda", label: "Deuda (S/)", tipo: "number" },
          { k: "kd", label: "Tasa actual %", tipo: "number" }, { k: "min", label: "Tasa mínima %", tipo: "number" },
          { k: "ventas", label: "Ventas mensuales (S/)", tipo: "number" }, { k: "coef", label: "Coeficiente actual %", tipo: "number" },
          { k: "costo", label: "Costo actual por km (S/)", tipo: "number" }, { k: "ref", label: "Costo objetivo por km (S/)", tipo: "number" },
          { k: "nota", label: "Nota / fuente", ancho: true },
        ]}
      />
      <div className="form-grid">
        <Lineas label="Palancas por activar (una por línea)" value={A.bloqueadas} onChange={(v) => set("bloqueadas", v)} />
        <Txt label="Nota de las palancas por activar" area ancho value={A.bloqNota} onChange={(v) => set("bloqNota", v)} />
      </div>

      <Filas
        titulo="Blindaje patrimonial" ayuda="Puntaje 0–100 por frente: 100 en orden, 0 pendiente. El promedio es el puntaje del anillo."
        items={deTuplas(A.blindaje, ["n", "t", "s"])} vacio={() => ({ n: "", t: "", s: 0 })}
        onChange={(v) => set("blindaje", aTuplas(v, ["n", "t", "s"]) as never)}
        cols={[{ k: "n", label: "Frente" }, { k: "t", label: "Estado (texto)" }, { k: "s", label: "Puntaje 0–100", tipo: "number" }]}
      />

      <div className="form-grid">
        <Txt label="Valor de activos: nota" ancho area value={A.activos.nota} onChange={(v) => set("activos", { ...A.activos, nota: v })} />
      </div>
      <Filas
        titulo="Valor de activos: ítems" ayuda="Con puntaje se dibuja el anillo; sin puntaje se muestra solo el texto."
        items={deTuplas(A.activos.items, ["n", "t", "s"])} vacio={() => ({ n: "", t: "", s: null })}
        onChange={(v) => set("activos", { ...A.activos, items: aTuplas(v, ["n", "t", "s"]) as never })}
        cols={[{ k: "n", label: "Activo" }, { k: "t", label: "Texto" }, { k: "s", label: "Puntaje (opcional)", tipo: "number" }]}
      />

      <Filas
        titulo="Insumos para valorizar la empresa" ayuda="ok = listo, est = estimado, no = falta."
        items={deTuplas(A.insumos, ["n", "e", "t"])} vacio={() => ({ n: "", e: "no", t: "" })}
        onChange={(v) => set("insumos", aTuplas(v, ["n", "e", "t"]) as never)}
        cols={[{ k: "n", label: "Insumo" }, { k: "e", label: "Estado", tipo: "select", opciones: [["ok", "Listo"], ["est", "Estimado"], ["no", "Falta"]] }, { k: "t", label: "Valor (texto)" }]}
      />

      <GuardarBarra guardando={guardando} onGuardar={() => guardar(listo())} onQuitar={() => confirm("¿Vaciar Analytics de esta empresa?") && (setA(A0), guardar(null))} />
    </section>
  );
}

/* ============================== SERVICIOS ============================== */
const S0: ServiciosEmpresa = { recupera: [], noaplica: [], presta: [], fiscal: { SUNAT: [], SUNAFIL: [] }, bench: { rubro: "", propios: [] }, sueldo: {}, hook: "" };

export function ServiciosForm({ codigo, inicial }: { codigo: string; inicial: ServiciosEmpresa | null }) {
  const [S, setS] = useState<ServiciosEmpresa>({ ...S0, ...(inicial ?? {}), fiscal: { ...S0.fiscal, ...(inicial?.fiscal ?? {}) }, bench: { ...S0.bench, ...(inicial?.bench ?? {}) }, sueldo: { ...(inicial?.sueldo ?? {}) } });
  const { guardando, guardar } = useGuardar(codigo, "servicios");
  const TRI = ["c", "s", "t"];
  const tri = (arr: [string, string, string][]) => deTuplas(arr, TRI);
  const colsTri = [{ k: "c", label: "Criterio" }, { k: "s", label: "Estado", tipo: "select" as const, opciones: SEM }, { k: "t", label: "Detalle" }];

  const listo = (): ServiciosEmpresa => ({
    ...S,
    recupera: S.recupera.map((r) => limpiar({ ...r, monto: r.monto ?? "" }) as never),
    sueldo: limpiar(S.sueldo as Obj) as ServiciosEmpresa["sueldo"],
  });

  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2>Servicios de la empresa</h2>
        <span className="muted mini">Alimentan las 7 tarjetas de “Servicios a su medida”: dinero por recuperar, puntaje de crédito, preparación ante fiscalización, etc.</span>
      </div>

      <div className="form-grid">
        <Txt label="Aviso destacado en el Panel general (vacío = no aparece)" ancho value={S.hook} onChange={(v) => setS({ ...S, hook: v })} />
        <Num label="Utilidad neta mensual (S/) para “¿Cuánto me puedo pagar?”" value={S.sueldo.utilidad} onChange={(v) => setS({ ...S, sueldo: { utilidad: v } })} />
        <Txt label="Rubro (Compárese con su sector)" value={S.bench.rubro} onChange={(v) => setS({ ...S, bench: { ...S.bench, rubro: v } })} />
      </div>

      <Filas
        titulo="Recupere su dinero" ayuda="Aplica = ya identificado; Por revisar = falta un dato del cliente. Monto vacío = no suma."
        items={S.recupera as unknown as Obj[]} vacio={() => ({ n: "", est: "aplica", monto: null, txt: "", nota: "", fuente: "" })}
        onChange={(v) => setS({ ...S, recupera: v as never })}
        cols={[
          { k: "n", label: "Concepto" }, { k: "est", label: "Estado", tipo: "select", opciones: [["aplica", "Aplica"], ["revisar", "Por revisar"]] },
          { k: "monto", label: "Monto (S/)", tipo: "number" }, { k: "txt", label: "Texto que se muestra (ej. Hasta S/ 89,000)" },
          { k: "nota", label: "Nota", ancho: true }, { k: "fuente", label: "Fuente", ancho: true },
        ]}
      />
      <Lineas label="No aplica a esta empresa (una por línea)" value={S.noaplica} onChange={(v) => setS({ ...S, noaplica: v })} />

      <Filas titulo="¿Qué tan fácil es que le presten? (criterios del banco)" ayuda="El puntaje = 1 por criterio en orden, 0.5 en proceso, 0 falta; los grises no cuentan."
        items={tri(S.presta)} vacio={() => ({ c: "", s: "gris", t: "" })} onChange={(v) => setS({ ...S, presta: aTuplas(v, TRI) as never })} cols={colsTri} />
      <Filas titulo="Kit ante fiscalización · SUNAT" items={tri(S.fiscal.SUNAT)} vacio={() => ({ c: "", s: "gris", t: "" })}
        onChange={(v) => setS({ ...S, fiscal: { ...S.fiscal, SUNAT: aTuplas(v, TRI) as never } })} cols={colsTri} />
      <Filas titulo="Kit ante fiscalización · SUNAFIL" items={tri(S.fiscal.SUNAFIL)} vacio={() => ({ c: "", s: "gris", t: "" })}
        onChange={(v) => setS({ ...S, fiscal: { ...S.fiscal, SUNAFIL: aTuplas(v, TRI) as never } })} cols={colsTri} />
      <Filas titulo="Compárese con su sector · indicadores propios" ayuda="Texto = su valor o “Por medir”."
        items={deTuplas(S.bench.propios, ["n", "v"])} vacio={() => ({ n: "", v: "Por medir" })}
        onChange={(v) => setS({ ...S, bench: { ...S.bench, propios: aTuplas(v, ["n", "v"]) as never } })}
        cols={[{ k: "n", label: "Indicador" }, { k: "v", label: "Valor" }]} />

      <GuardarBarra guardando={guardando} onGuardar={() => guardar(listo())} onQuitar={() => confirm("¿Vaciar Servicios de esta empresa?") && (setS(S0), guardar(null))} />
    </section>
  );
}
