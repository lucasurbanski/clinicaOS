import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.insurancePlan.findMany({
    where: { clinicId },
    include: {
      services: {
        include: { service: { select: { id: true, name: true, value: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, serviceIds } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const plan = await prisma.insurancePlan.create({
    data: {
      name: name.trim(),
      clinicId,
      services: {
        create: (serviceIds ?? []).map((serviceId: string) => ({ serviceId })),
      },
    },
    include: {
      services: {
        include: { service: { select: { id: true, name: true, value: true } } },
      },
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
