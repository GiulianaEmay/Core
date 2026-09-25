import { COL, fmtN } from "@/lib/format";

export function Ring({ p, est, size = 76, label }: { p: number; est: string; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, p));
  const txt = p % 1 && p < 10 ? p.toFixed(1) : Math.round(p);
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${p}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line3)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COL[est] ?? est} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${((c * v) / 100).toFixed(1)} ${c.toFixed(1)}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle" style={{ font: `700 ${Math.round(size / 4.6)}px var(--disp)`, fill: "var(--txt)" }}>
        {txt}%
      </text>
    </svg>
  );
}

export function HBars({ rows, unit, refLine }: { rows: [string, number, string?][]; unit?: string; refLine?: { v: number; l: string } }) {
  const max = Math.max(...rows.map((r) => r[1]), refLine ? refLine.v : 0) || 1;
  return (
    <div className="hb">
      {rows.map((r) => (
        <div className="hbr" key={r[0]}>
          <span className="hbl" title={r[0]}>{r[0]}</span>
          <span className="hbt">
            <i style={{ width: `${((r[1] / max) * 100).toFixed(1)}%`, background: r[2] || "var(--blue)" }} />
            {refLine && <em style={{ left: `${((refLine.v / max) * 100).toFixed(1)}%` }} />}
          </span>
          <b className="hbv">{fmtN(r[1], unit)}</b>
        </div>
      ))}
      {refLine && (
        <div className="hbref"><em />{refLine.l}</div>
      )}
    </div>
  );
}

export function Donut({ segs, size = 132, center }: { segs: [string, number, string][]; size?: number; center?: [string, string] }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const tot = segs.reduce((s, x) => s + x[1], 0) || 1;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribución">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line3)" strokeWidth={18} />
      {segs.map((s) => {
        const len = (c * s[1]) / tot;
        if (!len) return null;
        const el = (
          <circle
            key={s[0]} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s[2]} strokeWidth={18}
            strokeDasharray={`${Math.max(0, len - 2).toFixed(1)} ${c.toFixed(1)}`} strokeDashoffset={(-off).toFixed(1)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        off += len;
        return el;
      })}
      {center && (
        <>
          <text x="50%" y="46%" textAnchor="middle" style={{ font: "700 20px var(--disp)", fill: "var(--txt)" }}>{center[0]}</text>
          <text x="50%" y="62%" textAnchor="middle" style={{ font: "500 11px var(--body)", fill: "var(--mut)" }}>{center[1]}</text>
        </>
      )}
    </svg>
  );
}

/** Vista previa sin datos: forma gris punteada, nunca números inventados. */
export function Ghost({ kind, txt }: { kind: "line" | "bars" | "range" | "cross"; txt?: string }) {
  return (
    <div className="ghost">
      <svg viewBox="0 0 280 60" preserveAspectRatio="none" aria-hidden="true">
        {kind === "line" && <polyline points="0,46 40,40 80,42 120,30 160,32 200,20 240,24 280,12" fill="none" stroke="#C9D0E4" strokeWidth={3} strokeDasharray="6 6" />}
        {kind === "range" && (
          <>
            <rect x="20" y="22" width="240" height="14" rx="7" fill="#EEF1F7" />
            <rect x="80" y="22" width="120" height="14" rx="7" fill="#DDE2F0" stroke="#C9D0E4" strokeDasharray="5 4" />
          </>
        )}
        {kind === "cross" && (
          <>
            <polyline points="0,10 280,50" fill="none" stroke="#C9D0E4" strokeWidth={3} strokeDasharray="6 6" />
            <polyline points="0,52 280,6" fill="none" stroke="#DDE2F0" strokeWidth={3} strokeDasharray="6 6" />
            <circle cx="140" cy="30" r="5" fill="#C9D0E4" />
          </>
        )}
        {kind === "bars" && (
          <>
            <rect x="10" y="30" width="30" height="26" rx="4" fill="#EEF1F7" />
            <rect x="60" y="20" width="30" height="36" rx="4" fill="#EEF1F7" />
            <rect x="110" y="34" width="30" height="22" rx="4" fill="#EEF1F7" />
            <rect x="160" y="14" width="30" height="42" rx="4" fill="#EEF1F7" />
            <rect x="210" y="26" width="30" height="30" rx="4" fill="#EEF1F7" />
          </>
        )}
      </svg>
      <span>{txt || "Se activa con sus datos"}</span>
    </div>
  );
}

export function StIcon({ est }: { est: string }) {
  const m: Record<string, [string, string]> = {
    verde: ["✓", "var(--green)"], rojo: ["!", "var(--red)"], ambar: ["•", "var(--amber)"], azul: ["i", "var(--blue)"], gris: ["…", "#9AA3C4"],
  };
  const [sym, color] = m[est] ?? m.gris;
  return <span className="sti" style={{ borderColor: color, color }}>{sym}</span>;
}
