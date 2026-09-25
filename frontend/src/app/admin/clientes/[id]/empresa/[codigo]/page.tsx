"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalyticsForm, ServiciosForm } from "@/components/admin/EmpresaDatos";
import { useAdmin } from "@/lib/admin";
import type { AnalyticsEmpresa, ServiciosEmpresa } from "@/lib/types";

type Empresa = { codigo: string; nombre: string; ruc_num: string; analytics: AnalyticsEmpresa | null; servicios: ServiciosEmpresa | null };

export default function DatosEmpresa() {
  const { id, codigo } = useParams<{ id: string; codigo: string }>();
  const { api, toast } = useAdmin();
  const [e, setE] = useState<Empresa | null | undefined>(undefined);
  const [tab, setTab] = useState<"analytics" | "servicios">("analytics");

  useEffect(() => {
    api<Empresa[]>(`/admin/empresas?cliente_id=${id}`).then((l) => setE(l.find((x) => x.codigo === codigo) ?? null)).catch((er) => toast(er.message));
  }, [api, id, codigo, toast]);

  return (
    <>
      <header className="top"><div className="t">
        <span className="eyebrow"><Link href="/admin">Clientes</Link> · <Link href={`/admin/clientes/${id}`}>{id}</Link> · {codigo}</span>
        <h1 className="h">{e ? e.nombre : codigo}</h1>
        <span className="sub">Números de Analytics y Servicios. Al guardar, el portal del cliente se actualiza con estas cifras.</span>
      </div></header>
      <div className="tabs">
        <button className={`tab${tab === "analytics" ? " on" : ""}`} onClick={() => setTab("analytics")}>Analytics de valor</button>
        <button className={`tab${tab === "servicios" ? " on" : ""}`} onClick={() => setTab("servicios")}>Servicios</button>
      </div>
      {e === undefined && <p className="muted">Cargando…</p>}
      {e === null && <div className="card empty">No existe la empresa {codigo} en este cliente.</div>}
      {e && tab === "analytics" && <AnalyticsForm key="a" codigo={codigo} inicial={e.analytics} />}
      {e && tab === "servicios" && <ServiciosForm key="s" codigo={codigo} inicial={e.servicios} />}
    </>
  );
}
