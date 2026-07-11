"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Stethoscope, Plus, Trash2 } from "lucide-react";
import DoctorSelect from "@/components/DoctorSelect";

const CLINICAL = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];
const FIELDS: { key: "chiefComplaint" | "evolution" | "assessment" | "plan"; label: string }[] = [
  { key: "chiefComplaint", label: "Queixa principal" },
  { key: "evolution", label: "Evolução / história" },
  { key: "assessment", label: "Avaliação / diagnóstico (CID)" },
  { key: "plan", label: "Conduta / prescrição" },
];
const EMPTY = { chiefComplaint: "", evolution: "", assessment: "", plan: "" };

export default function PatientMedicalRecords({ patientId }: { patientId: string }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const allowed = CLINICAL.includes(role);
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"; // precisa escolher o médico

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [doctorId, setDoctorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/medical-records?patientId=${patientId}`);
      setItems(res.ok ? await res.json() : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (allowed) load(); else setLoading(false); /* eslint-disable-next-line */ }, [patientId, allowed]);

  if (!session || !allowed) return null; // recepção não vê o prontuário

  async function save() {
    if (!Object.values(form).some((v) => v.trim())) { setErr("Preencha ao menos um campo"); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/medical-records", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, ...form, doctorId: doctorId || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Erro ao salvar");
      setForm({ ...EMPTY }); setOpen(false); load();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este registro do prontuário?")) return;
    await fetch(`/api/medical-records/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Stethoscope className="w-4 h-4 text-emerald-600" /> Prontuário</h2>
        <button onClick={() => { setForm({ ...EMPTY }); setErr(null); setOpen((o) => !o); }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Novo registro
        </button>
      </div>

      {open && (
        <div className="p-5 border-b border-border bg-muted/20 space-y-2.5">
          {isAdmin && <DoctorSelect value={doctorId} onChange={setDoctorId} />}
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1">{f.label}</label>
              <textarea value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={2}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          ))}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar registro"}
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum registro no prontuário ainda.</p>}
        {items.map((r) => (
          <div key={r.id} className="px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}{r.doctorName ? ` · ${r.doctorName}` : ""}</p>
              <button onClick={() => remove(r.id)} title="Excluir" className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {FIELDS.map((f) => r[f.key] && (
              <div key={f.key} className="mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</span>
                <p className="text-sm whitespace-pre-wrap">{r[f.key]}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
