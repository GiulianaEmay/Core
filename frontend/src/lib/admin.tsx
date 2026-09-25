"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "./api";
import type { Usuario } from "./types";

type AdminCtx = {
  usuario: Usuario | null;
  estado: "cargando" | "admin" | "no-admin" | "error";
  error: string | null;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  toast: (m: string) => void;
  mensaje: string | null;
};

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin fuera de AdminProvider");
  return c;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estado, setEstado] = useState<AdminCtx["estado"]>("cargando");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useCallback(
    async <T,>(path: string, options?: RequestInit) => apiFetch<T>(path, await getToken(), options),
    [getToken]
  );
  const toast = useCallback((m: string) => {
    setMensaje(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensaje(null), 2800);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    api<{ usuario: Usuario }>("/portal/me")
      .then((r) => {
        setUsuario(r.usuario);
        setEstado(r.usuario.rol === "admin" ? "admin" : "no-admin");
      })
      .catch((e) => { setError(e.message); setEstado("error"); });
  }, [isLoaded, api]);

  return <Ctx.Provider value={{ usuario, estado, error, api, toast, mensaje }}>{children}</Ctx.Provider>;
}
