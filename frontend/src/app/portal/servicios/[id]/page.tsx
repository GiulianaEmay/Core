"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Top } from "@/components/PortalShell";
import { Ghost, HBars, Ring } from "@/components/charts";
import {
  SERVICIOS_VACIO, SRV, calcContrata, calcPromo, calcSueldo, fiscalScore, prestaScore,
  type Resultado,
} from "@/lib/calc";
import { soles } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";
import type { ServiciosEmpresa } from "@/lib/types";

export default function ServicioDetalle() {
  const { id } = useParams<{ id: string }>();
  const { data, ruc, toggleInteres } = useEmpresaData();
  const sd = SRV.find((s) => s.id === id);
  if (!sd) notFound();
  const sv = data.servicios[ruc] ?? SERVICIOS_VACIO;
  const clave = `srv-${id}`;
  const enviada = data.intereses.includes(clave);
  const Pedir = ({ txt }: { txt?: string }) =>
    data.permiteAcciones ? (
      <button className={`btn${enviada ? " ok" : ""}`} onClick={() => toggleInteres(clave)}>
        {enviada ? "Solicitud enviada ✓" : txt || "Quiero que CORE lo gestione"}
      </button>
    ) : null;

  return (
    <>
      <Top eyebrow="Servicios CORE" title={sd.t} sub={sd.d} />
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <Link href="/portal/servicios" style={{ fontSize: 13, fontWeight: 600 }}>← Todos los servicios</Link>
        <span className="pill p-gris">Cómo se cobra: {sd.cobro}</span>
      </div>
      {id === "recupera" && <Recupera sv={sv} pedir={<Pedir txt="Quiero recuperar este dinero" />} />}
      {id === "sueldo" && <Sueldo utilidad={sv.sueldo.utilidad} />}
      {id === "promo" && <Promo />}
      {id === "contrata" && <><Contrata /><div><Pedir txt="Quiero que CORE haga la contratación" /></div></>}
      {id === "presta" && <Presta sv={sv} pedir={<Pedir txt="Quiero mi expediente de crédito" />} />}
      {id === "bench" && <Bench sv={sv} pedir={<Pedir txt="Avisarme cuando se active" />} />}
      {id === "fiscal" && <Fiscal sv={sv} pedir={<Pedir txt="Activar kit ante fiscalización" />} />}
    </>
  );
}

/* ---------- módulos con datos ---------- */
function Recupera({ sv, pedir }: { sv: ServiciosEmpresa; pedir: React.ReactNode }) {
  const conM = sv.recupera.filter((x) => x.monto);
  return (
    <>
      <section className="grid g3">
        <div className="kpi"><span className="l">Identificado con monto</span><span className="v">{conM.length ? soles(conM.reduce((s, x) => s + (x.monto || 0), 0)) : "Por medir"}</span><span className="s">{conM.length} fuentes con cifra del diagnóstico</span></div>
        <div className="kpi"><span className="l">Fuentes por revisar</span><span className="v">{sv.recupera.filter((x) => !x.monto).length}</span><span className="s">Necesitan un dato de su empresa</span></div>
        <div className="kpi dark kc"><span className="l" style={{ color: "#00D2F5" }}>Sin riesgo para usted</span><span className="v" style={{ fontSize: 20 }}>Paga solo si recupera</span><span className="s" style={{ color: "#B9C2E4" }}>CORE cobra un porcentaje de lo que efectivamente vuelve a su caja</span></div>
      </section>
      {!sv.recupera.length ? (
        <div className="card empty">Aún no hay saldos ni cobros identificados para esta empresa: se revisan en su diagnóstico financiero.</div>
      ) : (
        <section className="card"><div className="list">
          {sv.recupera.map((x) => (
            <div className="it" style={{ alignItems: "flex-start" }} key={x.n}>
              <span className={`pill ${x.est === "aplica" ? "p-verde" : "p-ambar"}`} style={{ marginTop: 2 }}>{x.est === "aplica" ? "Aplica" : "Por revisar"}</span>
              <div className="tx"><b>{x.n}</b><span>{x.nota}</span><span style={{ color: "var(--mut2)" }}>Fuente: {x.fuente}</span></div>
              <b style={{ whiteSpace: "nowrap", fontFamily: "var(--disp)", fontSize: 16 }}>{x.txt}</b>
            </div>
          ))}
        </div></section>
      )}
      {sv.noaplica.length > 0 && <div className="src" style={{ marginTop: 8 }}>No aplica a su empresa: {sv.noaplica.join(" · ")}</div>}
      <div>{pedir}</div>
    </>
  );
}

const LBL_ESTADO: Record<string, string> = { verde: "En orden", ambar: "En proceso", rojo: "Falta", gris: "Por verificar" };

function Presta({ sv, pedir }: { sv: ServiciosEmpresa; pedir: React.ReactNode }) {
  const sc = prestaScore(sv);
  return (
    <>
      <section className="grid g2">
        <div className="card"><div className="row" style={{ gap: 18 }}>
          <Ring p={sc.s} est={sc.s >= 70 ? "verde" : sc.s >= 40 ? "ambar" : "rojo"} size={110} />
          <div><h2>Puntaje de acceso a crédito</h2><span className="muted" style={{ fontSize: 13 }}>Cumple {sc.ok} de {sc.n} criterios evaluados. Cada criterio vale 1 si está en orden y 0.5 si está en proceso.</span></div>
        </div></div>
        <div className="card"><h2 style={{ marginBottom: 6 }}>Qué gana si sube el puntaje</h2><span className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>Una tasa más baja: su deuda es hoy su principal fuga de valor. CORE arma el expediente (estados financieros, flujo proyectado, garantías) y lo presenta a bancos y financieras.</span></div>
      </section>
      <section className="card"><div className="list">
        {sv.presta.map((x) => (
          <div className="it" key={x[0]}>
            <span className={`dot d-${x[1]}`} /><div className="tx"><b>{x[0]}</b><span>{x[2]}</span></div>
            <span className={`pill p-${x[1]}`}>{LBL_ESTADO[x[1]]}</span>
          </div>
        ))}
      </div></section>
      <div>{pedir}</div>
    </>
  );
}

function Bench({ sv, pedir }: { sv: ServiciosEmpresa; pedir: React.ReactNode }) {
  return (
    <>
      <section className="card lockbar">
        <div><b>Se activa con 5 empresas de su rubro en CORE.</b><span className="muted" style={{ display: "block", fontSize: 13 }}>Los datos se comparan en anónimo: nadie ve el nombre ni las cifras de otra empresa.</span></div>
        {pedir}
      </section>
      <section className="grid g3">
        {sv.bench.propios.map((p) => (
          <div className="kpi kc" key={p[0]}>
            <span className="l">{p[0]}</span><span className={`v${p[1] === "Por medir" ? " pm" : ""}`}>{p[1]}</span>
            <Ghost kind="range" txt={`Su posición frente al rubro ${sv.bench.rubro}`} />
          </div>
        ))}
      </section>
    </>
  );
}

function Fiscal({ sv, pedir }: { sv: ServiciosEmpresa; pedir: React.ReactNode }) {
  const sc = fiscalScore(sv);
  const col = (n: "SUNAT" | "SUNAFIL") => (
    <div className="card">
      <h2 style={{ marginBottom: 6 }}>{n}</h2>
      <div className="list">
        {sv.fiscal[n].map((x) => (
          <div className="it" key={x[0]}><span className={`dot d-${x[1]}`} /><div className="tx"><b>{x[0]}</b></div><span className={`pill p-${x[1]}`}>{x[2]}</span></div>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <section className="card"><div className="row" style={{ gap: 18 }}>
        <Ring p={sc} est={sc >= 70 ? "verde" : sc >= 40 ? "ambar" : "rojo"} size={96} />
        <div style={{ flex: 1 }}><h2>Preparación ante una inspección</h2><span className="muted" style={{ fontSize: 13 }}>Si hoy llegara una fiscalización, esto es lo que tiene listo. Con la suscripción, CORE le envía el kit de documentos, hace un simulacro al año y le asigna un abogado el día de la visita.</span></div>
        {pedir}
      </div></section>
      <section className="grid g2">{col("SUNAT")}{col("SUNAFIL")}</section>
    </>
  );
}

/* ---------- calculadoras ---------- */
const num = (s: string) => { const x = parseFloat(s); return isNaN(x) ? null : x; };

function Campo({ l, v, set, hint }: { l: string; v: string; set: (s: string) => void; hint?: string }) {
  return (
    <label className="f">
      {l}
      <input className="in" type="number" min={0} step="any" inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} />
      {hint && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{hint}</span>}
    </label>
  );
}

function Salida({ r }: { r: Resultado }) {
  if (r.tipo === "vacio") return <><h2>Resultado</h2><div className="empty">{r.msg}</div></>;
  if (r.tipo === "alerta") return <><h2>Resultado</h2><div className="note" style={{ background: "var(--red-bg)", color: "var(--red-tx)" }}>{r.msg}</div></>;
  return (
    <>
      <h2>{r.titulo}</h2>
      <div className="bigout">{r.grande} {r.unidad && <small>{r.unidad}</small>}</div>
      {r.nota && <div className="note" style={{ margin: "6px 0" }}>{r.nota}</div>}
      {r.filas.map((f) => (
        <div className={`orow${f.fuerte ? " st" : ""}`} key={f.l}>
          <span>{f.l}</span><b style={f.rojo ? { color: "var(--red-tx)" } : undefined}>{f.v}</b>
        </div>
      ))}
      {r.barras && <HBars rows={r.barras} unit="" />}
      {r.alertaExtra && <div className="note" style={{ background: "var(--red-bg)", color: "var(--red-tx)", marginTop: 8 }}>{r.alertaExtra}</div>}
      {r.pie && <span className="src">{r.pie}</span>}
    </>
  );
}

function Sueldo({ utilidad }: { utilidad?: number }) {
  const [u, setU] = useState(utilidad ? String(utilidad) : "");
  const [q, setQ] = useState("");
  const [r, setR] = useState("20");
  const [c, setC] = useState("");
  const [g, setG] = useState("");
  const [m, setM] = useState("2");
  const res = calcSueldo({ u: num(u), q: num(q) || 0, r: num(r) || 0, caja: num(c), g: num(g) || 0, m: num(m) || 0 });
  return (
    <>
      <section className="grid g2">
        <div className="card calc">
          <h2>Sus datos del mes</h2>
          <Campo l="Utilidad neta del mes (después de impuestos)" v={u} set={setU} hint={utilidad ? "Tomado de su diagnóstico" : "Su equipo CORE la llenará con su cierre mensual"} />
          <Campo l="Cuotas de deuda del mes (capital)" v={q} set={setQ} />
          <Campo l="Reinversión mínima (% de la utilidad)" v={r} set={setR} />
          <Campo l="Caja disponible hoy" v={c} set={setC} />
          <Campo l="Gastos fijos del mes" v={g} set={setG} />
          <Campo l="Colchón de caja (meses de gastos fijos)" v={m} set={setM} />
        </div>
        <div className="card" id="calcOut"><Salida r={res} /></div>
      </section>
      <div className="note">Simulación. El retiro se formaliza como sueldo o dividendos y cada uno tributa distinto: su equipo CORE le dice cuál conviene.</div>
    </>
  );
}

function Promo() {
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [q, setQ] = useState("");
  const [d, setD] = useState("10");
  const res = calcPromo({ p: num(p), c: num(c), q: num(q), d: num(d) || 0 });
  return (
    <section className="grid g2">
      <div className="card calc">
        <h2>Su producto y la promoción</h2>
        <Campo l="Precio de venta por unidad (S/)" v={p} set={setP} />
        <Campo l="Costo variable por unidad (S/)" v={c} set={setC} />
        <Campo l="Unidades que vende al mes" v={q} set={setQ} />
        <Campo l="Descuento de la promoción (%)" v={d} set={setD} />
      </div>
      <div className="card" id="calcOut"><Salida r={res} /></div>
    </section>
  );
}

function Contrata() {
  const [s, setS] = useState("1500");
  const [rg, setRg] = useState<"G" | "P" | "M">("G");
  const [af, setAf] = useState(false);
  const [es, setEs] = useState(true);
  const res = calcContrata({ s: num(s), rg, af, es });
  return (
    <section className="grid g2">
      <div className="card calc">
        <h2>El puesto</h2>
        <Campo l="Sueldo bruto mensual (S/)" v={s} set={setS} />
        <label className="f">Régimen laboral de su empresa
          <select className="in" value={rg} onChange={(e) => setRg(e.target.value as "G" | "P" | "M")}>
            <option value="G">General</option><option value="P">Pequeña empresa (REMYPE)</option><option value="M">Microempresa (REMYPE)</option>
          </select>
        </label>
        <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={af} onChange={(e) => setAf(e.target.checked)} /> Tiene hijos menores (asignación familiar)</label>
        <label className="row" style={{ gap: 8, fontSize: 13 }}><input type="checkbox" checked={es} onChange={(e) => setEs(e.target.checked)} /> Aporta a EsSalud (9%)</label>
        <span className="src">Si su empresa no está inscrita o perdió la vigencia en REMYPE, aplica el régimen general.</span>
      </div>
      <div className="card" id="calcOut"><Salida r={res} /></div>
    </section>
  );
}
