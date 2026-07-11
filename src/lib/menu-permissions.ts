export const CONFIGURABLE_ROUTES = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/atendimento", label: "Atendimento" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/crm", label: "Oportunidades" },
  { href: "/medicos", label: "Médicos" },
  { href: "/servicos", label: "Serviços" },
  { href: "/convenios", label: "Convênios" },
  { href: "/calendario", label: "Calendário" },
  { href: "/configuracoes", label: "Configurações" },
];

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  RECEPTIONIST: ["/agenda", "/atendimento", "/pacientes", "/crm", "/medicos", "/servicos", "/convenios"],
  DOCTOR: ["/agenda", "/atendimento", "/pacientes", "/medicos"],
};

export function canAccess(href: string, role: string, perms: Record<string, string[]> | null): boolean {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  const allowed = perms?.[role] ?? DEFAULT_PERMISSIONS[role] ?? [];
  return allowed.some((p) => href === p || href.startsWith(p + "/"));
}

export function parsePermissions(raw: string | null | undefined): Record<string, string[]> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
