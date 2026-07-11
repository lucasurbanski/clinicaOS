"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Phone, CheckCircle, X, TrendingUp, Clock, UserPlus, Star, RefreshCw } from "lucide-react";
import { cn, formatDate, formatCurrency, PROFILE_COLORS, PROFILE_LABELS, OPPORTUNITY_LABELS } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";

const TYPE_ICONS: Record<string, any> = {
  REACTIVATION: <RefreshCw className="w-4 h-4" />,
  PENDING_RETURN: <Clock className="w-4 h-4" />,
  HIGH_VALUE_FOLLOW_UP: <Star className="w-4 h-4" />,
  NEW_PATIENT_FOLLOW_UP: <UserPlus className="w-4 h-4" />,
  COMPLEMENTARY_SERVICE: <TrendingUp className="w-4 h-4" />,
  APPOINTMENT_CONFIRMATION: <CheckCircle className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  REACTIVATION: "bg-red-50 text-red-700 border-red-100",
  PENDING_RETURN: "bg-orange-50 text-orange-700 border-orange-100",
  HIGH_VALUE_FOLLOW_UP: "bg-amber-50 text-amber-700 border-amber-100",
  NEW_PATIENT_FOLLOW_UP: "bg-sky-50 text-sky-700 border-sky-100",
  COMPLEMENTARY_SERVICE: "bg-violet-50 text-violet-700 border-violet-100",
  APPOINTMENT_CONFIRMATION: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-orange-400",
  LOW: "bg-slate-300",
};

export default function CRMPage() {
  const { data: opportunities = [], isLoading, mutate } = useSWR<any[]>("/api/crm", fetcher);
  const [filter, setFilter] = useState("");

  async function updateStatus(id: string, status: string) {
    // Atualiza UI imediatamente (otimista)
    mutate(opportunities.filter((o) => o.id !== id), false);
    await fetch("/api/crm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    mutate();
  }

  const filtered = useMemo(
    () => filter ? opportunities.filter((o) => o.type === filter) : opportunities,
    [opportunities, filter]
  );
  const highCount = useMemo(
    () => opportunities.filter((o) => o.priority === "HIGH").length,
    [opportunities]
  );
  const TYPES = useMemo(
    () => opportunities.map((o) => o.type).filter((t, i, arr) => arr.indexOf(t) === i),
    [opportunities]
  );

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">CRM — Oportunidades</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : (
            <>
              {opportunities.length} oportunidade{opportunities.length !== 1 ? "s" : ""} abertas
              {highCount > 0 && <span className="ml-1 text-red-600 font-medium">· {highCount} de alta prioridade</span>}
            </>
          )}
        </p>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", !filter ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground hover:border-primary")}>
          Todas
        </button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t === filter ? "" : t)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", filter === t ? "bg-primary text-primary-foreground border-primary" : cn(TYPE_COLORS[t]))}>
            {OPPORTUNITY_LABELS[t] || t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground bg-white rounded-xl border border-border">
              Nenhuma oportunidade aberta 🎉
            </div>
          )}
          {filtered.map((opp: any) => (
            <div key={opp.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                {/* Tipo */}
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0", TYPE_COLORS[opp.type])}>
                  {TYPE_ICONS[opp.type]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", TYPE_COLORS[opp.type])}>
                          {OPPORTUNITY_LABELS[opp.type]}
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <span className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_COLORS[opp.priority])} />
                          <span className="text-muted-foreground">{opp.priority === "HIGH" ? "Alta" : opp.priority === "MEDIUM" ? "Média" : "Baixa"} prioridade</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Link href={`/pacientes/${opp.patient.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                          {opp.patient.name}
                        </Link>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PROFILE_COLORS[opp.patient.profile])}>
                          {PROFILE_LABELS[opp.patient.profile]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1.5">{opp.reason}</p>

                  <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {opp.patient.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{opp.patient.phone}</span>
                    )}
                    {opp.patient.lastConsultDate && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Última consulta: {formatDate(opp.patient.lastConsultDate)}</span>
                    )}
                    {opp.patient.totalSpent > 0 && (
                      <span className="text-emerald-600 font-medium">{formatCurrency(opp.patient.totalSpent)} gerados</span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Ação sugerida:</span>
                      <span className="text-xs font-semibold">{opp.suggestedAction}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(opp.id, "DONE")} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors">
                        <CheckCircle className="w-3 h-3" /> Feito
                      </button>
                      <button onClick={() => updateStatus(opp.id, "DISMISSED")} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors">
                        <X className="w-3 h-3" /> Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
