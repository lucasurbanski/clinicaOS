import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.insurancePlan.findUnique({ where: { id: params.id } });
  if (!plan || plan.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, serviceIds, active } = await req.json();

  const updated = await prisma.insurancePlan.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(serviceIds !== undefined
        ? {
            services: {
              deleteMany: {},
              create: serviceIds.map((serviceId: string) => ({ serviceId })),
            },
          }
        : {}),
    },
    include: {
      services: {
        include: { service: { select: { id: true, name: true, value: true } } },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.insurancePlan.findUnique({ where: { id: params.id } });
  if (!plan || plan.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.insurancePlan.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
