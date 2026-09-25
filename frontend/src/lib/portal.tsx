"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "./api";
import { chkEstado, porAprobar } from "./calc";
import type { ClienteData, ClienteResumen, Empresa, PortalConfig, Usuario } from "./types";

type Estado = "cargando" | "listo" | "sin-cliente" | "error";

type PortalCtx = {
  estado: Estado;
  error: string | null;
  usuario: Usuario | null;
  clientes: ClienteResumen[];
  clienteId: string | null;
  setClienteId: (id: string) => void;
  data: ClienteData | null;
  config: PortalConfig | null;
  ruc: string;
  setRuc: (r: string) => void;
  empresa: Empresa | null;
  pendientesAprobar: number;
  docsPendientes: number;
  toast: (m: string) => void;
  mensaje: string | null;
  recargar: () => Promise<void>;
  decidir: (clave: string, decision: "Aprobado" | "Observado", comentario?: string) => Promise<void>;
  nuevaSolicitud: (v: { empresa: string; area: string; tipo: string; sol: string }) => Promise<void>;
  registrarEnvio: (ruc: string, cod: string, nombre: string, url?: string) => Promise<void>;
  quitarEnvio: (ruc: string, cod: string) => Promise<void>;
  toggleInteres: (clave: string, mensajeAlta?: string) => Promise<void>;
};

const Ctx = createContext<PortalCtx | null>(null);

export function usePortal(): PortalCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePortal fuera de PortalProvider");
  return c;
}

/** Datos del cliente ya cargados (las vistas solo se pintan en estado "listo"). */
export function useCliente() {
  const p = usePortal();
  return { ...p, data: p.data as ClienteData, config: p.config as PortalConfig, empresa: p.empresa as Empresa };
}

const CLIENTE_KEY = "core_cliente";

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [clienteId, setClienteIdState] = useState<string | null>(null);
  const [data, setData] = useState<ClienteData | null>(null);
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [ruc, setRuc] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMensaje(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensaje(null), 2600);
  }, []);

  const api = useCallback(
    async <T,>(path: string, options?: RequestInit) => apiFetch<T>(path, await getToken(), options),
    [getToken]
  );

  const cargarCliente = useCallback(
    async (id: string) => {
      const d = await api<ClienteData>(`/portal/clientes/${id}`);
      setData(d);
      setRuc((cur) => (d.empresas.some((e) => e.ruc === cur) ? cur : d.empresas[0]?.ruc ?? ""));
    },
    [api]
  );

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const [me, cfg] = await Promise.all([
          api<{ usuario: Usuario; clientes: ClienteResumen[] }>("/portal/me"),
          api<PortalConfig>("/portal/config"),
        ]);
        setUsuario(me.usuario);
        setClientes(me.clientes);
        setConfig(cfg);
        if (!me.clientes.length) {
          setEstado("sin-cliente");
          return;
        }
        const guardado = typeof window !== "undefined" ? localStorage.getItem(CLIENTE_KEY) : null;
        const inicial = me.clientes.find((c) => c.id === guardado)?.id ?? me.clientes[0].id;
        setClienteIdState(inicial);
        await cargarCliente(inicial);
        setEstado("listo");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el portal");
        setEstado("error");
      }
    })();
  }, [isLoaded, api, cargarCliente]);

  const setClienteId = useCallback(
    (id: string) => {
      setClienteIdState(id);
      try { localStorage.setItem(CLIENTE_KEY, id); } catch { /* sin storage */ }
      setEstado("cargando");
      cargarCliente(id).then(() => setEstado("listo")).catch((e) => { setError(e.message); setEstado("error"); });
    },
    [cargarCliente]
  );

  const recargar = useCallback(async () => {
    if (clienteId) await cargarCliente(clienteId);
  }, [clienteId, cargarCliente]);

  const conAviso = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
      try {
        await fn();
        await recargar();
        if (ok) toast(ok);
      } catch (e) {
        toast(e instanceof Error ? e.message : "No se pudo completar la acción");
        throw e;
      }
    },
    [recargar, toast]
  );

  const base = clienteId ? `/portal/clientes/${clienteId}` : "";
  const decidir: PortalCtx["decidir"] = (clave, decision, comentario = "") =>
    conAviso(
      () => api(`${base}/decisiones`, { method: "POST", body: JSON.stringify({ clave, decision, comentario }) }),
      decision === "Aprobado" ? "Aprobado · quedó en el historial" : "Observación enviada a su líder de cuenta"
    );
  const nuevaSolicitud: PortalCtx["nuevaSolicitud"] = (v) =>
    conAviso(() => api(`${base}/solicitudes`, { method: "POST", body: JSON.stringify(v) }), "Solicitud registrada");
  const registrarEnvio: PortalCtx["registrarEnvio"] = (r, cod, nombre, url) =>
    conAviso(() => api(`${base}/checklist/${r}/${cod}/envio`, { method: "PUT", body: JSON.stringify({ nombre, url: url || null }) }), "Documento enviado a revisión");
  const quitarEnvio: PortalCtx["quitarEnvio"] = (r, cod) =>
    conAviso(() => api(`${base}/checklist/${r}/${cod}/envio`, { method: "DELETE" }));
  const toggleInteres: PortalCtx["toggleInteres"] = (clave, mensajeAlta) => {
    const activo = data?.intereses.includes(clave);
    return conAviso(
      () => api(`${base}/intereses/${encodeURIComponent(clave)}`, { method: activo ? "DELETE" : "PUT" }),
      activo ? undefined : mensajeAlta ?? "Solicitud enviada a su líder de cuenta"
    );
  };

  const empresa = data?.empresas.find((e) => e.ruc === ruc) ?? null;
  const { pendientesAprobar, docsPendientes } = useMemo(() => {
    if (!data) return { pendientesAprobar: 0, docsPendientes: 0 };
    const decididas = new Set(data.decisiones.map((d) => d.clave));
    const deEmpresa = (x: { ruc: string }) => x.ruc === ruc;
    return {
      pendientesAprobar: porAprobar(data.actividades.filter(deEmpresa), data.fases.filter(deEmpresa), decididas).length,
      docsPendientes: data.checklist.filter(deEmpresa).filter((x) => chkEstado(x) === "Por enviar").length,
    };
  }, [data, ruc]);

  const value: PortalCtx = {
    estado, error, usuario, clientes, clienteId, setClienteId, data, config, ruc, setRuc, empresa,
    pendientesAprobar, docsPendientes, toast, mensaje, recargar, decidir, nuevaSolicitud,
    registrarEnvio, quitarEnvio, toggleInteres,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
