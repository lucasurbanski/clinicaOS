"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Calendar, DollarSign, Clock, Tag, Pencil } from "lucide-react";
import { cn, formatDate, formatCurrency, formatDateTime, formatDateTimeNaive, PROFILE_COLORS, PROFILE_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import PatientAttachments from "@/components/PatientAttachments";
import PatientMedicalRecords from "@/components/PatientMedicalRecords";
import PatientPrescriptions from "@/components/PatientPrescriptions";
import PatientAiSummary from "@/components/PatientAiSummary";

function Timeline({ interactions }: { interactions: any[] }) {
  const TYPE_ICONS: Record<string, string> = {
    APPOINTMENT: "🩺", CANCELLATION: "❌", NO_SHOW: "😶", MESSAGE: "💬", RETURN: "🔄", NOTE: "📝",
  };
  const TYPE_LABELS: Record<string, string> = {
    APPOINTMENT: "Consulta", CANCELLATION: "Cancelamento", NO_SHOW: "Falta", MESSAGE: "Mensagem", RETURN: "Retorno", NOTE: "Observação",
  };
  return (
    <div className="space-y-3">
      {interactions.map((i) => (
        <div key={i.id} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0">{TYPE_ICONS[i.type] || "📋"}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{TYPE_LABELS[i.type] || i.type}</span>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(i.date)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{i.description}</p>
            {i.value && <p className="text-xs font-medium text-emerald-600 mt-0.5">{formatCurrency(i.value)}</p>}
          </div>
        </div>
      ))}
      {interactions.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma interação registrada</p>}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${id}`)
      .then((r) => r.json())
      .then((d) => { setPatient(d); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto animate-pulse">
      <div className="h-4 w-16 bg-muted rounded" />
      <div className="h-40 bg-muted rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-36 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    </div>
  );
  if (!patient) return <div className="p-6 text-muted-foreground text-sm">Paciente não encontrado.</div>;

  // dateTime é BR local naive (Prisma devolve com Z). Comparar contra "agora" em BR
  // (UTC-3) no mesmo referencial para não classificar consultas futuras como passadas.
  const nowBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const upcoming = patient.appointments.filter((a: any) => new Date(a.dateTime) >= nowBR && a.status !== "CANCELLED");
  const past = patient.appointments.filter((a: any) => new Date(a.dateTime) < nowBR || a.status === "COMPLETED");

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </Link>
        <Link
          href={`/pacientes?edit=${patient.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border rounded-lg hover:bg-muted"
        >
          <Pencil className="w-3.5 h-3.5" /> Editar paciente
        </Link>
      </div>

      {/* Header do paciente */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {patient.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold">{patient.name}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PROFILE_COLORS[patient.profile])}>
                {PROFILE_LABELS[patient.profile]}
              </span>
              {patient.tags.map((t: any) => (
                <span key={t.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  <Tag className="w-2.5 h-2.5" />{t.tag}
                </span>
              ))}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              {patient.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{patient.phone}</span>}
              {patient.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{patient.email}</span>}
              {patient.birthDate && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />Nasc: {formatDate(patient.birthDate)}</span>}
              {patient.insurance && <span className="flex items-center gap-1 text-xs text-muted-foreground">🏥 {patient.insurance}</span>}
              {patient.origin && <span className="flex items-center gap-1 text-xs text-muted-foreground">📍 {patient.origin}</span>}
            </div>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><DollarSign className="w-3 h-3" />Total gasto</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(patient.totalSpent)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Calendar className="w-3 h-3" />Consultas</p>
            <p className="text-xl font-bold mt-1">{patient.totalAppointments}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Clock className="w-3 h-3" />Última consulta</p>
            <p className="text-sm font-semibold mt-1">{patient.lastConsultDate ? formatDate(patient.lastConsultDate) : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Clock className="w-3 h-3" />Retorno médio</p>
            <p className="text-sm font-semibold mt-1">{patient.avgReturnDays ? `${patient.avgReturnDays} dias` : "—"}</p>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
            <p className="text-sm">{patient.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Consultas */}
        <div className="lg:col-span-2 space-y-4">
          <PatientAiSummary patientId={patient.id} />
          <PatientMedicalRecords patientId={patient.id} />
          <PatientPrescriptions patientId={patient.id} />
          <PatientAttachments patientId={patient.id} />
          {/* Próximas */}
          {upcoming.length > 0 && (
            <div className="bg-white rounded-xl border border-border">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-blue-700">Próximas consultas ({upcoming.length})</h2>
              </div>
              <div className="divide-y divide-border/50">
                {upcoming.map((a: any) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.service?.name || "Consulta"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTimeNaive(a.dateTime)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.value && <span className="text-xs font-semibold text-emerald-600">{formatCurrency(a.value)}</span>}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Histórico de consultas ({past.length})</h2>
            </div>
            <div className="divide-y divide-border/50">
              {past.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Sem histórico</p>}
              {past.slice(0, 10).map((a: any) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.service?.name || "Consulta"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTimeNaive(a.dateTime)} · {a.doctor?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.value && <span className="text-xs font-semibold text-muted-foreground">{formatCurrency(a.value)}</span>}
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-border">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Linha do tempo</h2>
          </div>
          <div className="p-5">
            <Timeline interactions={patient.interactions} />
          </div>
        </div>
      </div>
    </div>
  );
}
