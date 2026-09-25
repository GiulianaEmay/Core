"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { chkEstado } from "@/lib/calc";
import { AREA_LBL, fdc, pd } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

const COLS = "100px minmax(0,2.4fr) minmax(0,1.3fr) 100px 150px 170px";
const ESTADOS = ["Todos", "Por enviar", "Enviado", "En elaboración", "En revisión", "Completo"];

export default function Checklist() {
  const { data, de, registrarEnvio, quitarEnvio, toast } = useEmpresaData();
  const [areaSel, setAreaSel] = useState<string | null>(null);
  const [est, setEst] = useState("Por enviar");
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");

  const puede = data.permiteAcciones;
  const area = areaSel && data.areas.includes(areaSel as never) ? areaSel : data.areas[0];
  const all = de(data.checklist);
  const head = <Top eyebrow="Mi equipo CORE" title="Checklist de documentos" sub="Los documentos que CORE necesita de su empresa, por área y por responsable. Registre cada envío aquí: su equipo CORE lo revisa y lo marca como completo." />;
  if (!all.length) return <>{head}<div className="card empty">El checklist se genera cuando se aprueba el plan de trabajo.</div></>;

  const ql = q.toLowerCase();
  const lista = all.filter((x) => x.area === area && (est === "Todos" || chkEstado(x) === est) && (!ql || `${x.doc} ${x.resp} ${x.cod}`.toLowerCase().includes(ql)));
  const subs = [...new Set(lista.map((x) => x.sub))];

  const abrir = (cod: string) => { setAbierto(abierto === cod ? null : cod); setNombre(""); setUrl(""); };
  async function enviar(ruc: string, cod: string) {
    if (!nombre.trim()) return toast("Indique el nombre del documento o del archivo");
    try { await registrarEnvio(ruc, cod, nombre.trim(), url.trim()); setAbierto(null); } catch { /* aviso mostrado */ }
  }

  return (
    <>
      {head}
      <section className="grid g3">
        {data.areas.map((a) => {
          const l = all.filter((x) => x.area === a);
          const ok = l.filter((x) => chkEstado(x) === "Completo").length;
          const pen = l.filter((x) => chkEstado(x) === "Por enviar").length;
          const p = l.length ? Math.round((ok / l.length) * 100) : 0;
          return (
            <button key={a} className="card" onClick={() => setAreaSel(a)}
              style={{ textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, outline: area === a ? "2px solid var(--blue)" : undefined }}>
              <span className="row" style={{ justifyContent: "space-between" }}><span className={`pill a-${a}`}>{a}</span><span className="muted" style={{ fontSize: 12.5 }}>{l.length} documentos</span></span>
              <b>{AREA_LBL[a]}</b>
              <span className="row"><span className="bar"><i style={{ width: `${p}%`, background: "var(--green)" }} /></span><span style={{ fontSize: 12 }}>{p}%</span></span>
              <span style={{ fontSize: 12.5, color: "var(--amber-tx)", fontWeight: 600 }}>{pen} por enviar</span>
            </button>
          );
        })}
      </section>

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="chips">{ESTADOS.map((e) => <button key={e} className={`chipf${est === e ? " on" : ""}`} onClick={() => setEst(e)}>{e}</button>)}</div>
        <input className="in" placeholder="Buscar documento o responsable…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300, height: 40 }} />
      </div>

      <section className="card">
        {!lista.length && <div className="empty">No hay documentos con este filtro.</div>}
        {subs.map((s) => (
          <div key={s}>
            <div style={{ padding: "12px 0 4px", fontFamily: "var(--disp)", fontWeight: 700, fontSize: 15 }}>
              {s} <span className="muted" style={{ fontSize: 12, fontFamily: "var(--body)", fontWeight: 400 }}>{lista.filter((x) => x.sub === s).length}</span>
            </div>
            <div className="tbl">
              <div className="tr th" style={{ gridTemplateColumns: COLS }}><span>Código</span><span>Documento</span><span>Responsable en su empresa</span><span>Fecha</span><span>Estado</span><span /></div>
              {lista.filter((x) => x.sub === s).map((x) => {
                const e = chkEstado(x);
                const cls = e === "Completo" ? "p-solid" : e === "Por enviar" ? "p-ambar" : e === "Enviado" ? "p-verde" : "p-azul";
                return (
                  <div key={x.cod}>
                    <div className="tr" style={{ gridTemplateColumns: COLS }}>
                      <span className="muted" style={{ fontSize: 12 }}>{x.cod}</span>
                      <span>
                        <b style={{ display: "block" }}>{x.doc}</b>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {x.tipo}
                          {x.envio && ` · ${x.envio.nombre}${x.envio.fecha ? " · " + fdc(pd(x.envio.fecha)) : ""}`}
                          {x.envio?.url && <> · <a href={x.envio.url} target="_blank" rel="noreferrer">ver enlace</a></>}
                        </span>
                      </span>
                      <span style={{ fontSize: 12.5 }}>{x.resp}</span>
                      <span style={{ fontSize: 12.5 }}>{x.fecha ? fdc(pd(x.fecha)) : "—"}</span>
                      <span><span className={`pill ${cls}`}>{e === "Enviado" ? "Enviado · en revisión" : e}</span></span>
                      <span>
                        {puede && x.est === "Por enviar" && !x.envio && <button className="btn sm" onClick={() => abrir(x.cod)}>Registrar envío</button>}
                        {puede && x.est === "Por enviar" && x.envio && <button className="btn line sm" onClick={() => quitarEnvio(x.ruc, x.cod)}>Quitar</button>}
                      </span>
                    </div>
                    {abierto === x.cod && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0 12px" }}>
                        <input className="in" style={{ flex: "1 1 220px", height: 40 }} placeholder="Nombre del archivo o documento" value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
                        <input className="in" style={{ flex: "2 1 280px", height: 40 }} placeholder="Enlace (Drive, OneDrive…) — opcional" value={url} onChange={(ev) => setUrl(ev.target.value)} />
                        <button className="btn sm" onClick={() => enviar(x.ruc, x.cod)}>Enviar a revisión</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {puede && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Por ahora se registra el nombre del documento y, si lo tiene en Drive u otra nube, su enlace. La carga directa de archivos se habilitará con el almacenamiento definitivo.
          </p>
        )}
      </section>
    </>
  );
}
