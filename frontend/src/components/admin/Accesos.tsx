"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/admin";

type Acceso = { id: number; username: string | null; email: string; nombre: string; rol: string };
type Creado = Acceso & { password: string };

/** Usuario sugerido: el RUC si ya está cargado; si no, el código del cliente. */
export function sugerirUsuario(clienteId: string, empresas: { ruc_num?: string; rucNum?: string }[]): string {
  const ruc = empresas.map((e) => (e.ruc_num ?? e.rucNum ?? "").trim()).find((r) => /^\d{11}$/.test(r));
  return ruc ?? `${clienteId.toLowerCase()}_portal`;
}

function Copiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const { toast } = useAdmin();
  return (
    <button type="button" className="btn line sm" onClick={() => navigator.clipboard.writeText(texto).then(() => toast(`${etiqueta} copiado`))}>
      Copiar
    </button>
  );
}

function Credenciales({ c, onCerrar }: { c: Creado; onCerrar: () => void }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal">
        <h2>Acceso listo</h2>
        <div className="note" style={{ background: "var(--amber-bg)", color: "var(--amber-tx)" }}>
          <b>Copie la clave ahora.</b> No se guarda en ningún lado y no se vuelve a mostrar (si se pierde, se genera una nueva).
        </div>
        <div className="list">
          <div className="it"><div className="tx"><span>Usuario</span><b style={{ fontSize: 17 }}>{c.username}</b></div><Copiar texto={c.username ?? ""} etiqueta="Usuario" /></div>
          <div className="it"><div className="tx"><span>Clave</span><b style={{ fontSize: 17, fontFamily: "ui-monospace,Consolas,monospace" }}>{c.password}</b></div><Copiar texto={c.password} etiqueta="Clave" /></div>
          <div className="it"><div className="tx"><span>Correo interno (alternativa para entrar)</span><b>{c.email}</b></div><Copiar texto={c.email} etiqueta="Correo" /></div>
        </div>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          Se entra en <b>/sign-in</b>. Si la pantalla solo pide “Email address”, use el correo interno de arriba con la clave;
          para entrar con el usuario, active <i>Username</i> como identificador de inicio de sesión en Clerk (Configure → User &amp; authentication).
          El correo interno no recibe mensajes: es solo un identificador.
        </p>
        <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={onCerrar}>Listo</button></div>
      </div>
    </div>
  );
}

export function CrearAccesoModal({ clienteId, sugerido, onCerrar, onCreado }: {
  clienteId: string; sugerido: string; onCerrar: () => void; onCreado: () => void;
}) {
  const { api } = useAdmin();
  const [username, setUsername] = useState(sugerido);
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const body: Record<string, string> = { username: username.trim().toLowerCase(), nombre: nombre.trim() };
      if (password.trim()) body.password = password.trim();
      setCreado(await api<Creado>(`/admin/clientes/${clienteId}/accesos`, { method: "POST", body: JSON.stringify(body) }));
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el acceso");
    } finally { setGuardando(false); }
  }

  if (creado) return <Credenciales c={creado} onCerrar={onCerrar} />;
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" onSubmit={crear}>
        <h2>Crear acceso de cliente</h2>
        <p className="muted" style={{ fontSize: 13 }}>Este usuario ve el portal de <b>{clienteId}</b> en modo consulta (o interactivo si el cliente lo tiene habilitado).</p>
        <div className="form-grid">
          <label className="f">Usuario
            <input className="in" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={4} maxLength={40} pattern="[a-z0-9_\-]+" />
            <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>Minúsculas, números, - o _. Se sugiere el RUC.</span>
          </label>
          <label className="f">Nombre visible
            <input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Gerencia General" />
          </label>
          <label className="f" style={{ gridColumn: "1 / -1" }}>Clave (opcional)
            <input className="in" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Déjela vacía para generar una segura" autoComplete="off" />
            <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>Recomendado dejarla vacía: se genera una de 16 caracteres, no adivinable.</span>
          </label>
        </div>
        {error && <p className="err" style={{ minHeight: 0 }}>{error}</p>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn line" onClick={onCerrar}>Cancelar</button>
          <button className="btn" disabled={guardando}>{guardando ? "Creando…" : "Crear acceso"}</button>
        </div>
      </form>
    </div>
  );
}

export function AccesosPanel({ clienteId, empresas }: { clienteId: string; empresas: { ruc_num?: string; codigo?: string }[] }) {
  const { api, toast } = useAdmin();
  const [lista, setLista] = useState<Acceso[] | null>(null);
  const [crear, setCrear] = useState(false);
  const [nueva, setNueva] = useState<Creado | null>(null);

  const cargar = useCallback(() => api<Acceso[]>(`/admin/clientes/${clienteId}/accesos`).then(setLista).catch((e) => toast(e.message)), [api, clienteId, toast]);
  useEffect(() => { cargar(); }, [cargar]);

  async function restablecer(a: Acceso) {
    if (!confirm(`¿Generar una clave nueva para ${a.username ?? a.email}? La anterior deja de funcionar.`)) return;
    try { setNueva(await api<Creado>(`/admin/usuarios/${a.id}/password`, { method: "POST", body: JSON.stringify({}) })); }
    catch (e) { toast(e instanceof Error ? e.message : "No se pudo cambiar la clave"); }
  }
  async function borrar(a: Acceso) {
    if (!confirm(`¿Eliminar el acceso de ${a.username ?? a.email}? Ya no podrá entrar.`)) return;
    try { await api(`/admin/usuarios/${a.id}`, { method: "DELETE" }); toast("Acceso eliminado"); await cargar(); }
    catch (e) { toast(e instanceof Error ? e.message : "No se pudo eliminar"); }
  }

  return (
    <section className="card">
      <div className="hd">
        <div><h2>Accesos del cliente</h2><span className="muted mini" style={{ display: "block", marginTop: 2 }}>Cada persona del cliente entra con su usuario y clave. Solo ven el portal de este cliente.</span></div>
        <button className="btn sm" onClick={() => setCrear(true)}>+ Crear acceso</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{["Usuario", "Correo", "Nombre", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, textTransform: "uppercase", color: "var(--mut)" }}>{h}</th>)}</tr></thead>
        <tbody>
          {(lista ?? []).map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--line3)" }}>
              <td style={{ padding: 8 }}><b>{a.username ?? "—"}</b></td>
              <td style={{ padding: 8 }}>{a.email}</td>
              <td style={{ padding: 8 }}>{a.nombre || "—"}</td>
              <td style={{ padding: 8, textAlign: "right" }}>
                <span className="rowact" style={{ justifyContent: "flex-end" }}>
                  <button className="btn line sm" onClick={() => restablecer(a)}>Nueva clave</button>
                  <button className="btn warn sm" onClick={() => borrar(a)}>Eliminar</button>
                </span>
              </td>
            </tr>
          ))}
          {lista && !lista.length && <tr><td colSpan={4} className="empty">Este cliente todavía no tiene accesos.</td></tr>}
        </tbody>
      </table>
      {crear && <CrearAccesoModal clienteId={clienteId} sugerido={sugerirUsuario(clienteId, empresas)} onCerrar={() => setCrear(false)} onCreado={cargar} />}
      {nueva && <Credenciales c={nueva} onCerrar={() => setNueva(null)} />}
    </section>
  );
}
