"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";

const CLINICAL = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

export default function PatientAiSummary({ patientId }: { patientId: string }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const allowed = CLINICAL.includes(role);

  const [summary, setSummary] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);

  const cacheKey = `aisum:${patientId}`;

  async function generate() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/ai-summary`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao gerar resumo");
      setSummary(j.summary); setAt(j.at);
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ summary: j.summary, at: j.at })); } catch {}
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  // Auto-gera ao abrir o atendimento (usa cache da sessão se já gerou antes).
  useEffect(() => {
    if (!allowed || started.current) return;
    started.current = true;
    let cached: any = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null"); } catch {}
    if (cached?.summary) { setSummary(cached.summary); setAt(cached.at); }
    else generate();
    // eslint-disable-next-line
  }, [patientId, allowed]);

  if (!session || !allowed) return null;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-white rounded-xl border border-violet-200">
      <div className="px-5 py-3 border-b border-violet-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-violet-800">
          <Sparkles className="w-4 h-4 text-violet-600" /> Resumo do paciente (IA)
        </h2>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 rounded-lg disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? "Gerando..." : "Atualizar"}
        </button>
      </div>
      <div className="p-5">
        {loading && !summary && (
          <div className="flex items-center gap-2 text-sm text-violet-700">
            <Loader2 className="w-4 h-4 animate-spin" /> A IA está analisando o histórico do paciente...
          </div>
        )}
        {err && (
          <div className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{err} <button onClick={generate} className="underline">Tentar novamente</button></span>
          </div>
        )}
        {summary && (
          <>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800">{summary}</p>
            {at && <p className="text-[10px] text-muted-foreground mt-3">Gerado por IA em {new Date(at).toLocaleString("pt-BR")} · confira sempre as informações.</p>}
          </>
        )}
        {!loading && !summary && !err && (
          <p className="text-xs text-muted-foreground">Clique em "Atualizar" para gerar o resumo.</p>
        )}
      </div>
    </div>
  );
}
