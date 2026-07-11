import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tickets = await prisma.humanTicket.findMany({
    where: { clinicId, ...(status ? { status } : {}) },
    include: {
      patient: { select: { id: true, name: true, phone: true, profile: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const ticket = await prisma.humanTicket.create({
    data: {
      clinicId,
      patientId: body.patientId,
      conversationId: body.conversationId ?? null,
      interactionId: body.interactionId ?? null,
      reason: body.reason ?? null,
      status: body.status ?? "PENDING",
    },
    include: { patient: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(ticket, { status: 201 });
}
