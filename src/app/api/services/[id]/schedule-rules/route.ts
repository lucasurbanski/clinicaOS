import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service || service.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rules = await prisma.serviceScheduleRule.findMany({
    where: { serviceId: params.id, clinicId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service || service.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const rule = await prisma.serviceScheduleRule.create({
    data: {
      clinicId,
      serviceId: params.id,
      availableDays: body.availableDays ?? "1,2,3,4,5",
      maxPerDay: body.maxPerDay ?? null,
      openingTime: body.openingTime ?? null,
      closingTime: body.closingTime ?? null,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
