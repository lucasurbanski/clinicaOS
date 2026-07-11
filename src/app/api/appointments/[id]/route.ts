import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userDoctorId = (session?.user as any)?.doctorId as string | undefined;

  const existing = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: any = { ...body };

  // Anotações do médico: somente o doctor responsável (ou ADMIN/RECEPTIONIST) pode editar
  if (body.notes !== undefined && role === "DOCTOR" && userDoctorId && existing.doctorId !== userDoctorId) {
    return NextResponse.json({ error: "Forbidden — outro médico" }, { status: 403 });
  }

  // Se trocar o serviço, re-deriva type/isReturn
  if (body.serviceId !== undefined) {
    if (body.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: body.serviceId },
        select: { type: true, clinicId: true },
      });
      if (service && service.clinicId === clinicId) {
        data.type = service.type || "CONSULTATION";
        data.isReturn = data.type === "RETURN";
      }
    } else {
      data.type = "CONSULTATION";
      data.isReturn = false;
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id: params.id },
    data,
    include: { patient: { select: { id: true, name: true } } },
  });

  if (body.status === "COMPLETED" && appointment.value) {
    await prisma.patient.update({
      where: { id: appointment.patientId },
      data: { totalSpent: { increment: appointment.value } },
    });
  }

  return NextResponse.json(appointment);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.appointment.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true });
}
