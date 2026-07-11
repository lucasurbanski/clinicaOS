"use client";
import { useState } from "react";
import useSWR from "swr";
import { CalendarDays, Plus, Trash2, X, Ban, Clock } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Exc = {
  id: string;
  date: string;
  type: "CLOSED" | "CUSTOM_HOURS";
  openingTime: string | null;
  closingTime: string | null;
  doctorId: string | null;
  note: string | null;
};

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function fmt(iso: string) {
  const m = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const wd = new Date(Date.UTC(+y, +mo - 1, +d)).getUTCDay();
  return `${DIAS[wd]}, ${d}/${mo}/${y}`;
}

const EMPTY = { date: "", type: "CLOSED" as "CLOSED" | "CUSTOM_HOURS", openingTime: "", closingTime: "", doctorId: "", note: "" };

export default function CalendarioPage() {
  const { data: items = [], mutate, isLoading } = useSWR<Exc[]>("/api/calendar", fetcher);
  const { data: doctorsData = [] } = useSWR("/api/doctors", fetcher);
  const doctors: any[] = Array.isArray(doctorsData) ? doctorsData : [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const docName = (id: string | null) => (id ? doctors.find((d) => d.id === id)?.name ?? "Médico" : "Toda a clínica");

  async function save() {
    if (!form.date) { setErr("Selecione a data"); return; }
    if (form.type === "CUSTOM_HOURS" && (!form.openingTime || !form.closingTime)) { setErr("Informe os horários"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao salvar");
      mutate(); setOpen(false); setForm({ ...EMPTY });
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-500" /> Calendário</h1>
          <p className="text-sm text-muted-foreground">Feriados e dias com horário especial. O agente e a agenda respeitam estas datas.</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setErr(null); setOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border divide-y divide-border">
        {isLoading && <p className="text-sm text-muted-foreground p-6 text-center">Carregando...</p>}
        {!isLoading && items.length === 0 && <p className="text-sm text-muted-foreground p-8 text-center">Nenhuma exceção cadastrada. Adicione feriados ou dias especiais com antecedência.</p>}
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-5 py-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", e.type === "CLOSED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
              {e.type === "CLOSED" ? <Ban className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium capitalize">{fmt(e.date)}</p>
              <p className="text-xs text-muted-foreground">
                {e.type === "CLOSED" ? "Fechado" : `Horário especial: ${e.openingTime}–${e.closingTime}`}
                {" · "}{docName(e.doctorId)}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <button onClick={() => remove(e.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center md:p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Nova exceção</h3>
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["CLOSED", "CUSTOM_HOURS"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      className={cn("flex-1 py-2 text-xs font-medium", form.type === t ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground")}>
                      {t === "CLOSED" ? "Fechado (feriado)" : "Horário especial"}
                    </button>
                  ))}
                </div>
              </div>
              {form.type === "CUSTOM_HOURS" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Abertura</label>
                    <input type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Fechamento</label>
                    <input type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Aplica-se a</label>
                <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white">
                  <option value="">Toda a clínica</option>
                  {doctors.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Observação (opcional)</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ex: Feriado municipal" className="w-full text-sm border border-border rounded-lg px-3 py-2" />
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <button onClick={save} disabled={saving} className="w-full py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
