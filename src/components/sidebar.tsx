"use client";
import Link from "next/link";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Users, TrendingUp,
  Stethoscope, Settings, LogOut, Activity, Zap, Shield, Headphones, UserCog,
  Building2, RefreshCw,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { canAccess, parsePermissions } from "@/lib/menu-permissions";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/agenda", icon: CalendarDays, label: "Agenda" },
  { href: "/atendimento", icon: Headphones, label: "Atendimento", badge: "pending" as const },
  { href: "/pacientes", icon: Users, label: "Pacientes" },
  { href: "/crm", icon: TrendingUp, label: "Oportunidades" },
  { href: "/automacoes", icon: Zap, label: "Automações", adminOnly: true },
  { href: "/usuarios", icon: UserCog, label: "Usuários", adminOnly: true },
  { href: "/medicos", icon: Stethoscope, label: "Médicos" },
  { href: "/servicos", icon: Stethoscope, label: "Serviços" },
  { href: "/convenios", icon: Shield, label: "Convênios" },
  { href: "/calendario", icon: CalendarDays, label: "Calendário" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

const BOTTOM_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { href: "/agenda", icon: CalendarDays, label: "Agenda" },
  { href: "/atendimento", icon: Headphones, label: "Fila", badge: "pending" as const },
  { href: "/pacientes", icon: Users, label: "Pacientes" },
  { href: "/configuracoes", icon: Settings, label: "Mais" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = (session?.user ?? {}) as {
    name?: string;
    email?: string;
    role?: string;
    clinicId?: string | null;
    clinicName?: string | null;
    activeClinicId?: string | null;
    activeClinicName?: string | null;
  };

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const displayClinicName = isSuperAdmin
    ? (user.activeClinicName ?? "—")
    : (user.clinicName ?? "Consultório");

  const { data: pendingTickets } = useSWR<any[]>(
    session ? "/api/human-tickets?status=PENDING" : null,
    fetcher,
    { refreshInterval: 30000 },
  );
  const pendingCount = Array.isArray(pendingTickets) ? pendingTickets.length : 0;

  const { data: menuPermsData } = useSWR<{ menuPermissions: string | null }>(
    session ? "/api/menu-permissions" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 },
  );
  const perms = parsePermissions(menuPermsData?.menuPermissions ?? null);

  function isVisible(item: (typeof NAV)[number]): boolean {
    if (item.adminOnly) return user.role === "ADMIN" || isSuperAdmin;
    return canAccess(item.href, user.role ?? "", perms);
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col h-full bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-sidebar-foreground truncate">ClinicaOS</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{displayClinicName}</p>
            </div>
          </div>
        </div>

        {/* Super admin clinic banner */}
        {isSuperAdmin && (
          <div className="mx-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Building2 className="w-3 h-3 text-amber-600 flex-shrink-0" />
              <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">Modo Suporte</p>
            </div>
            <p className="text-[10px] font-semibold text-amber-900 truncate">{user.activeClinicName ?? "Nenhuma clínica"}</p>
            <Link
              href="/clinicas"
              className="text-[9px] text-amber-600 hover:text-amber-800 flex items-center gap-0.5 mt-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Trocar clínica
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.filter(isVisible).map(({ href, icon: Icon, label, badge }: any) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge === "pending" && pendingCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-[10px] font-bold text-sidebar-foreground flex-shrink-0">
              {getInitials(user.name || "U")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[9px] text-sidebar-foreground/40 truncate">
                {isSuperAdmin ? "Suporte" : user.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border">
        <div className="flex items-stretch justify-around">
          {BOTTOM_NAV.filter((item) => canAccess(item.href, user.role ?? "", perms)).map(({ href, icon: Icon, label, badge }: any) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = badge === "pending" && pendingCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-1/2 translate-x-3 bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
