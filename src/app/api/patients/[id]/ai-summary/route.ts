import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];
const WEBHOOK_URL =
  process.env.N8N_RESUMO_PACIENTE_URL ||
  "https://quietcicada-n8n.cloudfy.live/webhook/resumo-paciente";

// dateTime é BR local naive (Prisma devolve com Z) → ler em UTC p/ manter o horário BR.
function fmtDate(d: Date | string | null) {
  if (!d) return "";
  const s = new Date(d).toISOString();
  const [y, m, day] = s.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}
function fmtDateTime(d: Date | string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(d)} ${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}`;
}

const STATUS_PT: Record<string, string> = {
  SCHEDULED: "agendada", CONFIRMED: "confirmada", COMPLETED: "concluída",
  CANCELLED: "CANCELADA", NO_SHOW: "FALTA", PENDING: "pendente",
};

// Gera o resumo do paciente por IA (reusa o OpenRouter via webhook n8n).
// Chamado ao abrir a ficha/atendimento — não persiste (cache é do lado do cliente).
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const patientId = params.id;

  // ISOLAMENTO ENTRE MÉDICOS: um médico só pode ver o SEU próprio histórico com
  // o paciente. Filtramos no dado (não na IA) — os registros de outros médicos
  // nem chegam ao modelo. ADMIN/SUPER_ADMIN (gestão da clínica) veem tudo.
  // DOCTOR sem doctorId (mal configurado) → sentinela que não casa com nada
  // (vê nada, nunca o histórico dos outros).
  const scopeDoctorId = user.role === "DOCTOR" ? user.doctorId || "__none__" : null;
  const docFilter = scopeDoctorId ? { doctorId: scopeDoctorId } : {};

  const [patient, appts, records, rxs, interactions] = await Promise.all([
    prisma.patient.findUnique({ where: { id: patientId }, select: { name: true, birthDate: true, clinicId: true } }),
    prisma.appointment.findMany({
      where: { clinicId, patientId, ...docFilter },
      orderBy: { dateTime: "desc" }, take: 15,
      select: { dateTime: true, status: true, service: { select: { name: true } }, doctor: { select: { name: true, specialty: true } } },
    }),
    prisma.medicalRecord.findMany({
      where: { clinicId, patientId, ...docFilter }, orderBy: { createdAt: "desc" }, take: 10,
      select: { createdAt: true, doctorName: true, chiefComplaint: true, evolution: true, assessment: true, plan: true },
    }),
    prisma.prescription.findMany({
      where: { clinicId, patientId, ...docFilter }, orderBy: { createdAt: "desc" }, take: 10,
      select: { createdAt: true, doctorName: true, content: true },
    }),
    // Interações não têm doctorId (são de nível clínica, ex.: lembretes/faltas) e
    // podem referenciar consultas de outros médicos — só entram na visão de gestão.
    scopeDoctorId
      ? Promise.resolve([] as { date: Date; type: string; description: string }[])
      : prisma.patientInteraction.findMany({
          where: { patientId }, orderBy: { date: "desc" }, take: 15,
          select: { date: true, type: true, description: true },
        }),
  ]);
  if (!patient || patient.clinicId !== clinicId)
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

  // idade
  let idade = "";
  if (patient.birthDate) {
    const b = new Date(patient.birthDate);
    const now = new Date();
    let age = now.getUTCFullYear() - b.getUTCFullYear();
    const mDiff = now.getUTCMonth() - b.getUTCMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < b.getUTCDate())) age--;
    idade = `, ${age} anos`;
  }

  const lines: string[] = [`Paciente: ${patient.name}${idade}.`];
  if (scopeDoctorId) {
    lines.push("Contexto: este resumo cobre APENAS o histórico do paciente com o médico que está logado agora (não inclui atendimentos com outros profissionais).");
  }

  if (appts.length) {
    lines.push(`\nATENDIMENTOS (${appts.length} mais recentes):`);
    for (const a of appts) {
      const doc = a.doctor ? `${a.doctor.name}${a.doctor.specialty ? ` (${a.doctor.specialty})` : ""}` : "—";
      lines.push(`- ${fmtDateTime(a.dateTime)} · ${a.service?.name || "Consulta"} · ${doc} · ${STATUS_PT[a.status] || a.status}`);
    }
  }
  if (records.length) {
    lines.push(`\nPRONTUÁRIO:`);
    for (const r of records) {
      const parts = [
        r.chiefComplaint && `Queixa: ${r.chiefComplaint}`,
        r.evolution && `Evolução: ${r.evolution}`,
        r.assessment && `Avaliação: ${r.assessment}`,
        r.plan && `Conduta: ${r.plan}`,
      ].filter(Boolean).join(" | ");
      lines.push(`- ${fmtDate(r.createdAt)}${r.doctorName ? ` (${r.doctorName})` : ""}: ${parts}`);
    }
  }
  if (rxs.length) {
    lines.push(`\nRECEITAS:`);
    for (const r of rxs) lines.push(`- ${fmtDate(r.createdAt)}: ${r.content.replace(/\s+/g, " ").slice(0, 300)}`);
  }
  if (interactions.length) {
    lines.push(`\nINTERAÇÕES:`);
    for (const i of interactions) lines.push(`- ${fmtDate(i.date)} [${i.type}] ${i.description}`);
  }
  if (appts.length + records.length + rxs.length + interactions.length === 0) {
    lines.push(scopeDoctorId
      ? "\n(Primeiro atendimento deste paciente com você — sem histórico anterior seu registrado.)"
      : "\n(Sem histórico registrado — paciente novo ou primeira consulta.)");
  }

  const patientText = lines.join("\n");

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientText }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ error: "Falha ao gerar o resumo. " + t.slice(0, 200) }, { status: 502 });
    }
    const j = await res.json().catch(() => ({}));
    const summary = (j.summary || j.text || "").trim();
    if (!summary) return NextResponse.json({ error: "A IA não retornou um resumo." }, { status: 502 });
    return NextResponse.json({ summary, at: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: "Não foi possível contatar o serviço de IA: " + (e.message || "") }, { status: 502 });
  }
}
