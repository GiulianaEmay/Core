"use client";

import Link from "next/link";
import { Top } from "@/components/PortalShell";
import { SERVICIOS_VACIO, SRV, srvHook } from "@/lib/calc";
import { useEmpresaData } from "@/lib/hooks";

export default function Servicios() {
  const { data, ruc } = useEmpresaData();
  const sv = data.servicios[ruc] ?? SERVICIOS_VACIO;
  return (
    <>
      <Top
        eyebrow="Servicios CORE" title="Servicios a la medida de su empresa"
        sub="Solo le mostramos los servicios que aplican a su RUC y a su rubro, con lo que ya sabemos de su diagnóstico."
      />
      <section className="grid g3">
        {SRV.map((s) => (
          <Link key={s.id} href={`/portal/servicios/${s.id}`} className="card srvc">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="srvi">{s.ic}</span>
              {s.top && <span className="pill p-azul">Recomendado</span>}
            </div>
            <h2>{s.t}</h2>
            <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{s.d}</span>
            <span className="srvh">{srvHook(s.id, sv)}</span>
            <div className="row" style={{ justifyContent: "space-between", marginTop: "auto" }}>
              <span className="pill p-gris">{s.cobro}</span>
              <b style={{ color: "var(--blue)", fontSize: 13 }}>Abrir →</b>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
