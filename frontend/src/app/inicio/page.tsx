"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Usuario } from "@/lib/types";

/** Punto de entrada tras iniciar sesión: el equipo CORE va al panel, los clientes a su portal. */
export default function Inicio() {
  const { getToken, isLoaded } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const { usuario } = await apiFetch<{ usuario: Usuario }>("/portal/me", await getToken());
        router.replace(usuario.rol === "admin" ? "/admin" : "/portal");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo iniciar");
      }
    })();
  }, [isLoaded, getToken, router]);

  return (
    <main className="authwrap">
      {error ? (
        <div className="card"><h2>No pudimos cargar su sesión</h2><p className="muted" style={{ margin: "8px 0 14px" }}>{error}</p>
          <button className="btn" onClick={() => location.reload()}>Reintentar</button></div>
      ) : <p className="muted">Entrando…</p>}
    </main>
  );
}
