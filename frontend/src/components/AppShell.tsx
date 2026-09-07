"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { apiFetch, type Usuario } from "@/lib/api";
import { NAV, lineaDePath, tituloDePath } from "@/lib/nav";

type Empresa = {
  id: number;
  ruc: string;
  razon_social: string;
  regimen: string;
  rubro: string;
  plan: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { getToken } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lineaAbierta, setLineaAbierta] = useState(lineaDePath(pathname)?.id ?? "fin");

  useEffect(() => {
    const nueva = lineaDePath(pathname)?.id;
    if (nueva) setLineaAbierta(nueva);
  }, [pathname]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      try {
        const me = await apiFetch<Usuario>("/usuarios/me", token);
        setUsuario(me);
        if (me.empresa_id) {
          const empresas = await apiFetch<Empresa[]>("/empresas", token);
          setEmpresa(empresas.find((e) => e.id === me.empresa_id) ?? null);
        }
      } catch {
        // el topbar simplemente queda sin datos de empresa; las paginas
        // protegidas manejan sus propios estados de error
      }
    })();
  }, [getToken]);

  const linea = lineaDePath(pathname);
  const titulo = tituloDePath(pathname);

  return (
    <div className="grid min-h-screen grid-cols-[236px_1fr] bg-[#0A0E1A] text-[#EAF0FF]">
      <aside className="flex flex-col gap-1 border-r border-[#232D45] bg-[#0F1524] p-3.5">
        <div className="flex items-center gap-2.5 border-b border-[#232D45] px-2 pb-4.5 mb-3">
          <div className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gradient-to-br from-[#4C82F7] to-[#9B7BF0] text-[15px] font-bold text-white">
            C
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-widest">CORE</div>
            <div className="text-[10px] uppercase tracking-wide text-[#5E6A8A]">Value OS</div>
          </div>
        </div>

        {NAV.map((l) => (
          <div key={l.id}>
            <button
              onClick={() => setLineaAbierta((cur) => (cur === l.id ? cur : l.id))}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium ${
                linea?.id === l.id
                  ? "bg-[#16213E] text-[#6FA0FF]"
                  : "text-[#9AA7C7] hover:bg-[#141B2E] hover:text-[#EAF0FF]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  linea?.id === l.id ? "bg-[#6FA0FF]" : "bg-current opacity-50"
                }`}
              />
              {l.label}
            </button>
            {lineaAbierta === l.id && (
              <div className="ml-3 mt-0.5 mb-1.5 flex flex-col gap-px border-l border-[#232D45] pl-3">
                {l.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12.5px] ${
                      pathname === item.href
                        ? "bg-[#16213E] font-medium text-[#6FA0FF]"
                        : "text-[#5E6A8A] hover:bg-[#141B2E] hover:text-[#EAF0FF]"
                    }`}
                  >
                    {item.label}
                    {!item.activo && <span className="text-[9px] text-[#5E6A8A]">·</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="mt-auto flex items-center justify-between border-t border-[#232D45] pt-3.5 text-[11px] text-[#5E6A8A]">
          <span className="truncate">{usuario?.email}</span>
          <UserButton />
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#232D45] px-7 py-5">
          <div>
            <div className="text-[11px] text-[#5E6A8A]">
              Core · <b className="text-[#9AA7C7]">{linea?.label ?? "—"}</b>
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight">{titulo}</h1>
            {empresa && (
              <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-xs text-[#9AA7C7]">
                <strong className="text-[#EAF0FF]">{empresa.razon_social}</strong>
                <span className="font-mono text-[#5E6A8A]">RUC {empresa.ruc}</span>
                {empresa.regimen && <span className="font-mono text-[#5E6A8A]">{empresa.regimen}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4.5 p-7">{children}</div>
      </main>
    </div>
  );
}
