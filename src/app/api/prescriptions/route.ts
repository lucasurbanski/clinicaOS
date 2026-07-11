import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { generatePrescriptionPdf } from "@/lib/prescription-pdf";
import { uploadFile } from "@/lib/storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId) return NextResponse.json([]);
  const items = await prisma.prescription.findMany({
    where: { clinicId, patientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, doctorName: true, doctorCrm: true, pdfPath: true, createdAt: true },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  if (!body.patientId || !body.content?.trim()) {
    return NextResponse.json({ error: "Paciente e conteúdo da receita são obrigatórios" }, { status: 400 });
  }

  const [clinic, patient] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true, address: true, phone: true, logoUrl: true } }),
    prisma.patient.findUnique({ where: { id: body.patientId }, select: { name: true, clinicId: true } }),
  ]);
  if (!patient || patient.clinicId !== clinicId) return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });

  // Atribuição do médico (essencial p/ isolamento). DOCTOR → próprio; ADMIN → escolha
  // do form, ou o único médico ativo, senão exige seleção.
  let doctorId: string | null = user.role === "DOCTOR" ? user.doctorId || null : body.doctorId || null;
  if (!doctorId) {
    const active = await prisma.doctor.findMany({ where: { clinicId, active: true }, select: { id: true } });
    if (active.length === 1) doctorId = active[0].id;
    else if (active.length > 1) return NextResponse.json({ error: "Selecione o médico responsável pela receita" }, { status: 400 });
  }
  let doctorName: string | null = null, doctorCrm: string | null = null;
  if (doctorId) {
    const doc = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { name: true, crm: true } });
    doctorName = doc?.name ?? null; doctorCrm = doc?.crm ?? null;
  }

  const dateStr = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");

  let pdfPath: string | null = null;
  try {
    const pdf = await generatePrescriptionPdf({
      clinicName: clinic?.name || "Clínica",
      clinicAddress: clinic?.address, clinicPhone: clinic?.phone,
      patientName: patient.name, content: body.content,
      doctorName, doctorCrm: doctorCrm ? `CRM ${doctorCrm}` : null, dateStr,
    });
    pdfPath = `${clinicId}/${body.patientId}/receita-${randomUUID()}.pdf`;
    const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    await uploadFile(pdfPath, ab, "application/pdf");
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao gerar o PDF: " + (e.message || "") }, { status: 500 });
  }

  const created = await prisma.prescription.create({
    data: {
      clinicId, patientId: body.patientId, doctorId, doctorName, doctorCrm,
      content: body.content, pdfPath, createdBy: user.id,
    },
    select: { id: true, content: true, doctorName: true, doctorCrm: true, pdfPath: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
