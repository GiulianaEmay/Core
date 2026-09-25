"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";
import type { Usuario } from "@/lib/types";

export default function AdminUsuarios() {
  const { api, toast, usuario: yo } = useAdmin();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<{ id: string; grupo: string }[]>([]);

  useEffect(() => {
    Promise.all([api<Usuario[]>("/admin/usuarios"), api<{ id: string; grupo: string }[]>("/admin/clientes")])
      .then(([u, c]) => { setUsuarios(u); setClientes(c); })
      .catch((e) => toast(e.message));
  }, [api, toast]);

  async function cambiar(u: Usuario, cambios: Partial<Pick<Usuario, "rol" | "cliente_id">>) {
    try {
      const nuevo = await api<Usuario>(`/admin/usuarios/${u.id}`, { method: "PATCH", body: JSON.stringify(cambios) });
      setUsuarios((l) => l.map((x) => (x.id === u.id ? nuevo : x)));
      toast("Guardado");
    } catch (e) { toast(e instanceof Error ? e.message : "No se pudo guardar"); }
  }

  return (
    <>
      <header className="top"><div className="t"><span className="eyebrow">Gestión</span><h1 className="h">Usuarios</h1>
        <span className="sub">Quien se registra con su correo o con Google aparece aquí. Asígnele su cliente para que vea su portal.</span></div></header>
      <section className="card">
        <div className="tbl-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr>{["Correo", "Nombre", "Rol", "Cliente"].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, textTransform: "uppercase", color: "var(--mut)" }}>{h}</th>)}</tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--line3)" }}>
                  <td style={{ padding: 8 }}>{u.email}{u.id === yo?.id && <span className="pill p-gris" style={{ marginLeft: 8 }}>Usted</span>}</td>
                  <td style={{ padding: 8 }}>{u.nombre || "—"}</td>
                  <td style={{ padding: 8 }}>
                    <select className="in" style={{ height: 36 }} value={u.rol} disabled={u.id === yo?.id} onChange={(e) => cambiar(u, { rol: e.target.value as Usuario["rol"] })}>
                      <option value="cliente">Cliente</option><option value="admin">Equipo CORE (admin)</option>
                    </select>
                  </td>
                  <td style={{ padding: 8 }}>
                    <select className="in" style={{ height: 36 }} value={u.cliente_id ?? ""} onChange={(e) => e.target.value && cambiar(u, { cliente_id: e.target.value })}>
                      <option value="">— sin asignar —</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.grupo}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted mini" style={{ marginTop: 10 }}>Un usuario cliente solo ve el cliente asignado. Los admins ven todos los clientes y este panel. No puede cambiarse su propio rol.</p>
      </section>
    </>
  );
}
