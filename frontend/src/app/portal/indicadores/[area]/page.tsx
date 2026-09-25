"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { Top } from "@/components/PortalShell";
import { Kcard } from "@/components/Kcard";
import { AREA_LBL, COL } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

const ESTADOS: [string, string][] = [["rojo", "Atender"], ["ambar", "En riesgo"], ["verde", "En orden"], ["gris", "Por medir"]];

export default function Indicadores() {
  const { area } = useParams<{ area: string }>();
  const { data, config, ruc, diag } = useEmpresaData();
  const [subSel, setSubSel] = useState<Record<string, string>>({});

  if (!data.areas.includes(area as never)) notFound();
  const subs = config.subs[area] ?? [];
  const sub = subs.includes(subSel[area]) ? subSel[area] : subs[0];
  const d = diag(area);
  const ks = data.kpis.filter((k) => k.area === area && k.sub === sub);
  const cnt: Record<string, number> = { rojo: 0, ambar: 0, verde: 0, gris: 0 };
  ks.forEach((k) => { cnt[!k.vals[ruc] ? "gris" : k.est === "azul" ? "verde" : k.est]++; });
  const tot = ks.length || 1;
  const conDato = Math.round(((tot - cnt.gris) / tot) * 100);
  const ordenados = [...ks].sort((x, y) => (x.vals[ruc] ? 0 : 1) - (y.vals[ruc] ? 0 : 1));

  return (
    <>
      <Top
        eyebrow="Indicadores" title={AREA_LBL[area]}
        sub={`Diagnóstico del área: ${d.est.toLowerCase()} (${d.av}%) · cada indicador muestra de dónde sale su dato.`}
      />
      <div className="tabs">
        {subs.map((s) => (
          <button key={s} className={`tab${sub === s ? " on" : ""}`} onClick={() => setSubSel((m) => ({ ...m, [area]: s }))}>
            {s} <span className="muted" style={{ fontSize: 12 }}>{data.kpis.filter((k) => k.area === area && k.sub === s).length}</span>
          </button>
        ))}
      </div>

      <section className="card statusbar">
        <div className="sbar">
          {ESTADOS.map(([e, l]) => cnt[e] ? <i key={e} style={{ flex: cnt[e], background: COL[e] }} title={`${l}: ${cnt[e]}`} /> : null)}
        </div>
        <div className="leg">
          {ESTADOS.map(([e, l]) => <span key={e}><i style={{ background: COL[e] }} />{l} <b>{cnt[e]}</b></span>)}
          <span className="muted">{conDato}% con dato</span>
        </div>
      </section>

      <section className="grid g3 kgrid">
        {!ks.length && <div className="card empty" style={{ gridColumn: "1/-1" }}>Sin indicadores definidos para este tema.</div>}
        {ordenados.map((k) => <Kcard key={k.id} k={k} ruc={ruc} />)}
      </section>
    </>
  );
}
