"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { porAprobar, slaSol } from "@/lib/calc";
import { AREA_LBL, fdc, pd } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

const COLS = "40px minmax(0,2.6fr) 120px 90px 90px 170px";
const TIPOS = [
  ["Consulta operativa", "Consulta operativa · 15 días"],
  ["Incidencia", "Incidencia · 30 días"],
  ["Otro", "Otro · 7 días"],
] as const;

export default function Aprobaciones() {
  const { data, ruc, de, decidir, nuevaSolicitud, toast } = useEmpresaData();
  const [tab, setTab] = useState<"aprob" | "sol" | "actas">("aprob");
  const [obs, setObs] = useState<string | null>(null);
  const [obsTxt, setObsTxt] = useState("");
  const [enviando, setEnviando] = useState(false);

  const puede = data.permiteAcciones;
  const decididas = new Set(data.decisiones.map((d) => d.clave));
  const pend = porAprobar(de(data.actividades), de(data.fases), decididas);
  const sols = de(data.solicitudes);
  const venc = sols.filter((s) => slaSol(s).venc).length;
  const claves = new Set([...de(data.actividades).map((a) => `A:${a.uid}`), ...de(data.fases).map((f) => `G:${f.area}${f.fase}`)]);
  const historial = data.decisiones.filter((d) => claves.has(d.clave));

  async function accion(clave: string, dec: "Aprobado" | "Observado", com?: string) {
    setEnviando(true);
    try { await decidir(clave, dec, com); setObs(null); setObsTxt(""); } catch { /* el aviso ya se mostró */ } finally { setEnviando(false); }
  }

  return (
    <>
      <Top
        eyebrow="Mi equipo CORE" title="Aprobaciones y solicitudes"
        sub={`Lo que su equipo CORE necesita que usted apruebe y lo que usted le pide a CORE. Su líder de cuenta: ${data.lider}.`}
      />
      <section className="grid g4">
        <div className="kpi"><span className="l" style={{ color: "#8A5200" }}>Esperan su aprobación</span><span className="v">{pend.length}</span></div>
        <div className="kpi"><span className="l">Solicitudes abiertas</span><span className="v">{sols.filter((s) => s.est === "Abierta" || s.est === "En atención").length}</span></div>
        <div className="kpi"><span className="l" style={{ color: "var(--red-tx)" }}>Vencidas</span><span className="v">{venc}</span><span className="s">Plazo calculado con la fecha de registro</span></div>
        <div className="kpi"><span className="l">Decisiones registradas</span><span className="v">{historial.length}</span></div>
      </section>

      <div className="tabs">
        {([["aprob", `Por aprobar (${pend.length})`], ["sol", `Solicitudes (${sols.length})`], ["actas", "Historial de decisiones"]] as const).map(([k, l]) => (
          <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => { setTab(k); setObs(null); }}>{l}</button>
        ))}
      </div>

      {tab === "aprob" && (
        <section className="card">
          <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
            {puede ? "Al aprobar u observar queda registrado con su usuario, fecha y hora." : "Esto es lo que su equipo CORE tiene pendiente de su aprobación. Su líder de cuenta la gestiona con usted."}
          </p>
          <div className="list">
            {!pend.length && <div className="empty">No tiene nada pendiente de aprobación.</div>}
            {pend.map((p) => (
              <div className="it" style={{ flexWrap: "wrap" }} key={p.key}>
                <span className={`pill ${p.tipo === "Cierre de fase" ? "p-navy" : "p-azul"}`}>{p.tipo}</span>
                <div className="tx"><b>{p.t}</b><span>{p.d}</span></div>
                {puede && <button className="btn warn sm" onClick={() => setObs(p.key)}>Observar</button>}
                {puede && <button className="btn ok sm" disabled={enviando} onClick={() => accion(p.key, "Aprobado")}>Aprobar</button>}
                {puede && obs === p.key && (
                  <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 8 }}>
                    <textarea className="in" rows={2} style={{ flexGrow: 1 }} placeholder="¿Qué debe corregirse?" value={obsTxt} onChange={(e) => setObsTxt(e.target.value)} />
                    <button className="btn sm" disabled={enviando} onClick={() => {
                      if (obsTxt.trim().length < 3) return toast("Escriba qué debe corregirse");
                      accion(p.key, "Observado", obsTxt.trim());
                    }}>Enviar observación</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "sol" && (
        <div className={puede ? "grid g2" : undefined}>
          <section className="card">
            <div className="hd"><h2>Solicitudes</h2></div>
            <div className="tbl">
              <div className="tr th" style={{ gridTemplateColumns: COLS }}><span>#</span><span>Solicitud</span><span>Área</span><span>Registrada</span><span>Vence</span><span>Plazo</span></div>
              {[...sols].sort((x, y) => y.n - x.n).map((s) => {
                const q = slaSol(s);
                return (
                  <div className="tr" style={{ gridTemplateColumns: COLS }} key={s.n}>
                    <span className="muted">{s.n}</span>
                    <span><b style={{ display: "block" }}>{s.sol}</b><span className="muted" style={{ fontSize: 12 }}>{s.tipo} · {s.est}</span></span>
                    <span><span className={`pill a-${s.area}`}>{s.area}</span></span>
                    <span style={{ fontSize: 12.5 }}>{fdc(pd(s.fecha))}</span>
                    <span style={{ fontSize: 12.5 }}>{fdc(q.lim)}</span>
                    <span><span className={`pill ${q.cls}`}>{q.txt}</span></span>
                  </div>
                );
              })}
              {!sols.length && <div className="empty">Aún no ha registrado solicitudes.</div>}
            </div>
          </section>
          {puede && <NuevaSolicitud key={sols.length} ruc={ruc} areas={data.areas} onSubmit={nuevaSolicitud} toast={toast} />}
        </div>
      )}

      {tab === "actas" && (
        <section className="card"><div className="list">
          {historial.length ? historial.map((d) => (
            <div className="it" key={d.clave}>
              <span className={`pill ${d.dec === "Aprobado" ? "p-solid" : "p-ambar"}`}>{d.dec}</span>
              <div className="tx">
                <b>{d.t}</b>
                <span>{new Date(d.ts).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })} · {d.por}{d.com ? ` · “${d.com}”` : ""}</span>
              </div>
            </div>
          )) : <div className="empty">Aún no hay decisiones registradas en este portal.</div>}
        </div></section>
      )}
    </>
  );
}

function NuevaSolicitud({ ruc, areas, onSubmit, toast }: {
  ruc: string; areas: string[]; toast: (m: string) => void;
  onSubmit: (v: { empresa: string; area: string; tipo: string; sol: string }) => Promise<void>;
}) {
  const [area, setArea] = useState(areas[0]);
  const [tipo, setTipo] = useState<string>(TIPOS[0][0]);
  const [sol, setSol] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      className="card" style={{ display: "flex", flexDirection: "column", gap: 12, alignSelf: "start" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (sol.trim().length < 5) return toast("Describa su solicitud");
        setEnviando(true);
        try { await onSubmit({ empresa: ruc, area, tipo, sol: sol.trim() }); } catch { /* aviso mostrado */ } finally { setEnviando(false); }
      }}
    >
      <h2>Nueva solicitud</h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="f">Área
          <select className="in" value={area} onChange={(e) => setArea(e.target.value as never)}>{areas.map((a) => <option key={a} value={a}>{AREA_LBL[a]}</option>)}</select>
        </label>
        <label className="f">Tipo
          <select className="in" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
      </div>
      <label className="f">¿Qué necesita?<textarea className="in" rows={4} required value={sol} onChange={(e) => setSol(e.target.value)} /></label>
      <span className="muted" style={{ fontSize: 12 }}>Si es trabajo fuera de su plan, su líder de cuenta le propone una adenda antes de empezar.</span>
      <button className="btn" disabled={enviando}>Registrar solicitud</button>
    </form>
  );
}
