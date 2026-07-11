"use client";
import useSWR from "swr";
import Link from "next/link";
import {
  Users, CalendarDays, TrendingUp, AlertTriangle, Clock,
  ArrowUpRight, CheckCircle2, XCircle, UserPlus, DollarSign,
} from "lucide-react";
import { cn, formatCurrency, formatTime, STATUS_COLORS, STATUS_LABELS, PROFILE_COLORS, PROFILE_LABELS } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  if (isLoading || !data) return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}</div>
    </div>
  );

  const { stats, todaySchedule, alerts } = data;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do consultório hoje</p>
      </div>

      {/* Alertas */}
      {(alerts.inactiveCount > 0 || alerts.pendingReturnCount > 0 || alerts.tomorrowOccupancy >= 70) && (
        <div className="flex flex-wrap gap-2">
          {alerts.inactiveCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-lg px-3 py-2 text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alerts.inactiveCount} paciente{alerts.inactiveCount > 1 ? "s" : ""} inativo{alerts.inactiveCount > 1 ? "s" : ""} há mais de 90 dias
            </div>
          )}
          {alerts.pendingReturnCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-lg px-3 py-2 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              {alerts.pendingReturnCount} retorno{alerts.pendingReturnCount > 1 ? "s" : ""} pendente{alerts.pendingReturnCount > 1 ? "s" : ""}
            </div>
          )}
          {alerts.tomorrowOccupancy >= 70 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-3 py-2 text-xs font-medium">
              <CalendarDays className="w-3.5 h-3.5" />
              Agenda de amanhã {alerts.tomorrowOccupancy}% preenchida
            </div>
          )}
          {alerts.highValueInactive?.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg px-3 py-2 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              {alerts.highValueInactive.length} paciente{alerts.highValueInactive.length > 1 ? "s" : ""} de alto valor sem retorno
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Consultas hoje" value={stats.todayAppointments} sub={`${stats.todayConfirmed} confirmadas`} color="bg-blue-500" />
        <StatCard icon={Users} label="Pacientes ativos" value={stats.totalActivePatients} sub={`+${stats.newPatientsMonth} este mês`} color="bg-indigo-500" />
        <StatCard icon={DollarSign} label="Receita do mês" value={formatCurrency(stats.monthRevenue)} sub="consultas particulares" color="bg-emerald-500" />
        <StatCard icon={CalendarDays} label="Consultas na semana" value={stats.weekAppointments} sub={`${stats.tomorrowOccupancy}% amanhã ocupado`} color="bg-violet-500" />
      </div>

      {/* Agenda do dia + CRM rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Agenda do dia */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Agenda de Hoje</h2>
            <Link href="/agenda" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver tudo <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todaySchedule.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma consulta hoje</p>
            )}
            {todaySchedule.map((apt: any) => (
              <div key={apt.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground w-12 flex-shrink-0">
                  {formatTime(apt.dateTime)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{apt.patient.name}</p>
                  <p className="text-xs text-muted-foreground">{apt.service?.name || "Consulta"}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[apt.status])}>
                  {STATUS_LABELS[apt.status]}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PROFILE_COLORS[apt.patient.profile])}>
                  {PROFILE_LABELS[apt.patient.profile]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pacientes para atenção */}
        <div className="bg-white rounded-xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Atenção</h2>
            <Link href="/crm" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              CRM <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-red-700">Inativos +90 dias</span>
              </div>
              <span className="text-lg font-bold text-red-600">{stats.inactivePatients}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-orange-700">Retorno pendente</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{stats.pendingReturnPatients}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-medium text-sky-700">Novos este mês</span>
              </div>
              <span className="text-lg font-bold text-sky-600">{stats.newPatientsMonth}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Confirmados hoje</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{stats.todayConfirmed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
