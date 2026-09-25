import { COL, ESTL } from "@/lib/format";
import type { Kpi } from "@/lib/types";
import { Ghost, HBars, Ring, StIcon } from "./charts";

/** Tarjeta de indicador con su gráfica. `ruc` = empresa seleccionada. */
export function Kcard({ k, ruc, compact, onOpen }: { k: Kpi; ruc: string; compact?: boolean; onOpen?: () => void }) {
  const v = k.vals[ruc] ?? null;
  const n = k.num?.[ruc] ?? null;
  const est = v ? k.est : "gris";
  const pillTxt = v ? (k.est === "gris" ? "Pendiente" : ESTL[k.est]) : "Por medir";

  let body: React.ReactNode;
  if (!v) {
    body = (
      <>
        <span className="v pm">Por medir</span>
        <Ghost kind={k.viz === "bars" ? "bars" : "line"} txt={compact ? "Se activa con sus datos" : `Fuente: ${k.fuente}`} />
      </>
    );
  } else if (k.viz === "ring" && n != null) {
    body = (
      <div className="row" style={{ gap: 14 }}>
        <Ring p={n} est={est} size={compact ? 64 : 76} label={k.n} />
        <span className="s" style={{ flex: 1 }}>{k.nota || k.sub2}</span>
      </div>
    );
  } else if (k.viz === "parts" && k.parts) {
    body = <HBars rows={k.parts.map((p) => [p[0], p[1], COL[k.est]])} unit="%" />;
  } else if (k.viz === "ref" && n != null && k.ref != null) {
    body = (
      <>
        <span className="v">{v}</span>
        <HBars rows={[["Hoy", n, COL[k.est]], ["Referencia", k.ref, "var(--green)"]]} unit="S/" />
      </>
    );
  } else if (k.viz === "status") {
    body = (
      <div className="row" style={{ gap: 12 }}>
        <StIcon est={est} />
        <span className="v" style={{ fontSize: 19 }}>{v}</span>
      </div>
    );
  } else {
    const s2 = k.sub2x?.[ruc] || k.sub2;
    body = (
      <>
        <span className="v">{v}</span>
        {s2 && <span className="s">{s2}</span>}
      </>
    );
  }

  const clickable = compact && onOpen;
  return (
    <div
      className="kpi kc"
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={clickable ? { cursor: "pointer" } : undefined}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span className="l">{k.n}</span>
        <span className={`pill p-${v ? (k.est === "gris" ? "gris" : k.est) : "gris"}`}>{pillTxt}</span>
      </div>
      {body}
      {!compact && k.nota && k.viz !== "ring" && <span className="s">{k.nota}</span>}
      {!compact && k.meta && <span className="s">Meta: {k.meta}</span>}
      {!compact && v && <span className="src">Fuente: {k.fuente}</span>}
      {compact && k.nota && k.viz !== "ring" && v && <span className="s clamp2">{k.nota}</span>}
    </div>
  );
}
