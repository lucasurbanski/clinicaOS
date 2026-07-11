import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.doctor.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.doctor.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.specialty !== undefined && { specialty: body.specialty }),
      ...(body.crm !== undefined && { crm: body.crm }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.availableDays !== undefined && { availableDays: body.availableDays }),
      ...(body.openingTime !== undefined && { openingTime: body.openingTime || null }),
      ...(body.closingTime !== undefined && { closingTime: body.closingTime || null }),
    },
  });

  // Atualiza serviços do médico (DoctorService): substitui o conjunto
  if (Array.isArray(body.serviceIds)) {
    await prisma.doctorService.deleteMany({ where: { doctorId: params.id } });
    if (body.serviceIds.length > 0) {
      await prisma.doctorService.createMany({
        data: body.serviceIds.map((serviceId: string) => ({ doctorId: params.id, serviceId })),
        skipDuplicates: true,
      });
    }
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apts = await prisma.appointment.count({ where: { doctorId: params.id } });
  if (apts > 0) {
    // soft delete: apenas desativa
    await prisma.doctor.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }

  const result = await prisma.doctor.deleteMany({ where: { id: params.id, clinicId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
