"use client";

import { EntityManager } from "@/components/admin/EntityManager";
import { ENTIDADES } from "@/lib/adminSchemas";

export default function AdminAcademia() {
  return (
    <>
      <header className="top"><div className="t"><span className="eyebrow">Gestión</span><h1 className="h">Academia</h1>
        <span className="sub">Las capacitaciones que ven todos los clientes (según las áreas que tengan contratadas).</span></div></header>
      <EntityManager def={ENTIDADES.academia} />
    </>
  );
}
