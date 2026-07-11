"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Headphones, CheckCircle2, PlayCircle, RotateCcw, X, MessageSquare, Phone, User } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  reason: string | null;
  conversationId: string | null;
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  patient: { id: string; name: string; phone: string | null; profile: string };
};

const TABS = [
  { key: "PENDING", label: "Aguardando", icon: Headphones, color: "amber" },
  { key: "IN_PROGRESS", label: "Em atendimento", icon: PlayCircle, color: "blue" },
  { key: "RESOLVED", label: "Resolvidos", icon: CheckCircle2, color: "emerald" },
] as const;

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-50 border-amber-200 text-amber-800",
  IN_PROGRESS: "bg-blue-50 border-blue-200 text-blue-800",
  RESOLVED: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

export default function AtendimentoPage() {
  const [tab, setTab] = useState<Ticket["status"]>("PENDING");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [acting, setActing] = useState(false);

  const { data: tickets = [], mutate, isLoading } = useSWR<Ticket[]>(
    `/api/human-tickets?status=${tab}`,
    fetcher,
    { refreshInterval: 15000 },
  );

  const { data: pendingCount } = useSWR<Ticket[]>(
    tab === "PENDING" ? null : "/api/human-tickets?status=PENDING",
    fetcher,
    { refreshInterval: 30000 },
  );

  const counts = {
    PENDING: tab === "PENDING" ? tickets.length : (pendingCount?.length ?? 0),
  };

  async function assume(id: string) {
    setActing(true);
    await fetch(`/api/human-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ASSUME" }),
    });
    setActing(false);
    setSelected(null);
    mutate();
  }

  async function resolve(id: string) {
    setActing(true);
    await fetch(`/api/human-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESOLVE", resolutionNotes: resolveNotes || null }),
    });
    setActing(false);
    setResolveNotes("");
    setSelected(null);
    mutate();
  }

  async function reopen(id: string) {
    setActing(true);
    await fetch(`/api/human-tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REOPEN" }),
    });
    setActing(false);
    setSelected(null);
    mutate();
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" /> Atendimento humano
          </h1>
          <p className="text-sm text-muted-foreground">
            Pacientes que pediram para falar com a equipe. A IA pausa o atendimento até alguém resolver.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const showBadge = key === "PENDING" && counts.PENDING > 0;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              {showBadge && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {counts.PENDING}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Headphones className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {tab === "PENDING" && "Nenhum paciente aguardando."}
            {tab === "IN_PROGRESS" && "Nenhum atendimento em andamento."}
            {tab === "RESOLVED" && "Nenhum ticket resolvido ainda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelected(t); setResolveNotes(t.resolutionNotes ?? ""); }}
              className="text-left bg-white rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{t.patient.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {t.patient.phone || "Sem telefone"}
                  </p>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", STATUS_COLOR[t.status])}>
                  {TABS.find((x) => x.key === t.status)?.label}
                </span>
              </div>
              {t.reason && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                  <MessageSquare className="w-3 h-3 inline mr-1 align-middle text-muted-foreground/60" />
                  {t.reason}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground">
                  Aberto há {formatDistanceToNowStrict(new Date(t.createdAt), { locale: ptBR })}
                </span>
                {t.status === "PENDING" && (
                  <span className="text-[10px] font-semibold text-amber-700">Clique para assumir →</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center md:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-md max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> {selected.patient.name}
              </h3>
              <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground mb-0.5">Telefone</p>
                  <p className="font-semibold">{selected.patient.phone || "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground mb-0.5">Aberto há</p>
                  <p className="font-semibold">{formatDistanceToNowStrict(new Date(selected.createdAt), { locale: ptBR })}</p>
                </div>
              </div>

              {selected.reason && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da escalada</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    {selected.reason}
                  </div>
                </div>
              )}

              {selected.conversationId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Conversa</p>
                  <p className="text-xs font-mono bg-muted/40 rounded-lg p-2">{selected.conversationId}</p>
                </div>
              )}

              {selected.status !== "RESOLVED" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Notas de resolução</label>
                  <textarea
                    rows={3}
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="O que foi feito para resolver..."
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              )}

              {selected.status === "RESOLVED" && selected.resolutionNotes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notas de resolução</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                    {selected.resolutionNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex gap-2 sticky bottom-0 bg-white">
              {selected.status === "PENDING" && (
                <button
                  onClick={() => assume(selected.id)}
                  disabled={acting}
                  className="flex-1 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Assumir
                </button>
              )}
              {selected.status !== "RESOLVED" && (
                <button
                  onClick={() => resolve(selected.id)}
                  disabled={acting}
                  className="flex-1 py-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                </button>
              )}
              {selected.status === "RESOLVED" && (
                <button
                  onClick={() => reopen(selected.id)}
                  disabled={acting}
                  className="flex-1 py-2.5 text-xs font-semibold border border-border text-muted-foreground rounded-lg hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
