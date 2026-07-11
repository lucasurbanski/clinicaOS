import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctors = await prisma.doctor.findMany({
    where: { clinicId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { doctorServices: { select: { serviceId: true } } },
  });
  // expõe serviceIds direto para o front
  const withServices = doctors.map((d) => ({
    ...d,
    serviceIds: d.doctorServices.map((ds) => ds.serviceId),
  }));
  return NextResponse.json(withServices);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const doctor = await prisma.doctor.create({
    data: {
      clinicId,
      name: body.name,
      specialty: body.specialty ?? null,
      crm: body.crm ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      active: body.active ?? true,
      availableDays: body.availableDays ?? "1,2,3,4,5",
      openingTime: body.openingTime || null,
      closingTime: body.closingTime || null,
    },
  });

  // serviços que o médico atende (DoctorService)
  if (Array.isArray(body.serviceIds) && body.serviceIds.length > 0) {
    await prisma.doctorService.createMany({
      data: body.serviceIds.map((serviceId: string) => ({ doctorId: doctor.id, serviceId })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json(doctor, { status: 201 });
}
