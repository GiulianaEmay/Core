export type NavItem = {
  href: string;
  label: string;
  /** true = tiene funcionalidad real conectada al backend; false = estructura a la espera de construirse */
  activo: boolean;
};

export type NavLinea = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV: NavLinea[] = [
  {
    id: "fin",
    label: "Finanzas",
    items: [
      { href: "/resumen", label: "Resumen · EVA", activo: false },
      { href: "/capital-de-trabajo", label: "Capital de trabajo", activo: false },
      { href: "/contabilidad", label: "Contabilidad", activo: true },
      { href: "/tributacion", label: "Tributación", activo: false },
      { href: "/laboral", label: "Laboral", activo: false },
      { href: "/patrimonial", label: "Patrimonial", activo: false },
      { href: "/arquitectura-de-datos", label: "Arquitectura de datos", activo: false },
      { href: "/auditoria", label: "Auditoría del modelo", activo: false },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    items: [
      { href: "/legal/contratos", label: "Contratos", activo: false },
      { href: "/legal/cumplimiento", label: "Cumplimiento", activo: false },
    ],
  },
  {
    id: "ops",
    label: "Operaciones",
    items: [
      { href: "/operaciones/flota", label: "Flota", activo: false },
      { href: "/operaciones/rutas", label: "Rutas", activo: false },
    ],
  },
];

export function tituloDePath(pathname: string): string {
  for (const linea of NAV) {
    const item = linea.items.find((i) => i.href === pathname);
    if (item) return item.label;
  }
  return "—";
}

export function lineaDePath(pathname: string): NavLinea | undefined {
  return NAV.find((linea) => linea.items.some((i) => i.href === pathname));
}
