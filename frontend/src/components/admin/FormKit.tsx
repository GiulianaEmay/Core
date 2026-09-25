"use client";

/** Piezas mínimas para los formularios guiados del admin (Analytics, Servicios). */

export const num = (s: string): number | undefined => {
  const x = parseFloat(s);
  return Number.isNaN(x) ? undefined : x;
};

export function Txt({ label, value, onChange, ancho, ayuda, area }: {
  label: string; value: string | undefined; onChange: (v: string) => void; ancho?: boolean; ayuda?: string; area?: boolean;
}) {
  return (
    <label className="f" style={ancho ? { gridColumn: "1 / -1" } : undefined}>
      {label}
      {area
        ? <textarea className="in" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        : <input className="in" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />}
      {ayuda && <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{ayuda}</span>}
    </label>
  );
}

export function Num({ label, value, onChange, ayuda }: {
  label: string; value: number | null | undefined; onChange: (v: number | undefined) => void; ayuda?: string;
}) {
  return (
    <label className="f">
      {label}
      <input className="in" type="number" step="any" value={value ?? ""} onChange={(e) => onChange(num(e.target.value))} />
      {ayuda && <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{ayuda}</span>}
    </label>
  );
}

export function Sel({ label, value, onChange, opciones }: {
  label: string; value: string; onChange: (v: string) => void; opciones: [string, string][];
}) {
  return (
    <label className="f">
      {label}
      <select className="in" value={value} onChange={(e) => onChange(e.target.value)}>
        {opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Lista de textos: uno por línea. */
export function Lineas({ label, value, onChange, ayuda }: { label: string; value: string[]; onChange: (v: string[]) => void; ayuda?: string }) {
  return <Txt ancho area label={label} ayuda={ayuda} value={value.join("\n")} onChange={(s) => onChange(s.split("\n").map((x) => x.trim()).filter(Boolean))} />;
}

export type ColFila = {
  k: string; label: string; tipo?: "text" | "number" | "select"; opciones?: [string, string][]; ancho?: boolean;
};

/** Lista editable de registros: cada uno es una tarjetita con sus campos, más "Quitar". */
export function Filas<T extends Record<string, unknown>>({ titulo, ayuda, items, cols, vacio, onChange }: {
  titulo: string; ayuda?: string; items: T[]; cols: ColFila[]; vacio: () => T; onChange: (v: T[]) => void;
}) {
  const set = (i: number, k: string, v: unknown) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div><b style={{ fontSize: 13 }}>{titulo}</b>{ayuda && <span className="muted" style={{ display: "block", fontSize: 11.5 }}>{ayuda}</span>}</div>
        <button type="button" className="btn line sm" onClick={() => onChange([...items, vacio()])}>+ Agregar</button>
      </div>
      {!items.length && <div className="muted mini">Sin registros.</div>}
      {items.map((it, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "#FAFBFE" }}>
          <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))" }}>
            {cols.map((c) => {
              const v = it[c.k];
              const estilo = c.ancho ? { gridColumn: "1 / -1" } : undefined;
              return (
                <label className="f" key={c.k} style={{ fontSize: 12, ...estilo }}>
                  {c.label}
                  {c.tipo === "select" ? (
                    <select className="in" style={{ height: 38 }} value={String(v ?? "")} onChange={(e) => set(i, c.k, e.target.value)}>
                      {(c.opciones ?? []).map(([ov, ol]) => <option key={ov} value={ov}>{ol}</option>)}
                    </select>
                  ) : c.tipo === "number" ? (
                    <input className="in" style={{ height: 38 }} type="number" step="any" value={v == null ? "" : String(v)} onChange={(e) => set(i, c.k, num(e.target.value) ?? null)} />
                  ) : (
                    <input className="in" style={{ height: 38 }} value={String(v ?? "")} onChange={(e) => set(i, c.k, e.target.value)} />
                  )}
                </label>
              );
            })}
          </div>
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <button type="button" className="btn warn sm" style={{ height: 30 }} onClick={() => onChange(items.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Convierte entre las tuplas del JSON ([nombre, estado, texto]) y objetos editables. */
export const deTuplas = (arr: unknown[] | undefined, keys: string[]): Record<string, unknown>[] =>
  (arr ?? []).map((t) => Object.fromEntries(keys.map((k, i) => [k, (t as unknown[])[i] ?? null])));
export const aTuplas = (objs: Record<string, unknown>[], keys: string[]): unknown[][] =>
  objs.map((o) => keys.map((k) => o[k] ?? null));
