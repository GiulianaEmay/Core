"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";

export default function Importar() {
  const { api, toast } = useAdmin();
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; grupo: string }[]>([]);

  useEffect(() => { api<{ id: string; grupo: string }[]>("/admin/clientes").then(setClientes).catch(() => {}); }, [api]);

  async function importar() {
    let data: unknown;
    try { data = JSON.parse(texto); } catch { return toast("El texto no es un JSON válido"); }
    if (!confirm("Importar reemplaza TODO el contenido (empresas, fases, actividades, checklist, fugas, KPIs) de los clientes que vengan en el JSON. ¿Continuar?")) return;
    setCargando(true);
    try {
      const r = await api<unknown>("/admin/importar", { method: "POST", body: JSON.stringify(data) });
      setResultado(JSON.stringify(r, null, 2));
      toast("Importación completada");
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo importar"); } finally { setCargando(false); }
  }

  async function cargarBase() {
    if (!confirm("Carga los datos base del portal (Pollitos de Oro y Rapesa). Reemplaza el contenido de esos clientes si ya existen. ¿Continuar?")) return;
    setCargando(true);
    try {
      const r = await api<unknown>("/admin/importar-base", { method: "POST" });
      setResultado(JSON.stringify(r, null, 2));
      toast("Datos base cargados");
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo cargar"); } finally { setCargando(false); }
  }

  async function exportar(id: string) {
    try {
      const d = await api<unknown>(`/admin/clientes/${id}/exportar`);
      const url = URL.createObjectURL(new Blob([JSON.stringify({ clientes: { [id]: d } }, null, 1)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = `core-${id}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo exportar"); }
  }

  return (
    <>
      <header className="top"><div className="t"><span className="eyebrow">Gestión</span><h1 className="h">Importar / exportar</h1>
        <span className="sub">Cargue un cliente completo de una vez (formato del portal) o descárguelo como respaldo.</span></div></header>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2>Datos base del portal</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Carga de un clic el contenido del portal original: Grupo Pollitos de Oro y Rapesa (empresas, plan, fases, actividades,
          checklist, fugas, indicadores, Analytics y Servicios) más la Academia.
        </p>
        <div><button className="btn" disabled={cargando} onClick={cargarBase}>{cargando ? "Cargando…" : "Cargar datos base"}</button></div>
      </section>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2>Importar JSON</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Pegue el JSON o cargue un archivo. Debe tener la clave <code>clientes</code> (y opcionalmente <code>subs</code>, <code>regla</code>, <code>academia</code>).
          Por cada cliente reemplaza empresas, diagnóstico, fases, actividades, solicitudes, checklist, fugas, KPIs, Analytics y Servicios.
          No toca usuarios, decisiones ni pedidos de los clientes.
        </p>
        <input type="file" accept="application/json,.json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setTexto(await f.text()); }} />
        <textarea className="in code" style={{ minHeight: 220 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder='{"clientes": {"POL": {...}}}' spellCheck={false} />
        <div><button className="btn" disabled={cargando || !texto.trim()} onClick={importar}>{cargando ? "Importando…" : "Importar"}</button></div>
        {resultado && <pre className="code-pre">{resultado}</pre>}
      </section>

      <section className="card">
        <div className="hd"><h2>Exportar respaldo</h2></div>
        <div className="rowact" style={{ flexWrap: "wrap" }}>
          {clientes.map((c) => <button key={c.id} className="btn line sm" onClick={() => exportar(c.id)}>Descargar {c.grupo}</button>)}
          {!clientes.length && <span className="muted">Aún no hay clientes.</span>}
        </div>
      </section>
    </>
  );
}
