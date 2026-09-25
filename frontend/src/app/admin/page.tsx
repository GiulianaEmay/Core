"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CrearAccesoModal, sugerirUsuario } from "@/components/admin/Accesos";
import { useAdmin } from "@/lib/admin";
import { soles } from "@/lib/format";

type Fila = {
  id: string; grupo: string; plan: string; lider: string; permite_acciones: boolean; analytics_enabled: boolean;
  empresas: { codigo: string; nombre: string; ruc_num: string }[];
  usuarios: number; kpis: number; fugas_abiertas: number; fugas_anual: number;
  por_aprobar: number; solicitudes_abiertas: number; docs_por_enviar: number;
};

export default function AdminInicio() {
  const { api, toast } = useAdmin();
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [sinCliente, setSinCliente] = useState(0);
  const [acceso, setAcceso] = useState<Fila | null>(null);

  const cargar = useCallback(async () => {
    const [f, u] = await Promise.all([api<Fila[]>("/admin/resumen-clientes"), api<{ cliente_id: string | null; rol: string }[]>("/admin/usuarios")]);
    setFilas(f);
    setSinCliente(u.filter((x) => !x.cliente_id && x.rol === "cliente").length);
  }, [api]);
  useEffect(() => { cargar().catch((e) => toast(e.message)); }, [cargar, toast]);

  const verComo = (id: string) => {
    try { localStorage.setItem("core_cliente", id); } catch { /* sin storage */ }
    router.push("/portal");
  };
  async function cambiarModo(f: Fila) {
    try {
      await api(`/admin/clientes/${f.id}`, { method: "PATCH", body: JSON.stringify({ permite_acciones: !f.permite_acciones }) });
      toast(f.permite_acciones ? "Ahora el cliente solo consulta" : "Ahora el cliente puede aprobar, solicitar y enviar documentos");
      await cargar();
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo cambiar"); }
  }

  return (
    <>
      <header className="top">
        <div className="t"><span className="eyebrow">Equipo CORE</span><h1 className="h">Clientes</h1>
          <span className="sub">Todo lo que cargue aquí es lo que ve cada cliente en su portal. Entre a “Gestionar” para editar datos y números.</span></div>
        <Link className="btn sm" href="/admin/clientes">+ Nuevo cliente</Link>
      </header>

      {sinCliente > 0 && (
        <Link href="/admin/usuarios" className="hook" style={{ borderLeftColor: "var(--amber)" }}>
          <span style={{ flex: 1 }}><b>{sinCliente} {sinCliente > 1 ? "usuarios" : "usuario"} sin cliente asignado</b>
            <span className="muted" style={{ display: "block", fontSize: 12.5 }}>Se registraron por su cuenta y todavía no ven ningún portal.</span></span>
          <b style={{ color: "var(--blue)", fontSize: 13 }}>Asignar →</b>
        </Link>
      )}

      {!filas ? <p className="muted">Cargando clientes…</p> : !filas.length ? (
        <div className="card empty">Todavía no hay clientes. Cargue los datos base desde <Link href="/admin/importar">Importar</Link> o cree uno nuevo.</div>
      ) : (
        <section className="grid g2">
          {filas.map((f) => (
            <article className="card" key={f.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <span className="pill p-navy">{f.id}</span>
                  <h2 style={{ marginTop: 6 }}>{f.grupo}</h2>
                  <span className="muted" style={{ fontSize: 12.5 }}>{f.plan}</span>
                </div>
                <button className={`pill ${f.permite_acciones ? "p-ambar" : "p-verde"}`} style={{ border: 0, cursor: "pointer" }} onClick={() => cambiarModo(f)}
                  title="Clic para cambiar el modo del cliente">
                  {f.permite_acciones ? "Interactivo" : "Solo consulta"}
                </button>
              </div>

              <div style={{ fontSize: 12.5 }} className="muted">
                Líder: <b style={{ color: "var(--txt)" }}>{f.lider || "—"}</b> ·{" "}
                {f.empresas.map((e) => `${e.nombre}${e.ruc_num ? ` (${e.ruc_num})` : ""}`).join(" · ") || "sin empresas"}
              </div>

              <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {([
                  ["Accesos", f.usuarios], ["Indicadores", f.kpis], ["Fugas abiertas", f.fugas_abiertas],
                  ["Por aprobar", f.por_aprobar],
                ] as [string, number][]).map(([l, v]) => (
                  <div className="kpi" key={l} style={{ padding: "8px 10px" }}><span className="l" style={{ fontSize: 10 }}>{l}</span><span className="v" style={{ fontSize: 20 }}>{v}</span></div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {f.fugas_anual ? `${soles(f.fugas_anual)} al año en fugas · ` : ""}{f.solicitudes_abiertas} solicitudes abiertas · {f.docs_por_enviar} documentos por enviar
              </div>

              <div className="rowact" style={{ flexWrap: "wrap", marginTop: "auto" }}>
                <Link className="btn sm" href={`/admin/clientes/${f.id}`}>Gestionar datos</Link>
                <button className="btn line sm" onClick={() => verComo(f.id)}>Ver como cliente</button>
                <button className="btn line sm" onClick={() => setAcceso(f)}>Crear acceso</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {acceso && (
        <CrearAccesoModal
          clienteId={acceso.id} sugerido={sugerirUsuario(acceso.id, acceso.empresas)}
          onCerrar={() => setAcceso(null)} onCreado={() => cargar().catch(() => {})}
        />
      )}
    </>
  );
}
