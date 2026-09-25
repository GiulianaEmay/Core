"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { AREA_CH, AREA_LBL, fdc, HOY } from "@/lib/format";
import { PortalProvider, usePortal } from "@/lib/portal";
import { IAcad, IAdmin, IChart, IChk, IFuga, IHome, IMenu, IOk, IOut, IRuta, IServ } from "./icons";

const ShellCtx = createContext<{ toggle: () => void }>({ toggle: () => {} });

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <Frame>{children}</Frame>
    </PortalProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const { estado, error, usuario, mensaje } = usePortal();
  const { signOut } = useClerk();
  const [oculto, setOculto] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try { setOculto(localStorage.getItem("core_side") === "0"); } catch { /* sin storage */ }
  }, []);
  useEffect(() => setAbierto(false), [pathname]);

  const toggle = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 860) return setAbierto((v) => !v);
    setOculto((v) => {
      try { localStorage.setItem("core_side", v ? "1" : "0"); } catch { /* sin storage */ }
      return !v;
    });
  };

  if (estado === "cargando") {
    return <div className="app"><main className="main"><p className="muted">Cargando su portal…</p></main></div>;
  }
  if (estado === "error") {
    return (
      <div className="app"><main className="main">
        <div className="card"><h2>No pudimos cargar el portal</h2><p className="muted" style={{ margin: "8px 0 14px" }}>{error}</p>
          <button className="btn" onClick={() => location.reload()}>Reintentar</button></div>
      </main></div>
    );
  }
  if (estado === "sin-cliente") {
    return (
      <div className="app"><main className="main" style={{ maxWidth: 640, margin: "60px auto" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="logo" style={{ color: "var(--navy)", fontSize: 20 }}>CORE</div>
          <h2>Su usuario todavía no está vinculado a una empresa</h2>
          <p className="muted">
            Ingresó como <b>{usuario?.email}</b>. Su líder de cuenta CORE debe asignarle su grupo de empresas; en cuanto
            lo haga, esta pantalla mostrará su portal.
          </p>
          {usuario?.rol === "admin" && <Link className="btn" href="/admin">Ir al panel de gestión</Link>}
          <button className="btn line" onClick={() => signOut({ redirectUrl: "/" })}>Salir</button>
        </div>
      </main></div>
    );
  }

  return (
    <ShellCtx.Provider value={{ toggle }}>
      <div className={`app${oculto ? " nos" : ""}`}>
        <Sidebar abierto={abierto} />
        <main className="main">{children}</main>
      </div>
      {mensaje && <div className="toast" role="status">{mensaje}</div>}
    </ShellCtx.Provider>
  );
}

function NavLink({ href, icon, txt, badge, red, lk }: { href: string; icon?: React.ReactNode; txt: string; badge?: number; red?: boolean; lk?: string }) {
  const pathname = usePathname();
  const on = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
  return (
    <Link href={href} className={`nav${on ? " on" : ""}`}>
      {icon}
      <span>{txt}</span>
      {badge ? <span className={`b${red ? " r" : ""}`}>{badge}</span> : null}
      {lk ? <span className="lk">{lk}</span> : null}
    </Link>
  );
}

function Sidebar({ abierto }: { abierto: boolean }) {
  const { data, usuario, clientes, clienteId, setClienteId, pendientesAprobar, docsPendientes } = usePortal();
  const { signOut } = useClerk();
  const { toggle } = useContext(ShellCtx);
  if (!data) return null;
  const iniciales = data.grupo.replace("Grupo ", "").slice(0, 2).toUpperCase();

  return (
    <aside className={`side${abierto ? " open" : ""}`} id="side">
      <div className="row" style={{ padding: "0 4px 0 10px", alignItems: "flex-start" }}>
        <div>
          <div className="logo" style={{ fontSize: 22 }}>CORE</div>
          <div className="tag" style={{ fontSize: 10.5 }}>Creación de Valor para Empresas</div>
        </div>
        <button className="x" onClick={toggle} aria-label="Ocultar menú" title="Ocultar menú">«</button>
      </div>

      <div className="clientcard">
        <span className="av">{iniciales}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <b style={{ fontSize: 13.5 }}>{data.grupo}</b>
          <span style={{ fontSize: 11, color: "#00D2F5" }}>
            {data.empresas.length} {data.empresas.length > 1 ? "empresas" : "empresa"} · {data.plan.split("·")[0]}
          </span>
        </span>
      </div>
      {clientes.length > 1 && (
        <select className="pick" value={clienteId ?? ""} onChange={(e) => setClienteId(e.target.value)} aria-label="Cliente">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.grupo}</option>)}
        </select>
      )}

      <div>
        <div className="grp">GENERAL</div>
        <NavLink href="/portal" icon={<IHome />} txt="Panel general" />
        <NavLink href="/portal/ruta" icon={<IRuta />} txt="Ruta del valor" />
      </div>
      <div>
        <div className="grp">INDICADORES POR ÁREA</div>
        {data.areas.map((a) => {
          const ch = AREA_CH[a];
          return (
            <NavLink
              key={a} href={`/portal/indicadores/${a}`} txt={AREA_LBL[a]}
              icon={<span className="chip-a" style={{ background: ch[1], color: ch[2] }}>{ch[0]}</span>}
            />
          );
        })}
        <NavLink href="/portal/fugas" icon={<IFuga />} txt="Fugas de valor" />
      </div>
      <div>
        <div className="grp">ANALYTICS · PREMIUM</div>
        <NavLink href="/portal/analytics" icon={<IChart />} txt="Analytics de valor" lk={data.analytics.enabled ? undefined : "Activar"} />
      </div>
      <div>
        <div className="grp">SERVICIOS CORE</div>
        <NavLink href="/portal/servicios" icon={<IServ />} txt="Servicios a su medida" lk="7" />
      </div>
      <div>
        <div className="grp">MI EQUIPO CORE</div>
        <NavLink href="/portal/aprobaciones" icon={<IOk />} txt="Aprobaciones y solicitudes" badge={pendientesAprobar} />
        <NavLink href="/portal/checklist" icon={<IChk />} txt="Checklist de documentos" badge={docsPendientes} red />
      </div>
      <div>
        <div className="grp">ACADEMIA CORE</div>
        <NavLink href="/portal/academia" icon={<IAcad />} txt="Capacitaciones" />
      </div>

      <div style={{ flexGrow: 1 }} />
      <div style={{ borderTop: "1px solid #1A2766", paddingTop: 10 }}>
        <div style={{ fontSize: 11.5, color: "#7F8BB8", padding: "0 12px 8px" }}>Líder de cuenta: {data.lider}</div>
        {usuario?.rol === "admin" && <NavLink href="/admin" icon={<IAdmin />} txt="Panel de gestión CORE" />}
        <button className="nav" onClick={() => signOut({ redirectUrl: "/" })}><IOut /><span>Salir</span></button>
      </div>
    </aside>
  );
}

/** Encabezado de cada vista: título, selector de empresa (RUC) y usuario. */
export function Top({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  const { data, ruc, setRuc, usuario } = usePortal();
  const { toggle } = useContext(ShellCtx);
  if (!data) return null;
  const ini = (usuario?.nombre || usuario?.email || "?").slice(0, 2).toUpperCase();
  return (
    <header className="top">
      <button className="btn line sm menu-btn" onClick={toggle} aria-label="Mostrar u ocultar el menú" title="Menú"><IMenu /></button>
      <div className="t">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="h">{title}</h1>
        {sub && <span className="sub">{sub}</span>}
      </div>
      <label className="sel">
        Empresa (RUC)
        <select value={ruc} onChange={(e) => setRuc(e.target.value)}>
          {data.empresas.map((e) => <option key={e.ruc} value={e.ruc}>{e.nombre} · {e.rucNum}</option>)}
        </select>
      </label>
      <div className="user">
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <b style={{ fontSize: 13 }}>{usuario?.nombre || usuario?.email}</b>
          <span className="muted" style={{ fontSize: 11.5 }}>Hoy {fdc(HOY)} {HOY.getFullYear()}</span>
        </span>
        <span className="av">{ini}</span>
      </div>
    </header>
  );
}
