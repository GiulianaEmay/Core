"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccesosPanel } from "@/components/admin/Accesos";
import { EntityManager } from "@/components/admin/EntityManager";
import { useAdmin } from "@/lib/admin";
import { ENTIDADES, TABS_CLIENTE } from "@/lib/adminSchemas";

type Empresa = { codigo: string; nombre: string; ruc_num: string };
const TABS = [...TABS_CLIENTE, "accesos"] as const;

export default function FichaCliente() {
  const { id } = useParams<{ id: string }>();
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("empresas");
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [grupo, setGrupo] = useState("");

  const cargarEmpresas = useCallback(
    () => api<Empresa[]>(`/admin/empresas?cliente_id=${id}`).then(setEmpresas).catch((e) => toast(e.message)),
    [api, id, toast]
  );
  useEffect(() => {
    cargarEmpresas();
    api<{ id: string; grupo: string }[]>("/admin/clientes").then((l) => setGrupo(l.find((c) => c.id === id)?.grupo ?? id)).catch(() => {});
  }, [api, id, cargarEmpresas]);

  // al cambiar de pestaña se refresca la lista de empresas (por si se creó una)
  useEffect(() => { cargarEmpresas(); }, [tab, cargarEmpresas]);

  const verComo = () => {
    try { localStorage.setItem("core_cliente", id); } catch { /* sin storage */ }
    router.push("/portal");
  };
  const def = tab === "accesos" ? null : ENTIDADES[tab];

  return (
    <>
      <header className="top">
        <div className="t"><span className="eyebrow"><Link href="/admin">Clientes</Link> · {id}</span><h1 className="h">{grupo || id}</h1>
          <span className="sub">Todo lo que cargue aquí es lo que ve el cliente en su portal.</span></div>
        <button className="btn line sm" onClick={verComo}>Ver como cliente</button>
      </header>

      <div className="tabs">
        {TABS.map((k) => <button key={k} className={`tab${tab === k ? " on" : ""}`} onClick={() => setTab(k)}>{k === "accesos" ? "Accesos (usuario y clave)" : ENTIDADES[k].titulo}</button>)}
      </div>

      {empresas && !empresas.length && tab !== "empresas" && (
        <div className="note">Este cliente aún no tiene empresas. Empiece por la pestaña <b>Empresas (RUC)</b>: todo lo demás cuelga de una empresa.</div>
      )}
      {empresas && tab === "accesos" && <AccesosPanel clienteId={id} empresas={empresas} />}
      {empresas && def && (
        <EntityManager
          key={tab} def={def} clienteId={id} empresas={empresas}
          fijos={{ cliente_id: id }}
          extraAcciones={tab === "empresas" ? (f) => (
            <Link className="btn sm" href={`/admin/clientes/${id}/empresa/${String(f.codigo)}`}>Analytics y Servicios</Link>
          ) : undefined}
        />
      )}
    </>
  );
}
