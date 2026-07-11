import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.service.findUnique({ where: { id: params.id } });
  if (!service || service.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // pricings: [{ paymentMethod, value }] para CARD e CASH
  // insurancePlanPrices: [{ planId, value? }] para preços por convênio
  const { pricings, insurancePlanPrices, ...body } = await req.json();

  if (insurancePlanPrices !== undefined) {
    await prisma.insurancePlanService.deleteMany({ where: { serviceId: params.id } });
    if (insurancePlanPrices.length > 0) {
      await prisma.insurancePlanService.createMany({
        data: insurancePlanPrices.map((p: { planId: string; cardValue?: number; cashValue?: number; pixValue?: number }) => ({
          insurancePlanId: p.planId,
          serviceId: params.id,
          cardValue: p.cardValue ?? null,
          cashValue: p.cashValue ?? null,
          pixValue: p.pixValue ?? null,
        })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.service.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(pricings !== undefined ? { pricings: { deleteMany: {}, create: pricings } } : {}),
    },
    include: {
      pricings: true,
      insurancePlanServices: {
        include: { insurancePlan: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.service.deleteMany({ where: { id: params.id, clinicId: user.clinicId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
