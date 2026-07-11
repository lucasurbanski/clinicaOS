import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";

// Prontuário é dado clínico sensível: apenas ADMIN, DOCTOR, SUPER_ADMIN.
const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão para ver o prontuário" }, { status: 403 });

  const patientId = new URL(req.url).searchParams.get("patientId");
  if (!patientId) return NextResponse.json([]);

  const records = await prisma.medicalRecord.findMany({
    where: { clinicId, patientId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json();
  if (!body.patientId) return NextResponse.json({ error: "patientId é obrigatório" }, { status: 400 });
  if (![body.chiefComplaint, body.evolution, body.assessment, body.plan].some((v) => v && String(v).trim())) {
    return NextResponse.json({ error: "Preencha ao menos um campo do prontuário" }, { status: 400 });
  }

  // Snapshot do médico (por padrão o médico logado)
  const doctorId = body.doctorId || user.doctorId || null;
  let doctorName: string | null = body.doctorName || null;
  if (!doctorName && doctorId) {
    const doc = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { name: true } });
    doctorName = doc?.name ?? null;
  }

  const created = await prisma.medicalRecord.create({
    data: {
      clinicId,
      patientId: body.patientId,
      appointmentId: body.appointmentId || null,
      doctorId,
      doctorName,
      chiefComplaint: body.chiefComplaint || null,
      evolution: body.evolution || null,
      assessment: body.assessment || null,
      plan: body.plan || null,
      createdBy: user.id,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
