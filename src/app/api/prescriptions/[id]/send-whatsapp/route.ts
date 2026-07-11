import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";
const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];
const WEBHOOK_URL =
  process.env.N8N_ENVIAR_DOCUMENTO_URL ||
  "https://quietcicada-n8n.cloudfy.live/webhook/enviar-documento";

// Envia o PDF da receita para o WhatsApp do paciente via webhook n8n
// (que reusa a credencial Evolution — nada sensível trafega pelo front).
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rx = await prisma.prescription.findUnique({ where: { id: params.id } });
  if (!rx || rx.clinicId !== clinicId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!rx.pdfPath) return NextResponse.json({ error: "PDF não disponível" }, { status: 404 });

  const [clinic, patient] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, evolutionInstance: true } }),
    prisma.patient.findUnique({ where: { id: rx.patientId }, select: { name: true, phone: true } }),
  ]);
  if (!patient?.phone)
    return NextResponse.json({ error: "Paciente sem telefone cadastrado" }, { status: 400 });
  if (!clinic?.evolutionInstance)
    return NextResponse.json({ error: "Clínica sem instância de WhatsApp configurada" }, { status: 400 });

  let pdfUrl: string;
  try {
    // link válido por 1h — tempo suficiente para o Evolution baixar o arquivo
    pdfUrl = await getSignedUrl(rx.pdfPath, 3600);
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao gerar link do PDF: " + (e.message || "") }, { status: 500 });
  }

  const firstName = patient.name.split(" ")[0];
  const caption = `Olá, ${firstName}! Segue a sua receita da ${clinic.name}. Qualquer dúvida, estamos à disposição.`;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instance: clinic.evolutionInstance,
        phone: patient.phone,
        pdfUrl,
        fileName: `receita-${firstName}.pdf`,
        caption,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ error: "Falha no envio pelo WhatsApp. " + t.slice(0, 200) }, { status: 502 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Não foi possível contatar o serviço de WhatsApp: " + (e.message || "") }, { status: 502 });
  }

  // registra a interação no histórico do paciente
  await prisma.patientInteraction
    .create({
      data: {
        patientId: rx.patientId,
        type: "MESSAGE",
        description: "Receita enviada por WhatsApp",
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
