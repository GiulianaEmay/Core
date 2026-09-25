"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Top } from "@/components/PortalShell";
import { Ghost } from "@/components/charts";
import { Kcard } from "@/components/Kcard";
import { faseAtrasada, fugaSums, porAprobar, slaSol, chkEstado, SERVICIOS_VACIO } from "@/lib/calc";
import { AREA_LBL, soles } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

export default function Inicio() {
  const router = useRouter();
  const { data, ruc, empresa, de, diag } = useEmpresaData();
  if (!empresa) return <p className="muted">Este cliente todavía no tiene empresas cargadas.</p>;

  const fs = fugaSums(de(data.fugas));
  const sv = data.servicios[ruc] ?? SERVICIOS_VACIO;
  const home = data.kpis.filter((k) => k.home).sort((a, b) => a.home! - b.home!);
  const decididas = new Set(data.decisiones.map((d) => d.clave));
  const pend = porAprobar(de(data.actividades), de(data.fases), decididas);
  const solVenc = de(data.solicitudes).filter((s) => slaSol(s).venc);
  const fasesAtr = de(data.fases).filter(faseAtrasada);
  const docs = de(data.checklist).filter((x) => chkEstado(x) === "Por enviar");
  const chips = ([
    [pend.length, "por aprobar", "/portal/aprobaciones", "p-ambar"],
    [solVenc.length, "solicitudes vencidas", "/portal/aprobaciones", "p-rojo"],
    [fasesAtr.length, "fases fuera de fecha", "/portal/ruta", "p-rojo"],
    [docs.length, "documentos por enviar", "/portal/checklist", "p-azul"],
  ] as [number, string, string, string][]).filter((x) => x[0]);

  return (
    <>
      <Top eyebrow="Panel general" title={empresa.nombre} sub={`${data.grupo} · ${data.plan}`} />

      <section className="card diag">
        <span className="eyebrow" style={{ whiteSpace: "nowrap" }}>Diagnóstico por área</span>
        {data.areas.map((a) => {
          const d = diag(a);
          const cls = d.est === "Completo" ? "p-solid" : d.est === "Por iniciar" ? "p-gris" : "p-ambar";
          return (
            <Link key={a} href={`/portal/indicadores/${a}`} className="dg">
              <span className="row" style={{ gap: 8 }}>
                <span className={`pill a-${a}`}>{a}</span>
                <span className={`pill ${cls}`}>{d.est}</span>
              </span>
              <span className="row" style={{ gap: 8 }}>
                <span className="bar"><i style={{ width: `${d.av}%` }} /></span>
                <b style={{ fontSize: 12 }}>{d.av}%</b>
              </span>
            </Link>
          );
        })}
      </section>

      {sv.hook && (
        <Link href="/portal/servicios/recupera" className="hook">
          <span className="srvi" style={{ width: 30, height: 30, fontSize: 15 }}>↩</span>
          <span style={{ flex: 1 }}>
            <b>{sv.hook}</b>
            <span className="muted" style={{ display: "block", fontSize: 12.5 }}>Recupere su dinero · paga solo si recupera</span>
          </span>
          <b style={{ color: "var(--blue)", fontSize: 13 }}>Ver →</b>
        </Link>
      )}

      <section>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <h2 className="h2">Indicadores de valor</h2>
          <Link href="/portal/analytics" style={{ fontSize: 13, fontWeight: 600 }}>Ver Analytics →</Link>
        </div>
        <div className="grid g4 homeg">
          {home.map((k) => (
            <Kcard key={k.id} k={k} ruc={ruc} compact onOpen={() => router.push(`/portal/indicadores/${k.area}`)} />
          ))}
          {[["EVA · valor económico creado", "line"], ["ROIC frente a WACC", "bars"]].map(([t, kind]) => (
            <div key={t} className="kpi kc" role="link" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => router.push("/portal/analytics")}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="l">{t}</span><span className="pill p-navy">Analytics</span>
              </div>
              <span className="v pm">Por medir</span>
              <Ghost kind={kind as "line" | "bars"} txt="Requiere estados financieros cerrados" />
            </div>
          ))}
          <div className="kpi kc dark" role="link" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => router.push("/portal/fugas")}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="l" style={{ color: "#00D2F5" }}>Fugas de valor</span>
              {fs.alto ? <span className="pill p-rojo">{fs.alto} nivel alto</span> : null}
            </div>
            <span className="v">{fs.anual ? <>{soles(fs.anual)}<small> al año</small></> : "Por valorizar"}</span>
            <span className="s" style={{ color: "#B9C2E4" }}>
              {fs.punt ? `${soles(fs.punt)} puntuales · ` : ""}
              {fs.caja ? `${soles(fs.caja)} de caja adelantada · ` : ""}
              {fs.expo ? `${soles(fs.expo)} en exposición · ` : ""}
              {fs.porVal} por valorizar
            </span>
            <span className="s" style={{ color: "#00D2F5", fontWeight: 600 }}>Ver fugas →</span>
          </div>
        </div>
      </section>

      <div className="grid g2">
        <section className="card">
          <div className="hd" style={{ marginBottom: 8 }}><h2>Requiere su atención</h2></div>
          {chips.length > 0 && (
            <div className="chips" style={{ marginBottom: 6 }}>
              {chips.map((x) => (
                <Link key={x[1]} href={x[2]} className={`pill ${x[3]}`} style={{ textDecoration: "none", padding: "5px 10px" }}>
                  {x[0]} {x[1]}
                </Link>
              ))}
            </div>
          )}
          <div className="list">
            {pend.length ? (
              pend.slice(0, 5).map((p) => (
                <div className="it compact" key={p.key}>
                  <span className="dot d-ambar" />
                  <div className="tx"><b className="clamp1">{p.t}</b><span className="clamp1">{p.tipo} · {p.area}</span></div>
                  <Link href="/portal/aprobaciones" style={{ fontSize: 13, fontWeight: 600 }}>Revisar</Link>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: "14px 0" }}>No tiene aprobaciones pendientes.</div>
            )}
          </div>
          {pend.length > 5 && (
            <Link href="/portal/aprobaciones" className="more">Ver los {pend.length} pendientes de aprobación →</Link>
          )}
        </section>

        <section className="card">
          <div className="hd" style={{ marginBottom: 8 }}>
            <h2>Avance del plan</h2>
            <Link href="/portal/ruta" style={{ fontSize: 13, fontWeight: 600 }}>Ruta del valor →</Link>
          </div>
          {data.areas.map((a) => {
            const acts = de(data.actividades).filter((x) => x.area === a);
            const av = acts.length ? Math.round(acts.reduce((s, x) => s + x.av, 0) / acts.length) : 0;
            const atr = de(data.fases).filter((x) => x.area === a && faseAtrasada(x)).length;
            return (
              <div className="avr" key={a}>
                <span className="clamp1" style={{ fontWeight: 600, fontSize: 13 }}>{AREA_LBL[a]}</span>
                <span className="bar"><i style={{ width: `${av}%` }} /></span>
                <b style={{ fontSize: 12, textAlign: "right" }}>{acts.length ? `${av}%` : "—"}</b>
                {atr ? (
                  <span style={{ fontSize: 11.5, color: "var(--red-tx)", fontWeight: 600, textAlign: "right" }}>
                    {atr} {atr > 1 ? "fases atrasadas" : "fase atrasada"}
                  </span>
                ) : <span />}
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
