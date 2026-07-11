import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";

const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rec = await prisma.medicalRecord.findUnique({ where: { id: params.id } });
  if (!rec || rec.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.medicalRecord.update({
    where: { id: params.id },
    data: {
      ...(body.chiefComplaint !== undefined && { chiefComplaint: body.chiefComplaint || null }),
      ...(body.evolution !== undefined && { evolution: body.evolution || null }),
      ...(body.assessment !== undefined && { assessment: body.assessment || null }),
      ...(body.plan !== undefined && { plan: body.plan || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rec = await prisma.medicalRecord.findUnique({ where: { id: params.id } });
  if (!rec || rec.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.medicalRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
