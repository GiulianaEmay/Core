"use client";

import { useState } from "react";
import { Top } from "@/components/PortalShell";
import { AREA_LBL } from "@/lib/format";
import { useEmpresaData } from "@/lib/hooks";

export default function Academia() {
  const { data, config, toggleInteres } = useEmpresaData();
  const [area, setArea] = useState("Todas");
  const clases = config.academia.filter((x) => data.areas.includes(x.area) && (area === "Todas" || x.area === area));

  return (
    <>
      <Top
        eyebrow="Academia CORE" title="Capacitaciones para su equipo"
        sub="Clases por área, ligadas a lo que se está implementando en su empresa. Programación propuesta: su líder de cuenta confirma las fechas con quienes marquen interés."
      />
      <div className="chips">
        {["Todas", ...data.areas].map((a) => (
          <button key={a} className={`chipf${area === a ? " on" : ""}`} onClick={() => setArea(a)}>{a === "Todas" ? "Todas las áreas" : AREA_LBL[a]}</button>
        ))}
      </div>
      <section className="grid g3">
        {clases.map((x) => {
          const on = data.intereses.includes(x.t);
          return (
            <article className="card" key={x.t} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className={`pill a-${x.area}`}>{x.area}</span><span className="muted" style={{ fontSize: 12 }}>{x.modo} · {x.dur}</span>
              </div>
              <b style={{ fontSize: 15.5, lineHeight: 1.3 }}>{x.t}</b>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{x.d}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>Dicta: {x.prof} · fecha por confirmar</span>
              <div style={{ flexGrow: 1 }} />
              {data.permiteAcciones && (
                <button className={`btn sm ${on ? "line" : ""}`} onClick={() => toggleInteres(x.t, "Interés registrado: su líder de cuenta le confirmará la fecha")}>
                  {on ? "Interés registrado · quitar" : "Me interesa para mi equipo"}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
