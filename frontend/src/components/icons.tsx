const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IHome = () => (<svg {...base}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>);
export const IRuta = () => (<svg {...base}><path d="M3 6h7M6 12h10M9 18h12" /></svg>);
export const IFuga = () => (<svg {...base}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>);
export const IOk = () => (<svg {...base}><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></svg>);
export const IChk = () => (<svg {...base}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></svg>);
export const IAcad = () => (<svg {...base}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>);
export const IOut = () => (<svg {...base}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>);
export const IChart = () => (<svg {...base}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>);
export const IServ = () => (<svg {...base}><path d="M12 2l2.4 6.9H21l-5.3 4 2 6.9L12 15.8 6.3 19.8l2-6.9L3 8.9h6.6Z" /></svg>);
export const IMenu = () => (<svg {...base} width={20} height={20} strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const IAdmin = () => (<svg {...base}><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
