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

  // Atribuição do médico responsável (essencial p/ o isolamento entre médicos).
  // DOCTOR → sempre o próprio. ADMIN/SUPER_ADMIN → o que veio do form; se não veio
  // e a clínica só tem 1 médico ativo, usa esse; se tem vários, exige a escolha.
  let doctorId: string | null = user.role === "DOCTOR" ? user.doctorId || null : body.doctorId || null;
  if (!doctorId) {
    const active = await prisma.doctor.findMany({ where: { clinicId, active: true }, select: { id: true } });
    if (active.length === 1) doctorId = active[0].id;
    else if (active.length > 1) return NextResponse.json({ error: "Selecione o médico responsável pelo prontuário" }, { status: 400 });
  }
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
