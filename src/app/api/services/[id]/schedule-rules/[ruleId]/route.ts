import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; ruleId: string } },
) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rule = await prisma.serviceScheduleRule.findUnique({ where: { id: params.ruleId } });
  if (!rule || rule.clinicId !== clinicId || rule.serviceId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.serviceScheduleRule.update({
    where: { id: params.ruleId },
    data: {
      ...(body.availableDays !== undefined && { availableDays: body.availableDays }),
      ...(body.maxPerDay !== undefined && { maxPerDay: body.maxPerDay }),
      ...(body.openingTime !== undefined && { openingTime: body.openingTime }),
      ...(body.closingTime !== undefined && { closingTime: body.closingTime }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; ruleId: string } },
) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.serviceScheduleRule.deleteMany({
    where: { id: params.ruleId, clinicId, serviceId: params.id },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
