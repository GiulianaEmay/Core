"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";

type Decision = { id: number; cliente_id: string; clave: string; titulo: string; decision: string; comentario: string; por: string; ts: string };
type Interes = { id: number; cliente_id: string; clave: string; por: string; ts: string };

const cuando = (ts: string) => new Date(ts).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
const nombreInteres = (c: string) => (c === "analytics" ? "Activar Analytics" : c.startsWith("srv-") ? `Servicio: ${c.slice(4)}` : `Clase: ${c}`);

export default function Actividad() {
  const { api, toast } = useAdmin();
  const [dec, setDec] = useState<Decision[]>([]);
  const [int, setInt] = useState<Interes[]>([]);

  const cargar = useCallback(
    () => Promise.all([api<Decision[]>("/admin/decisiones"), api<Interes[]>("/admin/intereses")]).then(([d, i]) => { setDec(d); setInt(i); }).catch((e) => toast(e.message)),
    [api, toast]
  );
  useEffect(() => { cargar(); }, [cargar]);

  async function quitar(ruta: string, msg: string) {
    if (!confirm(msg)) return;
    try { await api(ruta, { method: "DELETE" }); await cargar(); } catch (e) { toast(e instanceof Error ? e.message : "No se pudo"); }
  }

  return (
    <>
      <header className="top"><div className="t"><span className="eyebrow">Seguimiento</span><h1 className="h">Actividad de clientes</h1>
        <span className="sub">Lo que sus clientes aprobaron u observaron y lo que pidieron a CORE.</span></div></header>

      <section className="card">
        <div className="hd"><h2>Aprobaciones y observaciones</h2></div>
        <div className="list">
          {!dec.length && <div className="empty">Todavía no hay decisiones.</div>}
          {dec.map((d) => (
            <div className="it" key={d.id}>
              <span className={`pill ${d.decision === "Aprobado" ? "p-solid" : "p-ambar"}`}>{d.decision}</span>
              <div className="tx"><b>{d.titulo}</b><span>{d.cliente_id} · {d.por} · {cuando(d.ts)}{d.comentario ? ` · “${d.comentario}”` : ""}</span></div>
              <button className="btn line sm" onClick={() => quitar(`/admin/decisiones/${d.id}`, "¿Reabrir? El item volverá a quedar pendiente para el cliente.")}>Reabrir</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="hd"><h2>Pedidos comerciales</h2><span className="muted mini">Clics en “Quiero que CORE lo gestione”, Analytics y clases</span></div>
        <div className="list">
          {!int.length && <div className="empty">Todavía no hay pedidos.</div>}
          {int.map((i) => (
            <div className="it" key={i.id}>
              <span className="pill p-azul">{i.cliente_id}</span>
              <div className="tx"><b>{nombreInteres(i.clave)}</b><span>{i.por} · {cuando(i.ts)}</span></div>
              <button className="btn line sm" onClick={() => quitar(`/admin/intereses/${i.id}`, "¿Marcar como atendido y quitarlo de la lista?")}>Atendido</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
