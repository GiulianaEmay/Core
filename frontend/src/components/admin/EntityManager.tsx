"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/lib/admin";
import type { Campo, Entidad } from "@/lib/adminSchemas";

type Fila = Record<string, unknown> & { id?: number };
type Valores = Record<string, string | boolean>;

const texto = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Convierte lo tipeado en el formulario al valor que espera la API. */
function aApi(c: Campo, v: string | boolean): unknown {
  if (c.tipo === "bool") return Boolean(v);
  const s = String(v ?? "").trim();
  if (c.tipo === "json") {
    if (!s) return c.vacio ?? null;
    try { return JSON.parse(s); } catch { throw new Error(`"${c.label}" no es un JSON válido`); }
  }
  if (c.tipo === "number") {
    if (!s) return c.nulo ? null : 0;
    const x = Number(s);
    if (Number.isNaN(x)) throw new Error(`"${c.label}" debe ser un número`);
    return x;
  }
  if (!s) return c.nulo || c.tipo === "empresa" ? null : "";
  return s;
}

function aForm(c: Campo, v: unknown): string | boolean {
  if (c.tipo === "bool") return Boolean(v);
  if (c.tipo === "json") return v == null ? "" : JSON.stringify(v, null, 2);
  return v == null ? "" : String(v);
}

export function EntityManager({
  def, clienteId, empresas, fijos = {}, extraAcciones,
}: {
  def: Entidad;
  clienteId?: string;
  empresas?: { codigo: string; nombre: string }[];
  /** valores que se agregan siempre al crear (ej. cliente_id) */
  fijos?: Record<string, unknown>;
  /** botones adicionales al final de cada fila */
  extraAcciones?: (fila: Fila) => React.ReactNode;
}) {
  const { api, toast } = useAdmin();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [edit, setEdit] = useState<{ fila: Fila | null } | null>(null);
  const [q, setQ] = useState("");
  const [empSel, setEmpSel] = useState("");
  const idKey = def.idKey ?? "id";

  const cargar = useCallback(async () => {
    const qs = def.porCliente && clienteId ? `?cliente_id=${clienteId}` : "";
    setFilas(await api<Fila[]>(`/admin/${def.entidad}${qs}`));
  }, [api, def, clienteId]);

  useEffect(() => { cargar().catch((e) => toast(e.message)); }, [cargar, toast]);

  const visibles = useMemo(() => {
    const ql = q.toLowerCase();
    return (filas ?? []).filter(
      (f) => (!empSel || f.empresa_codigo === empSel) && (!ql || JSON.stringify(f).toLowerCase().includes(ql))
    );
  }, [filas, q, empSel]);

  async function borrar(f: Fila) {
    if (!confirm("¿Borrar este registro? Esta acción no se puede deshacer.")) return;
    try {
      await api(`/admin/${def.entidad}/${encodeURIComponent(String(f[idKey]))}`, { method: "DELETE" });
      toast("Registro borrado");
      await cargar();
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo borrar"); }
  }

  const tieneEmpresa = def.campos.some((c) => c.k === "empresa_codigo");

  return (
    <section className="card">
      <div className="hd">
        <div>
          <h2>{def.titulo}</h2>
          {def.ayuda && <span className="muted mini" style={{ display: "block", marginTop: 2 }}>{def.ayuda}</span>}
        </div>
        <div className="row">
          {tieneEmpresa && empresas && empresas.length > 1 && (
            <select className="in" style={{ height: 38 }} value={empSel} onChange={(e) => setEmpSel(e.target.value)}>
              <option value="">Todas las empresas</option>
              {empresas.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo}</option>)}
            </select>
          )}
          <input className="in" style={{ height: 38, width: 200 }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn sm" onClick={() => setEdit({ fila: null })}>+ Nuevo</button>
        </div>
      </div>

      {filas === null ? <p className="muted">Cargando…</p> : (
        <div className="tbl-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{def.columnas.map((c) => {
                const campo = def.campos.find((x) => x.k === c);
                return <th key={c} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--mut)" }}>{campo?.label ?? c}</th>;
              })}<th /></tr>
            </thead>
            <tbody>
              {visibles.map((f, i) => (
                <tr key={String(f[idKey] ?? i)} style={{ borderTop: "1px solid var(--line3)" }}>
                  {def.columnas.map((c) => {
                    const v = f[c];
                    const s = typeof v === "boolean" ? (v ? "Sí" : "No") : texto(v);
                    return <td key={c} style={{ padding: "8px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s}>{s || "—"}</td>;
                  })}
                  <td style={{ padding: "8px", whiteSpace: "nowrap", textAlign: "right" }}>
                    <span className="rowact" style={{ justifyContent: "flex-end" }}>
                      {extraAcciones?.(f)}
                      <button className="btn line sm" onClick={() => setEdit({ fila: f })}>Editar</button>
                      <button className="btn warn sm" onClick={() => borrar(f)}>Borrar</button>
                    </span>
                  </td>
                </tr>
              ))}
              {!visibles.length && <tr><td colSpan={def.columnas.length + 1} className="empty">Sin registros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div className="muted mini" style={{ marginTop: 8 }}>{visibles.length} de {filas?.length ?? 0} registros</div>

      {edit && (
        <Formulario
          def={def} fila={edit.fila} empresas={empresas ?? []} fijos={fijos}
          onCerrar={() => setEdit(null)}
          onGuardado={async () => { setEdit(null); toast("Guardado"); await cargar(); }}
        />
      )}
    </section>
  );
}

function Formulario({ def, fila, empresas, fijos, onCerrar, onGuardado }: {
  def: Entidad; fila: Fila | null; empresas: { codigo: string; nombre: string }[]; fijos: Record<string, unknown>;
  onCerrar: () => void; onGuardado: () => Promise<void>;
}) {
  const { api } = useAdmin();
  const editando = fila !== null;
  const idKey = def.idKey ?? "id";
  const [v, setV] = useState<Valores>(() =>
    Object.fromEntries(def.campos.map((c) => [c.k, aForm(c, fila ? fila[c.k] : c.tipo === "empresa" && !c.nulo ? empresas[0]?.codigo : undefined)]))
  );
  // Indicadores: valor por empresa (texto mostrado, número para la gráfica, texto secundario)
  type Vpe = Record<string, { val: string; num: string; sub2x: string }>;
  const [vpe, setVpe] = useState<Vpe>(() => {
    const vals = (fila?.vals ?? {}) as Record<string, string>;
    const nums = (fila?.num ?? {}) as Record<string, number>;
    const sub = (fila?.sub2x ?? {}) as Record<string, string>;
    return Object.fromEntries(empresas.map((e) => [e.codigo, { val: vals[e.codigo] ?? "", num: nums[e.codigo] != null ? String(nums[e.codigo]) : "", sub2x: sub[e.codigo] ?? "" }]));
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const body: Record<string, unknown> = editando ? {} : { ...fijos };
      for (const c of def.campos) {
        if (c.tipo === "valores") {
          const vals: Record<string, string> = {};
          const nums: Record<string, number> = {};
          const sub2x: Record<string, string> = {};
          for (const [cod, x] of Object.entries(vpe)) {
            if (!x.val.trim()) continue;
            vals[cod] = x.val.trim();
            if (x.num.trim()) {
              const n = Number(x.num);
              if (Number.isNaN(n)) throw new Error(`El número de ${cod} no es válido`);
              nums[cod] = n;
            }
            if (x.sub2x.trim()) sub2x[cod] = x.sub2x.trim();
          }
          Object.assign(body, { vals, num: nums, sub2x });
          continue;
        }
        if (editando && c.soloCrear) continue;
        body[c.k] = aApi(c, v[c.k]);
      }
      if (editando) await api(`/admin/${def.entidad}/${encodeURIComponent(String(fila![idKey]))}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api(`/admin/${def.entidad}`, { method: "POST", body: JSON.stringify(body) });
      await onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally { setGuardando(false); }
  }

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" onSubmit={guardar}>
        <h2>{editando ? "Editar" : "Nuevo"} · {def.titulo}</h2>
        <div className="form-grid">
          {def.campos.map((c) => {
            const bloqueado = editando && c.soloCrear;
            const set = (val: string | boolean) => setV((cur) => ({ ...cur, [c.k]: val }));
            if (c.tipo === "valores") {
              return (
                <div key={c.k} style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
                  <b style={{ fontSize: 13 }}>{c.label}</b>
                  {!empresas.length && <span className="muted mini">Este cliente aún no tiene empresas.</span>}
                  {empresas.map((em) => {
                    const x = vpe[em.codigo] ?? { val: "", num: "", sub2x: "" };
                    const upd = (k: "val" | "num" | "sub2x", s: string) => setVpe((cur) => ({ ...cur, [em.codigo]: { ...x, [k]: s } }));
                    return (
                      <div key={em.codigo} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "#FAFBFE" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{em.codigo} · {em.nombre}</div>
                        <div className="form-grid" style={{ gridTemplateColumns: "1fr 140px 2fr" }}>
                          <label className="f" style={{ fontSize: 12 }}>Se muestra<input className="in" style={{ height: 38 }} placeholder="ej. 16.2%" value={x.val} onChange={(e) => upd("val", e.target.value)} /></label>
                          <label className="f" style={{ fontSize: 12 }}>Número (gráfica)<input className="in" style={{ height: 38 }} type="number" step="any" value={x.num} onChange={(e) => upd("num", e.target.value)} /></label>
                          <label className="f" style={{ fontSize: 12 }}>Texto secundario (opcional)<input className="in" style={{ height: 38 }} value={x.sub2x} onChange={(e) => upd("sub2x", e.target.value)} /></label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            return (
              <label className="f" key={c.k} style={c.ancho ? { gridColumn: "1 / -1" } : undefined}>
                {c.tipo === "bool" ? (
                  <span className="row" style={{ gap: 8 }}>
                    <input type="checkbox" checked={Boolean(v[c.k])} onChange={(e) => set(e.target.checked)} /> {c.label}
                  </span>
                ) : (
                  <>
                    {c.label}
                    {c.tipo === "textarea" && <textarea className="in" rows={3} value={String(v[c.k])} onChange={(e) => set(e.target.value)} />}
                    {c.tipo === "json" && <textarea className="in code" value={String(v[c.k])} onChange={(e) => set(e.target.value)} spellCheck={false} />}
                    {c.tipo === "select" && (
                      <select className="in" value={String(v[c.k])} onChange={(e) => set(e.target.value)}>
                        {(c.nulo ? [""] : []).concat(c.opciones ?? []).map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                        {!(c.opciones ?? []).includes(String(v[c.k])) && v[c.k] !== "" && <option value={String(v[c.k])}>{String(v[c.k])}</option>}
                        {!c.nulo && !v[c.k] && <option value="" />}
                      </select>
                    )}
                    {c.tipo === "empresa" && (
                      <select className="in" value={String(v[c.k])} onChange={(e) => set(e.target.value)}>
                        {c.nulo && <option value="">(general)</option>}
                        {empresas.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}
                      </select>
                    )}
                    {(c.tipo === "text" || c.tipo === "number" || c.tipo === "date") && (
                      <input className="in" type={c.tipo === "text" ? "text" : c.tipo} step={c.tipo === "number" ? "any" : undefined}
                        value={String(v[c.k])} onChange={(e) => set(e.target.value)} disabled={bloqueado} />
                    )}
                  </>
                )}
                {c.ayuda && <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{c.ayuda}</span>}
              </label>
            );
          })}
        </div>
        {error && <p className="err" style={{ minHeight: 0 }}>{error}</p>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn line" onClick={onCerrar}>Cancelar</button>
          <button className="btn" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </div>
  );
}
