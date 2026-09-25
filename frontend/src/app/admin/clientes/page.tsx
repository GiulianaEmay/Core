"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EntityManager } from "@/components/admin/EntityManager";
import { useAdmin } from "@/lib/admin";
import { ENTIDADES } from "@/lib/adminSchemas";

type Cliente = { id: string; grupo: string; plan: string; lider: string };

export default function AdminClientes() {
  const { api } = useAdmin();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  useEffect(() => { api<Cliente[]>("/admin/clientes").then(setClientes).catch(() => {}); }, [api]);

  const verComo = (id: string) => {
    try { localStorage.setItem("core_cliente", id); } catch { /* sin storage */ }
    router.push("/portal");
  };

  return (
    <>
      <header className="top"><div className="t"><span className="eyebrow">Gestión</span><h1 className="h">Alta y edición de clientes</h1>
        <span className="sub">Cree un cliente nuevo o cambie sus datos generales. El contenido (indicadores, fugas, fases…) se gestiona en su ficha.</span></div></header>
      <section className="grid g3">
        {clientes.map((c) => (
          <div className="card" key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="row" style={{ justifyContent: "space-between" }}><span className="pill p-navy">{c.id}</span><span className="muted mini">{c.lider}</span></span>
            <h2>{c.grupo}</h2>
            <span className="muted" style={{ fontSize: 12.5 }}>{c.plan}</span>
            <div className="rowact" style={{ marginTop: "auto" }}>
              <Link className="btn sm" href={`/admin/clientes/${c.id}`}>Gestionar</Link>
              <button className="btn line sm" onClick={() => verComo(c.id)}>Ver como cliente</button>
            </div>
          </div>
        ))}
      </section>
      <EntityManager key={clientes.length} def={ENTIDADES.clientes} />
    </>
  );
}
