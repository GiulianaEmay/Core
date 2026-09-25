"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

export default function Ingresar() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/inicio");
  }, [isLoaded, isSignedIn, router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const { ticket } = await apiFetch<{ ticket: string }>("/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ usuario, password }),
      });
      const r = await signIn.ticket({ ticket });
      if (r.error) throw new Error(r.error.message);
      if (signIn.status !== "complete") throw new Error("No se pudo completar el ingreso. Intente de nuevo.");
      const f = await signIn.finalize();
      if (f.error) throw new Error(f.error.message);
      router.replace("/inicio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo ingresar");
      setEnviando(false);
    }
  }

  return (
    <main className="landing">
      <section className="brand">
        <div>
          <div className="logo" style={{ fontSize: 26 }}>CORE</div>
          <div className="tag">Creación de Valor para Empresas</div>
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--disp)", fontSize: 44, lineHeight: 1.05, fontWeight: 700 }}>
            Portal del <span style={{ color: "var(--cyan)" }}>cliente</span>
          </h1>
          <p className="lead" style={{ marginTop: 18 }}>
            Ingrese con el usuario y la clave que le entregó su líder de cuenta CORE.
          </p>
        </div>
        <div className="tag">Finanzas · Operaciones · Legal</div>
      </section>
      <section className="formside">
        <form className="lform" onSubmit={entrar}>
          <h2>Ingresar</h2>
          <label className="f">
            Usuario o correo
            <input className="in" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoFocus required />
          </label>
          <label className="f">
            Clave
            <input className="in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          <p className="err">{error}</p>
          <button className="btn" disabled={enviando || !isLoaded || !signIn}>{enviando ? "Ingresando…" : "Ingresar"}</button>
          <p className="hint">
            ¿Olvidó su clave? Pídale a su líder de cuenta CORE que le genere una nueva.
            <br />
            <Link href="/sign-in">Ingresar con Google</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
