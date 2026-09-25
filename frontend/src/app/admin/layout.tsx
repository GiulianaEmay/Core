"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { AdminProvider, useAdmin } from "@/lib/admin";

const NAV = [
  ["/admin", "Clientes"],
  ["/admin/clientes", "Alta y edición de clientes"],
  ["/admin/usuarios", "Usuarios"],
  ["/admin/actividad", "Actividad de clientes"],
  ["/admin/academia", "Academia"],
  ["/admin/importar", "Importar / exportar"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Frame>{children}</Frame>
    </AdminProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { estado, error, usuario, mensaje } = useAdmin();
  const { signOut } = useClerk();
  const pathname = usePathname();

  if (estado === "cargando") return <div className="app"><main className="main"><p className="muted">Cargando…</p></main></div>;
  if (estado === "error")
    return <div className="app"><main className="main"><div className="card"><h2>No pudimos cargar el panel</h2><p className="muted">{error}</p></div></main></div>;
  if (estado === "no-admin")
    return (
      <div className="app"><main className="main" style={{ maxWidth: 560, margin: "60px auto" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2>Acceso restringido</h2>
          <p className="muted">El panel de gestión es solo para el equipo CORE.</p>
          <Link className="btn" href="/portal">Ir a mi portal</Link>
        </div>
      </main></div>
    );

  return (
    <div className="app">
      <aside className="side">
        <div><div className="logo" style={{ fontSize: 22 }}>CORE</div><div className="tag" style={{ fontSize: 10.5 }}>Panel de gestión</div></div>
        <div>
          <div className="grp">GESTIÓN</div>
          {NAV.map(([href, txt]) => (
            <Link key={href} href={href} className={`nav${(href === "/admin" ? pathname === href : pathname.startsWith(href)) ? " on" : ""}`}><span>{txt}</span></Link>
          ))}
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={{ borderTop: "1px solid #1A2766", paddingTop: 10 }}>
          <div style={{ fontSize: 11.5, color: "#7F8BB8", padding: "0 12px 8px" }}>{usuario?.email}</div>
          <Link href="/portal" className="nav"><span>Ver portal del cliente</span></Link>
          <button className="nav" onClick={() => signOut({ redirectUrl: "/" })}><span>Salir</span></button>
        </div>
      </aside>
      <main className="main">{children}</main>
      {mensaje && <div className="toast" role="status">{mensaje}</div>}
    </div>
  );
}
