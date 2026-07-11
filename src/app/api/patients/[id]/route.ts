import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      tags: true,
      interactions: { orderBy: { date: "desc" } },
      appointments: {
        include: { service: { select: { name: true } }, doctor: { select: { name: true } } },
        orderBy: { dateTime: "desc" },
        take: 50,
      },
    },
  });

  if (!patient || patient.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patient);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const patient = await prisma.patient.update({ where: { id: params.id }, data: body });
  return NextResponse.json(patient);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== user.clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.patient.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
