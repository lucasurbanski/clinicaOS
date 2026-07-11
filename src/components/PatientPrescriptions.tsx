"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileSignature, Plus, Trash2, Printer, Loader2, ClipboardList, MessageCircle, Check } from "lucide-react";

const CLINICAL = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

export default function PatientPrescriptions({ patientId }: { patientId: string }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const allowed = CLINICAL.includes(role);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/prescriptions?patientId=${patientId}`);
      setItems(res.ok ? await res.json() : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (allowed) load(); else setLoading(false); /* eslint-disable-next-line */ }, [patientId, allowed]);

  if (!session || !allowed) return null;

  async function pullFromRecord() {
    const res = await fetch(`/api/medical-records?patientId=${patientId}`);
    if (!res.ok) return;
    const recs = await res.json();
    const plan = recs.find((r: any) => r.plan)?.plan;
    if (plan) setContent((c) => (c ? c + "\n" + plan : plan));
  }

  async function save() {
    if (!content.trim()) { setErr("Escreva a prescrição"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, content }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao salvar");
      setContent(""); setOpen(false); load();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function print(id: string) {
    const res = await fetch(`/api/prescriptions/${id}`);
    const j = await res.json();
    if (res.ok && j.url) window.open(j.url, "_blank");
  }

  async function sendWhatsapp(id: string) {
    setSending(id); setErr(null);
    try {
      const res = await fetch(`/api/prescriptions/${id}/send-whatsapp`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Falha ao enviar");
      setSent((s) => ({ ...s, [id]: true }));
    } catch (e: any) { setErr(e.message); } finally { setSending(null); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta receita?")) return;
    await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2"><FileSignature className="w-4 h-4 text-violet-600" /> Receitas</h2>
        <button onClick={() => { setContent(""); setErr(null); setOpen((o) => !o); }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Nova receita
        </button>
      </div>

      {open && (
        <div className="p-5 border-b border-border bg-muted/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Prescrição (medicamentos / orientações)</label>
            <button onClick={pullFromRecord} className="text-[11px] text-primary hover:underline flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Puxar da conduta</button>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
            placeholder={"Ex:\n1. Amoxicilina 500mg — 1 comprimido de 8/8h por 7 dias\n2. Dipirona 1g — se dor ou febre"}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...</> : "Salvar e gerar PDF"}
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}

      {!open && err && <p className="text-xs text-red-600 px-5 py-2">{err}</p>}

      <div className="divide-y divide-border/50">
        {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhuma receita emitida ainda.</p>}
        {items.map((r) => (
          <div key={r.id} className="px-5 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}{r.doctorName ? ` · ${r.doctorName}` : ""}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => print(r.id)} title="Imprimir / baixar PDF" className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg"><Printer className="w-3.5 h-3.5" /> Imprimir</button>
                <button onClick={() => sendWhatsapp(r.id)} disabled={sending === r.id} title="Enviar por WhatsApp" className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50">
                  {sending === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sent[r.id] ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  {sending === r.id ? "Enviando" : sent[r.id] ? "Enviado" : "WhatsApp"}
                </button>
                <button onClick={() => remove(r.id)} title="Excluir" className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap line-clamp-3 text-muted-foreground">{r.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
