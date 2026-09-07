"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  apiFetch,
  type Contabilidad,
  type Periodo,
  type Usuario,
} from "@/lib/api";

const S = (n: number) =>
  "S/ " + Math.round(n).toLocaleString("es-PE");
const P = (n: number) => (n * 100).toFixed(1) + "%";

const CAMPOS_ER = [
  { clave: "ingresos", label: "Ingresos operativos" },
  { clave: "costoServicios", label: "Costo de servicios" },
  { clave: "gastosAdmin", label: "Gastos administrativos" },
  { clave: "gastosVentas", label: "Gastos de ventas" },
  { clave: "depreciacion", label: "Depreciación" },
  { clave: "otrosIngresos", label: "Otros ingresos" },
  { clave: "gastosFinancieros", label: "Gastos financieros" },
] as const;

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function ContabilidadPage() {
  const { getToken, isLoaded } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [contabilidad, setContabilidad] = useState<Contabilidad | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarContabilidad = useCallback(
    async (id: number) => {
      const token = await getToken();
      try {
        const data = await apiFetch<Contabilidad>(`/periodos/${id}/contabilidad`, token);
        setContabilidad(data);
        setShowForm(false);
      } catch {
        // el periodo existe pero todavia no tiene saldos cargados
        setContabilidad(null);
        setShowForm(true);
      }
    },
    [getToken]
  );

  const cargarUsuarioYPeriodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const me = await apiFetch<Usuario>("/usuarios/me", token);
      setUsuario(me);
      if (!me.empresa_id) {
        if (me.rol !== "admin") {
          setError(
            "Tu usuario todavía no está asociado a ninguna empresa. Pide a un admin que te asigne una."
          );
        }
        return;
      }
      const lista = await apiFetch<Periodo[]>(`/periodos?empresa_id=${me.empresa_id}`, token);
      setPeriodos(lista);
      if (lista.length > 0) {
        setPeriodoId(lista[0].id);
        await cargarContabilidad(lista[0].id);
      } else {
        setShowForm(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, [getToken, cargarContabilidad]);

  useEffect(() => {
    if (!isLoaded) return;
    cargarUsuarioYPeriodos();
  }, [isLoaded, cargarUsuarioYPeriodos]);

  if (!isLoaded || loading) {
    return <p className="text-sm text-[#9AA7C7]">Cargando…</p>;
  }

  return (
    <>
      {periodos.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm text-[#4C82F7] hover:underline"
          >
            {showForm ? "Cancelar" : "Cargar nuevo periodo"}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[#4a1f2a] bg-[#2A1420] p-4 text-sm text-[#F0637A]">
          {error}
        </div>
      )}

      {usuario?.rol === "admin" && !usuario.empresa_id && (
        <CrearEmpresaForm
          usuarioId={usuario.id}
          getToken={getToken}
          onCreada={cargarUsuarioYPeriodos}
        />
      )}

      {periodos.length > 1 && !showForm && (
        <select
          value={periodoId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            setPeriodoId(id);
            cargarContabilidad(id);
          }}
          className="rounded-lg border border-[#2E3A57] bg-[#141B2E] px-3 py-2 text-sm"
        >
          {periodos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tipo === "mensual" && p.mes ? `${MESES[p.mes - 1]} ${p.anio}` : `${p.tipo} ${p.anio}`}
            </option>
          ))}
        </select>
      )}

      {showForm && usuario?.empresa_id && (
        <CargarPeriodoForm
          empresaId={usuario.empresa_id}
          getToken={getToken}
          onCargado={async (id) => {
            setPeriodoId(id);
            const token = await getToken();
            const lista = await apiFetch<Periodo[]>(
              `/periodos?empresa_id=${usuario.empresa_id}`,
              token
            );
            setPeriodos(lista);
            await cargarContabilidad(id);
          }}
        />
      )}

      {contabilidad && !showForm && <EstadoResultados data={contabilidad} />}
    </>
  );
}

function CrearEmpresaForm({
  usuarioId,
  getToken,
  onCreada,
}: {
  usuarioId: number;
  getToken: () => Promise<string | null>;
  onCreada: () => void;
}) {
  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimen, setRegimen] = useState("");
  const [rubro, setRubro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      const empresa = await apiFetch<{ id: number }>("/empresas", token, {
        method: "POST",
        body: JSON.stringify({ ruc, razon_social: razonSocial, regimen, rubro }),
      });
      await apiFetch(`/usuarios/${usuarioId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ empresa_id: empresa.id }),
      });
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la empresa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-[#232D45] bg-[#141B2E] p-6"
    >
      <div>
        <h2 className="text-sm font-semibold">Crear tu empresa</h2>
        <p className="text-xs text-[#5E6A8A] mt-1">
          Eres el primer usuario de esta base — te asignamos admin. Crea la empresa y quedas
          vinculado a ella automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">RUC</label>
          <input
            required
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            className="w-full rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">Razón social</label>
          <input
            required
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className="w-full rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">Régimen</label>
          <input
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            className="w-full rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">Rubro</label>
          <input
            value={rubro}
            onChange={(e) => setRubro(e.target.value)}
            className="w-full rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-[#F0637A]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#4C82F7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Creando…" : "Crear empresa"}
      </button>
    </form>
  );
}

function CargarPeriodoForm({
  empresaId,
  getToken,
  onCargado,
}: {
  empresaId: number;
  getToken: () => Promise<string | null>;
  onCargado: (periodoId: number) => void;
}) {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      const periodo = await apiFetch<Periodo>("/periodos", token, {
        method: "POST",
        body: JSON.stringify({ empresa_id: empresaId, tipo: "mensual", anio, mes }),
      });

      const saldos = CAMPOS_ER.map(({ clave }) => ({
        clave,
        valor: Number(valores[clave] ?? 0),
        fuente: "carga manual",
      }));
      await apiFetch(`/periodos/${periodo.id}/saldos`, token, {
        method: "PUT",
        body: JSON.stringify(saldos),
      });

      onCargado(periodo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el periodo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-[#232D45] bg-[#141B2E] p-6"
    >
      <div>
        <h2 className="text-sm font-semibold">Cargar balance del periodo</h2>
        <p className="text-xs text-[#5E6A8A] mt-1">
          Estos son los únicos números escritos a mano — el resto (EBIT, EBITDA, margen, utilidad
          neta) se calcula.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-24 rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CAMPOS_ER.map(({ clave, label }) => (
          <div key={clave} className="space-y-1.5">
            <label className="text-xs uppercase tracking-wide text-[#5E6A8A]">{label}</label>
            <input
              type="number"
              step="any"
              required
              value={valores[clave] ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, [clave]: e.target.value }))}
              className="w-full rounded-lg border border-[#2E3A57] bg-[#0F1524] px-3 py-2 text-sm font-mono"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-[#F0637A]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#4C82F7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar y calcular"}
      </button>
    </form>
  );
}

function EstadoResultados({ data }: { data: Contabilidad }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Ingresos" value={S(data.ingresos)} />
        <Kpi label="EBITDA" value={S(data.ebitda)} />
        <Kpi label="EBIT" value={S(data.ebit)} sub={P(data.margen_operativo) + " margen"} />
        <Kpi label="Utilidad neta" value={S(data.utilidad_neta)} />
      </div>

      <div className="rounded-xl border border-[#232D45] bg-[#141B2E] p-5">
        <h2 className="text-sm font-semibold mb-4">Estado de resultados</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#5E6A8A] border-b border-[#232D45]">
              <th className="pb-2 font-medium">Cuenta</th>
              <th className="pb-2 font-medium text-right">Importe</th>
              <th className="pb-2 font-medium text-right">% de ingresos</th>
            </tr>
          </thead>
          <tbody>
            {data.lineas.map((linea) => (
              <tr key={linea.clave} className="border-b border-[#232D45] last:border-none">
                <td className="py-2.5">{linea.cuenta}</td>
                <td
                  className={`py-2.5 text-right font-mono ${
                    linea.importe < 0 ? "text-[#F0637A]" : "text-[#EAF0FF]"
                  }`}
                >
                  {S(linea.importe)}
                </td>
                <td className="py-2.5 text-right font-mono text-[#9AA7C7]">
                  {P(linea.pct_ingresos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#232D45] bg-[#141B2E] p-4">
      <div className="text-[10.5px] uppercase tracking-wide text-[#5E6A8A]">{label}</div>
      <div className="text-xl font-semibold mt-1.5">{value}</div>
      {sub && <div className="text-xs text-[#9AA7C7] mt-1">{sub}</div>}
    </div>
  );
}
