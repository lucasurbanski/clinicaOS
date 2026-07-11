"use client";
import { useState } from "react";
import useSWR from "swr";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2, LogIn, LogOut, Activity, Users, CalendarDays, Plus, X, Mail, Phone,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";

type ClinicSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count: { users: number; patients: number; appointments: number };
};

export default function ClinicasPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { data: clinics = [], isLoading, mutate } = useSWR<ClinicSummary[]>("/api/clinicas", fetcher);
  const [entering, setEntering] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", phone: "", email: "" });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const user = session?.user as any;
  const currentClinicId = user?.activeClinicId;

  async function enterClinic(clinic: ClinicSummary) {
    setEntering(clinic.id);
    await update({ activeClinicId: clinic.id, activeClinicName: clinic.name });
    router.push("/dashboard");
  }

  async function handleCreate() {
    if (!newForm.name.trim()) { setCreateErr("Nome é obrigatório"); return; }
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await fetch("/api/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar clínica");
      await mutate();
      setShowCreate(false);
      setNewForm({ name: "", phone: "", email: "" });
      // Auto-enter the newly created clinic
      await enterClinic(json);
    } catch (e: any) {
      setCreateErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Activity className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ClinicaOS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modo Suporte — Olá, <span className="font-medium text-foreground">{user?.name}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Selecione uma clínica ou crie uma nova</p>
        </div>

        {/* Clinic list */}
        <div className="space-y-2.5">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-border animate-pulse" />
            ))
          ) : clinics.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-10 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma clínica cadastrada.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Nova clínica" para começar.</p>
            </div>
          ) : (
            clinics.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 shadow-sm"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                    {c.name}
                    {c.id === currentClinicId && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">
                        ativo
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.email && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {c.email}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Users className="w-3 h-3" /> {c._count.users}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <CalendarDays className="w-3 h-3" /> {c._count.appointments}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => enterClinic(c)}
                  disabled={!!entering}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex-shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {entering === c.id ? "Entrando..." : "Entrar"}
                </button>
              </div>
            ))
          )}

          {/* New clinic button */}
          <button
            onClick={() => { setShowCreate(true); setCreateErr(null); }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova clínica
          </button>
        </div>

        {/* Sign out */}
        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair da conta
          </button>
        </div>
      </div>

      {/* Create clinic modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Nova clínica
              </h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Nome *</label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Ex: Clínica Souza"
                  autoFocus
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Telefone
                </label>
                <input
                  type="text"
                  value={newForm.phone}
                  onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  <Mail className="w-3 h-3 inline mr-1" />E-mail
                </label>
                <input
                  type="email"
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  placeholder="contato@clinica.com"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {createErr && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {createErr}
                </p>
              )}

              <p className="text-[11px] text-muted-foreground">
                Após criar, você será redirecionado para o sistema da clínica onde poderá configurar
                horários, instância WhatsApp, criar usuários e médicos.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newForm.name.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar e entrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
