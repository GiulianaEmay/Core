"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [status, setStatus] = useState<"cargando" | "ok" | "error">("cargando");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => (res.ok ? setStatus("ok") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0E1A] text-[#EAF0FF] flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Core · Value OS</h1>
          <p className="text-sm text-[#9AA7C7] mt-1">
            Fase 0 — esqueleto: backend que responde, base que guarda, login que funciona.
          </p>
        </div>

        <div className="rounded-xl border border-[#232D45] bg-[#141B2E] p-5">
          <div className="text-xs uppercase tracking-wide text-[#5E6A8A]">Backend API</div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                status === "ok"
                  ? "bg-[#2ED3A7]"
                  : status === "error"
                    ? "bg-[#F0637A]"
                    : "bg-[#F5B54A]"
              }`}
            />
            <span className="text-sm">
              {status === "ok" && `Conectado a ${API_URL}`}
              {status === "error" &&
                `No se pudo conectar a ${API_URL} — ¿corriste "uvicorn app.main:app --reload" en backend/?`}
              {status === "cargando" && "Verificando conexión…"}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#5E6A8A]">
          El prototipo de referencia (diseño y motor de cálculo del EVA) está en{" "}
          <code>docs/prototipo-v2.html</code>. El plan de arquitectura completo está en{" "}
          <code>docs/arquitectura-plan.docx</code>.
        </p>
      </div>
    </main>
  );
}
