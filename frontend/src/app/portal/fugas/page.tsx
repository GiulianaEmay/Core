"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { Donut, HBars } from "@/components/charts";
import { fugaSums, nivelFuga } from "@/lib/calc";
import { AREA_LBL, COL, soles } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

const COLS = "118px minmax(0,3fr) 110px 150px 96px";
const AREA_COLOR: Record<string, string> = { Finanzas: "#E0A100", Operaciones: "#1F8F4E", Legal: "#7B55D9" };

export default function Fugas() {
  const { data, config, de } = useEmpresaData();
  const [area, setArea] = useState("Todas");
  const all = de(data.fugas).filter((f) => area === "Todas" || f.area === area);
  const fs = fugaSums(all);

  const niv: Record<string, [number, number, number]> = { rojo: [0, 0, 0], ambar: [0, 0, 0], gris: [0, 0, 0] };
  fs.ab.forEach((f) => {
    const n = nivelFuga(f)[0];
    if (!niv[n]) return;
    niv[n][0]++;
    if (f.tipo === "Anual") niv[n][1] += f.monto || 0;
    if (f.tipo === "Puntual") niv[n][2] += f.monto || 0;
  });
  const amt = (x: [number, number, number]) =>
    [x[1] ? `${soles(x[1])} al año` : "", x[2] ? `${soles(x[2])} puntual` : ""].filter(Boolean).join(" · ") || "—";
  const sumT = (tp: string, est?: string) =>
    all.filter((f) => f.tipo === tp && (!est || f.est === est)).reduce((s, f) => s + (f.monto || 0), 0);
  const areaSeg: [string, number, string][] = data.areas.map((a) => [a, fs.ab.filter((f) => f.area === a).length, AREA_COLOR[a]]);
  const orden: Record<string, number> = { rojo: 0, ambar: 1, gris: 2, verde: 3 };
  const lista = [...all].sort((x, y) => orden[nivelFuga(x)[0]] - orden[nivelFuga(y)[0]] || (y.monto || 0) - (x.monto || 0));

  return (
    <>
      <Top eyebrow="Fugas de valor" title="Fugas de valor" sub="Dónde pierde dinero o patrimonio su empresa y cuánto se ha recuperado." />
      <div className="chips">
        {["Todas", ...data.areas].map((a) => (
          <button key={a} className={`chipf${area === a ? " on" : ""}`} onClick={() => setArea(a)}>
            {a === "Todas" ? "Todas las áreas" : AREA_LBL[a]}
          </button>
        ))}
      </div>

      <section className="grid g4">
        <div className="kpi"><span className="l">Recurrentes al año</span><span className="v">{fs.anual ? soles(fs.anual) : "Por valorizar"}</span><span className="s">Se repiten cada año</span></div>
        <div className="kpi">
          <span className="l">Montos puntuales</span><span className="v">{soles(fs.punt)}</span>
          <span className="s">
            {fs.expo ? `Exposición aparte: ${soles(fs.expo)} (deuda, no pérdida)` : fs.caja ? `Caja adelantada aparte: ${soles(fs.caja)} al año (no es pérdida)` : "Saldos o cartera: no suman al anual"}
          </span>
        </div>
        <div className="kpi">
          <span className="l" style={{ color: "var(--green-tx)" }}>Recuperado o cerrado</span><span className="v">{soles(fs.rec)}</span>
          <span className="s">{all.filter((f) => f.est === "Cerrado").length} fugas cerradas</span>
        </div>
        <div className="kpi"><span className="l">Por valorizar</span><span className="v">{fs.porVal}</span><span className="s">Se cuantifican en el diagnóstico de cada área</span></div>
      </section>

      <section className="grid g3">
        <div className="card">
          <div className="hd"><h2>Por prioridad</h2><span className="muted" style={{ fontSize: 12 }}>fugas abiertas</span></div>
          {([["rojo", "Alto"], ["ambar", "Medio"], ["gris", "Bajo"]] as const).map(([k, l]) => (
            <div className="prio" key={k}>
              <span className="row" style={{ justifyContent: "space-between" }}>
                <b>{l} · {niv[k][0]}</b><span className="muted" style={{ fontSize: 12 }}>{amt(niv[k])}</span>
              </span>
              <span className="bar" style={{ height: 10 }}><i style={{ width: `${(niv[k][0] / (fs.ab.length || 1)) * 100}%`, background: COL[k] }} /></span>
            </div>
          ))}
          <span className="src">{config.regla}</span>
        </div>
        <div className="card">
          <div className="hd"><h2>Identificado frente a recuperado</h2></div>
          <span className="cmpl">Recurrentes al año</span>
          <HBars rows={[["Identificado", sumT("Anual"), "var(--red)"], ["Recuperado", sumT("Anual", "Cerrado"), "var(--green)"]]} unit="S/" />
          <span className="cmpl" style={{ marginTop: 10, display: "block" }}>Montos puntuales</span>
          <HBars rows={[["Identificado", sumT("Puntual"), "var(--red)"], ["Recuperado", sumT("Puntual", "Cerrado"), "var(--green)"]]} unit="S/" />
          <span className="src" style={{ marginTop: 10 }}>Anual y puntual se muestran por separado: no se suman. La exposición por deuda no es pérdida.</span>
        </div>
        <div className="card">
          <div className="hd"><h2>Por área</h2></div>
          <div className="row" style={{ gap: 16 }}>
            <Donut segs={areaSeg} size={124} center={[String(fs.ab.length), "abiertas"]} />
            <div className="leg" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              {areaSeg.map((s) => <span key={s[0]}><i style={{ background: s[2] }} />{s[0]} <b>{s[1]}</b></span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="hd" style={{ marginBottom: 4 }}>
          <h2>Detalle de fugas</h2>
          <span className="muted" style={{ fontSize: 12 }}>{lista.length} registros · pase el cursor para ver el tratamiento</span>
        </div>
        <div className="tbl ftbl">
          <div className="tr th" style={{ gridTemplateColumns: COLS }}><span>Nivel</span><span>Fuga</span><span>Área</span><span>En juego</span><span>Estado</span></div>
          {lista.map((f, i) => {
            const n = nivelFuga(f);
            return (
              <div key={i} className="tr" style={{ gridTemplateColumns: COLS, opacity: f.est === "Cerrado" ? 0.6 : 1 }}
                title={`${f.nota ? f.nota + " · " : ""}Tratamiento: ${f.trat}`}>
                <span><span className={`pill p-${n[0]}`}>{n[1].split(" · ")[0]}</span></span>
                <span style={{ minWidth: 0 }}>
                  <b className="clamp1">{f.fuga}</b>
                  {f.nota && <span className="clamp1" style={{ fontSize: 11.5, color: "var(--amber-tx)" }}>{f.nota}</span>}
                </span>
                <span><span className={`pill a-${f.area}`}>{f.area}</span></span>
                <span>
                  {f.monto ? <><b>{soles(f.monto)}</b> <span className="muted" style={{ fontSize: 11.5 }}>{f.tipo === "Caja" ? "caja adelantada" : f.tipo.toLowerCase()}</span></> : <span className="muted">Por valorizar</span>}
                </span>
                <span className="muted" style={{ fontSize: 12.5 }}>{f.est}</span>
              </div>
            );
          })}
        </div>
        <div className="src" style={{ marginTop: 8 }}>Fuente: {data.fuenteDatos}.</div>
      </section>
    </>
  );
}
