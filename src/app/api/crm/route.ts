import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const opportunities = await prisma.cRMOpportunity.findMany({
    where: { clinicId, status: "OPEN" },
    include: {
      patient: { select: { id: true, name: true, phone: true, profile: true, totalSpent: true, lastConsultDate: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  opportunities.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));

  return NextResponse.json(opportunities);
}

export async function PATCH(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();
  const opp = await prisma.cRMOpportunity.update({ where: { id }, data: { status } });
  return NextResponse.json(opp);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const opp = await prisma.cRMOpportunity.create({ data: { ...body, clinicId } });
  return NextResponse.json(opp, { status: 201 });
}
