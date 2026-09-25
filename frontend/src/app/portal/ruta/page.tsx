"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { faseAtrasada } from "@/lib/calc";
import { AREA_LBL, EST_PILL, HOY, fd, mesCorto, pd } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";
import type { Fase } from "@/lib/types";

const COLS = "48px minmax(0,2.6fr) minmax(0,1.6fr) 130px 120px";

export default function Ruta() {
  const { data, de, diag } = useEmpresaData();
  const [area, setArea] = useState("Todas");
  const [vista, setVista] = useState<"tabla" | "gantt">("tabla");
  const [roadmap, setRoadmap] = useState(false);

  const fs = de(data.fases).filter((f) => (roadmap || f.contratada) && (area === "Todas" || f.area === area));
  const acts = de(data.actividades).filter((a) => area === "Todas" || a.area === area);
  const cnt = (e: string) => acts.filter((a) => a.est === e).length;
  const showAreas = data.areas.filter((a) => fs.some((f) => f.area === a));
  const stats: [string, number, string][] = [
    ["Actividades", acts.length, "var(--mut)"],
    ["Completadas", cnt("Completado"), "var(--green-tx)"],
    ["Por su aprobación", cnt("Por aprobar"), "#8A5200"],
    ["En curso o revisión", cnt("En curso") + cnt("En revisión"), "var(--blue)"],
    ["Planificadas", cnt("Planificado"), "var(--mut)"],
    ["Fases fuera de fecha", fs.filter(faseAtrasada).length, "var(--red-tx)"],
  ];

  return (
    <>
      <Top
        eyebrow="Ruta del valor" title="Etapas, fases y actividades de su plan"
        sub="Cada área contratada tiene su propia ruta: empieza con su diagnóstico (F0) y sigue con sus fases. El paso indica dónde está cada fase en el Método CORE."
      />
      <section className="grid g6">
        {stats.map((x) => (
          <div className="kpi" key={x[0]}><span className="l" style={{ color: x[2] }}>{x[0]}</span><span className="v">{x[1]}</span></div>
        ))}
      </section>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="chips">
          {["Todas", ...data.areas].map((a) => (
            <button key={a} className={`chipf${area === a ? " on" : ""}`} onClick={() => setArea(a)}>{a === "Todas" ? "Todas las áreas" : AREA_LBL[a]}</button>
          ))}
          <label className="chipf" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={roadmap} onChange={(e) => setRoadmap(e.target.checked)} /> Ver fases no contratadas
          </label>
        </div>
        <div className="seg">
          <button className={vista === "tabla" ? "on" : ""} onClick={() => setVista("tabla")}>Tabla</button>
          <button className={vista === "gantt" ? "on" : ""} onClick={() => setVista("gantt")}>Gantt</button>
        </div>
      </div>

      {!fs.length ? (
        <div className="card empty">Esta empresa todavía no tiene un plan contratado.</div>
      ) : vista === "tabla" ? (
        showAreas.map((a) => {
          const d = diag(a);
          return (
            <section className="card" key={a}>
              <div className="hd">
                <div className="row"><span className={`pill a-${a}`}>{a}</span><h2>{AREA_LBL[a]}</h2></div>
                <span className="muted" style={{ fontSize: 12.5 }}>Diagnóstico del área: <b>{d.est.toLowerCase()}</b> · {d.av}%</span>
              </div>
              {fs.filter((f) => f.area === a).map((f) => {
                const at = faseAtrasada(f);
                const fa = acts.filter((x) => x.area === a && x.fase === f.fase);
                const gcls = f.gate === "Aprobado" ? "p-solid" : f.gate === "En aprobación cliente" ? "p-ambar" : f.gate === "En preparación" ? "p-azul" : "p-gris";
                return (
                  <div className="fase" key={f.fase}>
                    <div className="fh">
                      <b>{f.fase} · {f.nom}</b>
                      <span className="pill p-navy">Paso {f.paso}</span>
                      <span className={`pill ${gcls}`}>{f.gate === "En aprobación cliente" ? "Cierre por su aprobación" : f.gate}</span>
                      {at && <span className="pill p-rojo">Fuera de fecha</span>}
                      {!f.contratada && <span className="pill p-gris">No contratada</span>}
                      <span className="muted" style={{ marginLeft: "auto", fontSize: 12.5 }}>
                        {f.ini ? `${fd(f.ini)} → ${fd(f.fin)}` : "Sin fechas"} · avance {f.av}%
                      </span>
                    </div>
                    {fa.length ? (
                      <div className="tbl" style={{ marginTop: 6 }}>
                        <div className="tr th" style={{ gridTemplateColumns: COLS }}><span>ID</span><span>Actividad</span><span>Entregable</span><span>Avance</span><span>Estado</span></div>
                        {fa.map((x) => (
                          <div className="tr" style={{ gridTemplateColumns: COLS }} key={x.uid}>
                            <span className="muted" style={{ fontWeight: 600 }}>{x.id}</span>
                            <span style={{ fontWeight: 600 }}>
                              {x.act}
                              {x.nota && <span style={{ display: "block", fontWeight: 400, fontSize: 12, color: "var(--amber-tx)" }}>{x.nota}</span>}
                            </span>
                            <span className="muted" style={{ fontSize: 12.5 }}>{x.ent}</span>
                            <span className="row" style={{ gap: 8 }}>
                              <span className="bar"><i style={{ width: `${x.av}%`, background: x.est === "Completado" ? "var(--green)" : "var(--blue)" }} /></span>
                              <span style={{ fontSize: 12, width: 32, textAlign: "right" }}>{x.av}%</span>
                            </span>
                            <span><span className={`pill ${EST_PILL[x.est] || "p-gris"}`}>{x.est}</span></span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted" style={{ fontSize: 12.5, padding: "6px 0" }}>Criterio de cierre: {f.crit} · actividades por definir.</div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })
      ) : (
        <Gantt fs={fs} areas={showAreas} />
      )}
    </>
  );
}

function Gantt({ fs, areas }: { fs: Fase[]; areas: string[] }) {
  const fechas = fs.filter((f) => f.ini && f.fin);
  if (!fechas.length) return <div className="card empty">Las fases de este plan todavía no tienen fechas.</div>;
  let t0 = new Date(Math.min(...fechas.map((f) => pd(f.ini!).getTime()), HOY.getTime()));
  let t1 = new Date(Math.max(...fechas.map((f) => pd(f.fin!).getTime()), HOY.getTime()));
  t0 = new Date(t0.getFullYear(), t0.getMonth(), 1);
  t1 = new Date(t1.getFullYear(), t1.getMonth() + 1, 0);
  const span = t1.getTime() - t0.getTime();
  const months: string[] = [];
  for (let m = new Date(t0); m <= t1; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    months.push(mesCorto(m.getMonth()) + (m.getMonth() === 0 || months.length === 0 ? ` ${m.getFullYear()}` : ""));
  }
  const pos = (d: Date) => ((d.getTime() - t0.getTime()) / span) * 100;

  return (
    <section className="card">
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
        <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>FASE</span>
        <div className="gmonths" style={{ gridTemplateColumns: `repeat(${months.length},minmax(0,1fr))` }}>{months.map((x) => <span key={x}>{x}</span>)}</div>
      </div>
      {areas.map((a) => (
        <div key={a}>
          <div style={{ padding: "12px 0 4px" }} className="row"><span className={`pill a-${a}`}>{a}</span><b style={{ fontFamily: "var(--disp)" }}>{AREA_LBL[a]}</b></div>
          {fs.filter((f) => f.area === a).map((f) => {
            const col = f.gate === "Aprobado" ? "var(--green)" : faseAtrasada(f) ? "var(--red)" : f.gate === "En aprobación cliente" ? "var(--amber)" : "var(--blue)";
            return (
              <div key={f.fase} style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, alignItems: "center", minHeight: 36 }}>
                <span style={{ fontSize: 12.5 }}><b className="muted">{f.fase}</b> {f.nom} <span className="muted">· {f.av}%</span></span>
                <div className="gtrack">
                  {f.ini && f.fin ? (
                    <span className="gbar" style={{ left: `${pos(pd(f.ini))}%`, width: `${Math.max(1, pos(pd(f.fin)) - pos(pd(f.ini)))}%`, background: col }} />
                  ) : (
                    <span className="muted" style={{ fontSize: 11.5, position: "absolute", left: 8, top: 4 }}>Sin programar</span>
                  )}
                  <span className="gtoday" style={{ left: `${pos(HOY)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="row muted" style={{ gap: 16, fontSize: 12, paddingTop: 12, marginTop: 8, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
        <span><span className="dot d-verde" /> Cerrada</span>
        <span><span className="dot d-ambar" /> Cierre por su aprobación</span>
        <span><span className="dot d-azul" /> En curso</span>
        <span><span className="dot d-rojo" /> Fuera de fecha</span>
        <span><span style={{ display: "inline-block", width: 2, height: 12, background: "var(--red)", verticalAlign: "middle" }} /> Hoy</span>
      </div>
    </section>
  );
}
