"use client";
import { useEffect, useState, useRef } from "react";
import { Paperclip, Upload, Trash2, FileText, Loader2 } from "lucide-react";

const TYPE_LABELS: Record<string, string> = { EXAM: "Exame", PRESCRIPTION: "Receita", DOCUMENT: "Documento", OTHER: "Outro" };

function fmtSize(n?: number) {
  if (!n) return "";
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export default function PatientAttachments({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("EXAM");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/attachments?patientId=${patientId}`);
      setItems(res.ok ? await res.json() : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patientId", patientId);
      fd.append("type", type);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha no upload");
      await load();
    } catch (e2: any) { setErr(e2.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function view(id: string) {
    const res = await fetch(`/api/attachments/${id}`);
    const j = await res.json();
    if (res.ok && j.url) window.open(j.url, "_blank");
  }

  async function remove(id: string) {
    if (!confirm("Excluir este arquivo?")) return;
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="bg-white rounded-xl border border-border">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500" /> Arquivos & Exames</h2>
        <div className="flex items-center gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1 bg-white">
            <option value="EXAM">Exame</option>
            <option value="PRESCRIPTION">Receita</option>
            <option value="DOCUMENT">Documento</option>
            <option value="OTHER">Outro</option>
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Enviando..." : "Enviar"}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={onUpload} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
        </div>
      </div>
      {err && <p className="text-xs text-red-600 px-5 py-2">{err}</p>}
      <div className="divide-y divide-border/50">
        {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
        {!loading && items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum arquivo. Envie exames, receitas ou documentos (PDF, imagem...).</p>}
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <button onClick={() => view(a.id)} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate hover:text-primary">{a.fileName}</p>
              <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[a.type] || a.type} · {fmtSize(a.size)} · {new Date(a.createdAt).toLocaleDateString("pt-BR")}</p>
            </button>
            <button onClick={() => remove(a.id)} title="Excluir" className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
