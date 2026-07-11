import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({
    where: { clinicId },
    include: {
      pricings: true,
      insurancePlanServices: {
        include: { insurancePlan: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pricings, insurancePlanPrices, ...body } = await req.json();

  const service = await prisma.service.create({
    data: {
      ...body,
      clinicId,
      ...(pricings?.length ? { pricings: { create: pricings } } : {}),
      ...(insurancePlanPrices?.length
        ? {
            insurancePlanServices: {
              create: insurancePlanPrices.map((p: { planId: string; cardValue?: number; cashValue?: number; pixValue?: number }) => ({
                insurancePlanId: p.planId,
                cardValue: p.cardValue ?? null,
                cashValue: p.cashValue ?? null,
                pixValue: p.pixValue ?? null,
              })),
            },
          }
        : {}),
    },
    include: {
      pricings: true,
      insurancePlanServices: {
        include: { insurancePlan: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(service, { status: 201 });
}
