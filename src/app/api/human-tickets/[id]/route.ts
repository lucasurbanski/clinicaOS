import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;

  const existing = await prisma.humanTicket.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: any = {};

  if (body.action === "ASSUME") {
    data.status = "IN_PROGRESS";
    data.assignedTo = userId;
  } else if (body.action === "RESOLVE") {
    data.status = "RESOLVED";
    data.resolvedAt = new Date();
    if (body.resolutionNotes !== undefined) data.resolutionNotes = body.resolutionNotes;
    if (!existing.assignedTo) data.assignedTo = userId;
  } else if (body.action === "REOPEN") {
    data.status = "PENDING";
    data.assignedTo = null;
    data.resolvedAt = null;
  } else {
    if (body.status !== undefined) data.status = body.status;
    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo;
    if (body.resolutionNotes !== undefined) data.resolutionNotes = body.resolutionNotes;
    if (body.reason !== undefined) data.reason = body.reason;
  }

  const ticket = await prisma.humanTicket.update({
    where: { id: params.id },
    data,
    include: { patient: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(ticket);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.humanTicket.deleteMany({ where: { id: params.id, clinicId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
