"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { Ghost, HBars, Ring } from "@/components/charts";
import { levCfg, levImpact } from "@/lib/calc";
import { fmtM, soles } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";
import type { AnalyticsEmpresa } from "@/lib/types";

export default function AnalyticsPage() {
  const { data, ruc, empresa, toggleInteres } = useEmpresaData();
  const R = data.analytics.porRuc[ruc];
  const enabled = data.analytics.enabled;
  const pedido = data.intereses.includes("analytics");

  return (
    <>
      <Top
        eyebrow="Analytics · Premium" title="Analytics de valor"
        sub={`Cuánto valor puede crear ${empresa?.nombre ?? "su empresa"}, de dónde sale y cuánto vale la empresa.`}
      />
      {!R ? (
        <div className="card empty">Esta empresa aún no tiene datos para Analytics.</div>
      ) : (
        <>
          {!enabled && (
            <section className="card lockbar">
              <div>
                <b>Analytics no está activo en su plan.</b>
                <span className="muted" style={{ display: "block", fontSize: 13 }}>
                  Vista previa con los datos de su diagnóstico. Actívelo para simular sus palancas de valor y valorizar su empresa.
                </span>
              </div>
              {data.permiteAcciones && (
                <button className="btn" onClick={() => toggleInteres("analytics")}>
                  {pedido ? "Solicitud enviada ✓" : "Solicitar activación"}
                </button>
              )}
            </section>
          )}
          <Cuerpo key={ruc} R={R} lock={enabled ? "" : " locked"} />
        </>
      )}
    </>
  );
}

function Cuerpo({ R, lock }: { R: AnalyticsEmpresa; lock: string }) {
  const [val, setVal] = useState<Record<string, number>>(() => Object.fromEntries(R.palancas.map((p) => [p.id, p.def])));
  const [kmTxt, setKmTxt] = useState("");
  const km = parseFloat(kmTxt) || 0;

  let U = 0;
  let Cj = 0;
  const res = R.palancas.map((p) => {
    const r = levImpact(p, val[p.id], km);
    U += r.u;
    Cj += r.c;
    return { p, r };
  });
  const top = res
    .map(({ p, r }) => [p.n, r.u || r.c, r.u ? "utilidad al año" : "caja"] as const)
    .filter((x) => x[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const rt = R.rent;
  const ok = R.insumos.filter((x) => x[1] !== "no").length;

  return (
    <>
      <section className={`card anhero${lock}`}>
        <div>
          <span className="eyebrow" style={{ color: "#00D2F5" }}>Valor que puede crear</span>
          <h2 style={{ color: "#fff", fontSize: 22, margin: "4px 0 2px" }}>Su escenario con las palancas de abajo</h2>
          <span style={{ color: "#B9C2E4", fontSize: 13 }}>Mueva cada palanca: la utilidad y la caja se calculan por separado y nunca se suman.</span>
        </div>
        <div className="anfig"><span className="l">Más utilidad al año</span><b>{U ? "+" + soles(U) : "S/ 0"}</b><span>se repite cada año</span></div>
        <div className="anfig"><span className="l">Caja que se libera</span><b>{soles(Cj)}</b><span>en los próximos 12 meses</span></div>
        <div className="anfig">
          <span className="l">Sus 3 proyectos de mayor impacto</span>
          <ol>
            {top.length ? top.map((x) => <li key={x[0]}><b>{x[0]}</b> · {soles(x[1])} {x[2]}</li>) : <li>Ajuste las palancas</li>}
          </ol>
        </div>
      </section>

      <h2 className="h2">Palancas de valor</h2>
      <section className={`grid g3${lock}`}>
        {res.map(({ p, r }) => {
          const cf = levCfg(p);
          return (
            <div key={p.id} className="kpi kc lev">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="l">{p.n}</span>
                <span className={`pill ${p.tipo === "utilidad" ? "p-azul" : "p-verde"}`}>{p.tipo === "utilidad" ? "Utilidad" : "Caja"}</span>
              </div>
              <b className="levv">{r.need ? "—" : r.u ? "+" + soles(r.u) + " al año" : r.mes != null ? soles(r.mes) + " al mes" : soles(r.c)}</b>
              <span className="s">
                {r.txt}
                {r.mes != null ? " · no es utilidad: es caja que deja de adelantar" : p.tipo === "caja" ? " · ingreso de caja por única vez" : ""}
              </span>
              {p.id === "km" && (
                <label className="f" style={{ fontSize: 12 }}>
                  Km recorridos al mes
                  <input className="in" type="number" min={0} step="any" placeholder="Ej.: su recorrido mensual" value={kmTxt} onChange={(e) => setKmTxt(e.target.value)} />
                </label>
              )}
              <label className="f" style={{ fontSize: 12 }}>
                {cf.lab}
                <input type="range" min={cf.min} max={cf.max} step={cf.step} value={val[p.id]} onChange={(e) => setVal((v) => ({ ...v, [p.id]: parseFloat(e.target.value) }))} />
              </label>
              <span className="src">{p.nota}</span>
            </div>
          );
        })}
        <div className="kpi kc" style={{ background: "#FAFBFE", borderStyle: "dashed" }}>
          <span className="l">Palancas por activar</span>
          {R.bloqueadas.map((b) => <span key={b} className="s row" style={{ gap: 8 }}><span className="dot d-gris" />{b}</span>)}
          <span className="src">{R.bloqNota}</span>
        </div>
      </section>

      <h2 className="h2">Radiografía de rentabilidad</h2>
      <section className={`grid g2${lock}`}>
        <Rentabilidad R={R} />
      </section>

      <h2 className="h2">Blindaje y activos</h2>
      <section className={`grid g2${lock}`}>
        {R.blindaje.length ? (() => {
          const bl = Math.round(R.blindaje.reduce((s, x) => s + x[2], 0) / R.blindaje.length);
          const est = bl >= 70 ? "verde" : bl >= 40 ? "ambar" : "rojo";
          return (
            <div className="card">
              <div className="hd"><h2>Blindaje patrimonial</h2><span className={`pill p-${est === "verde" ? "verde" : est === "ambar" ? "ambar" : "rojo"}`}>{bl}/100</span></div>
              <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
                <Ring p={bl} est={est} size={96} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {R.blindaje.map((x) => (
                    <span key={x[0]} className="s row" style={{ gap: 8 }}>
                      <span className={`dot d-${x[2] >= 100 ? "verde" : x[2] > 0 ? "ambar" : "rojo"}`} />
                      <span className="clamp1" style={{ flex: 1 }}>{x[0]}</span><b>{x[1]}</b>
                    </span>
                  ))}
                </div>
              </div>
              <span className="src">Promedio simple de {R.blindaje.length} frentes: 100 en orden, 0 pendiente</span>
            </div>
          );
        })() : (
          <div className="card"><h2>Blindaje patrimonial</h2><div className="empty">Pendiente de la auditoría legal de esta empresa.</div></div>
        )}
        <div className="card">
          {(() => {
            const ai = R.activos.items.find((x) => x[2] != null);
            return (
              <>
                <div className="hd"><h2>Valor de sus activos</h2><span className={`pill ${ai ? "p-rojo" : "p-gris"}`}>{ai ? "Atender" : "Por medir"}</span></div>
                {ai ? (
                  <div className="row" style={{ gap: 16 }}>
                    <Ring p={ai[2] as number} est="rojo" size={96} />
                    <span className="s" style={{ flex: 1 }}>
                      <b>{ai[0]}</b><br />{R.activos.nota}
                      {R.activos.items.filter((x) => x[2] == null).map((x) => <span key={x[0]}><br />{x[0]}: <b>{x[1]}</b></span>)}
                    </span>
                  </div>
                ) : <Ghost kind="bars" txt={R.activos.nota} />}
                <div className="note" style={{ marginTop: 10 }}>
                  <b>¿Cuándo conviene vender un activo?</b> Cuando mantenerlo (mantenimiento, depreciación y costo de la deuda que lo financia) cuesta más de lo que rinde. Se calcula activo por activo con la tasación.
                </div>
              </>
            );
          })()}
        </div>
      </section>

      <section className={`card valco${lock}`}>
        <div>
          <span className="eyebrow" style={{ color: "#00D2F5" }}>Crecer y valorizar</span>
          <h2 style={{ fontSize: 22, color: "#fff", margin: "4px 0 6px" }}>¿Cuánto vale su empresa hoy?</h2>
          <div className="formula">
            <span>Valor para los dueños</span><b>=</b><span>Valor de la empresa</span><b>−</b>
            <span>Deuda {R.deuda ? `(≈ ${fmtM(R.deuda)})` : ""}</span>
          </div>
          <p style={{ color: "#B9C2E4", fontSize: 13, lineHeight: 1.55, marginTop: 10 }}>
            Calculamos un rango por flujos descontados y múltiplos del sector. Con los mismos insumos salen el EVA y el ROIC frente al WACC: si el ROIC supera al WACC, su empresa crea valor.
          </p>
        </div>
        <div>
          <div className="row" style={{ justifyContent: "space-between", color: "#fff", marginBottom: 6 }}>
            <b>Listo para valorizar</b><b>{ok} de {R.insumos.length} insumos</b>
          </div>
          <div className="bar" style={{ height: 10, background: "#13205F" }}><i style={{ width: `${(ok / R.insumos.length) * 100}%`, background: "var(--cyan)" }} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {R.insumos.map((x) => (
              <span key={x[0]} className="row" style={{ gap: 8, color: "#D5DBF2", fontSize: 13 }}>
                <span className="dot" style={{ background: x[1] === "ok" ? "var(--cyan)" : x[1] === "est" ? "var(--amber)" : "#3A4787" }} />
                <span style={{ flex: 1 }}>{x[0]}</span>
                <b style={{ color: "#fff" }}>
                  {x[2] || (x[1] === "no" ? "Falta" : "")}
                  {x[1] === "est" && <span style={{ color: "var(--amber)", fontWeight: 500 }}> estimado</span>}
                </b>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Rentabilidad({ R }: { R: AnalyticsEmpresa }) {
  const rt = R.rent;
  if (rt.ebitda != null && rt.gf != null) {
    const intPct = rt.ventas_m ? (rt.gf / (rt.ventas_m * 12)) * 100 : null;
    const seg: [string, number, string][] =
      intPct != null
        ? [["Costos y gastos operativos", 100 - rt.ebitda, "#C3CAE0"], ["Intereses", intPct, "var(--red)"], ["Queda antes de depreciación e impuestos", rt.ebitda - intPct, "var(--blue)"]]
        : [["Costos y gastos operativos", 100 - rt.ebitda, "#C3CAE0"], ["Margen EBITDA", rt.ebitda, "var(--blue)"]];
    const minV = rt.gf / (rt.ebitda / 100);
    const ebA = rt.ventas_m ? rt.ventas_m * 12 * (rt.ebitda / 100) : null;
    return (
      <>
        <div className="card">
          <div className="hd"><h2>De cada S/ 100 que vende</h2>{intPct == null && <span className="pill p-gris">Intereses por medir</span>}</div>
          <div className="stk">{seg.map((x) => <i key={x[0]} style={{ flex: Math.max(x[1], 0.8), background: x[2] }} title={x[0]} />)}</div>
          <div className="leg" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 10 }}>
            {seg.map((x) => <span key={x[0]}><i style={{ background: x[2] }} />{x[0]} <b>S/ {x[1].toFixed(1)}</b></span>)}
          </div>
          <div className="note" style={{ marginTop: 10 }}>
            El margen EBITDA se mide sobre las ventas y el costo de la deuda sobre la deuda: no se comparan directamente. Lo que dice si la operación paga su deuda es la cobertura de intereses y la deuda ÷ EBITDA.
          </div>
          <span className="src">
            {intPct != null
              ? `Intereses = gasto financiero S/ ${Math.round(rt.gf).toLocaleString("en-US")} ÷ ventas estimadas S/ ${((rt.ventas_m! * 12) / 1e6).toFixed(0)} M al año`
              : "Se completa cuando tengamos las ventas de esta empresa"}
          </span>
        </div>
        <div className="card">
          <div className="hd"><h2>¿Su operación paga su deuda?</h2></div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="kpi"><span className="l">Ventas mínimas para pagar los intereses</span><span className="v">{fmtM(minV)}</span><span className="s">al año · gasto financiero ÷ margen EBITDA</span></div>
            {ebA ? (
              <>
                <div className="kpi"><span className="l">Deuda ÷ EBITDA</span><span className="v">{(R.deuda / ebA).toFixed(1)} veces</span><span className="s">años de EBITDA para pagar la deuda</span></div>
                <div className="kpi"><span className="l">Cobertura de intereses</span><span className="v">{(ebA / rt.gf).toFixed(1)} veces</span><span className="s">EBITDA ÷ gasto financiero</span></div>
                <div className="kpi"><span className="l">Holgura de ventas</span><span className="v">{Math.round((1 - minV / (rt.ventas_m! * 12)) * 100)}%</span><span className="s">cuánto pueden caer las ventas antes de no cubrir intereses</span></div>
              </>
            ) : (
              <div className="kpi"><span className="l">Costo de la deuda</span><span className="v">{R.palancas[0]?.kd ? R.palancas[0].kd!.toFixed(1) + "%" : "—"}</span><span className="s">con un margen EBITDA de {rt.ebitda}%, cada sol de deuda exige mucho volumen de venta</span></div>
            )}
          </div>
          <span className="src">{ebA ? "Estimado con las ventas del diagnóstico: se confirma con los estados financieros." : "Con las ventas de esta empresa se calculan cobertura y deuda ÷ EBITDA."}</span>
        </div>
      </>
    );
  }
  if (rt.utilidad_m) {
    const ua = rt.utilidad_m * 12;
    return (
      <>
        <div className="card">
          <div className="hd"><h2>Utilidad frente a deuda</h2></div>
          <HBars rows={[["Utilidad del año", ua, "var(--blue)"], ["Deuda conocida", R.deuda, "var(--red)"]]} unit="S/" />
          <div className="note" style={{ marginTop: 10 }}>Pagar toda la deuda conocida tomaría <b>{(R.deuda / ua).toFixed(1)} años</b> de utilidad completa.</div>
          {rt.fuente && <span className="src">{rt.fuente}</span>}
        </div>
        <div className="card">
          <div className="hd"><h2>Lo que falta medir</h2></div>
          <span className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>Margen EBITDA, costo real de la deuda y cobertura de intereses. Con el diagnóstico financiero se completa esta radiografía.</span>
          <Ghost kind="bars" txt="Se activa con sus estados financieros" />
        </div>
      </>
    );
  }
  return <div className="card empty">Sin datos de rentabilidad para esta empresa todavía.</div>;
}
