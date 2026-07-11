import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const profile = searchParams.get("profile") || "";

  const where = {
    clinicId,
    ...(profile ? { profile } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: { tags: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({ data: patients, total });
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Duplicate check: same name (case-insensitive) + last 4 digits of phone match
  const last4New = (body.phone as string)?.slice(-4);
  if (last4New && body.name) {
    const sameName = await prisma.patient.findMany({
      where: { clinicId, name: { equals: body.name, mode: "insensitive" } },
      select: { id: true, phone: true },
    });
    const duplicate = sameName.find((p) => p.phone?.slice(-4) === last4New);
    if (duplicate) {
      return NextResponse.json(
        { error: "duplicate", message: "Já existe um paciente com este nome e telefone similar cadastrado." },
        { status: 409 }
      );
    }
  }

  const patient = await prisma.patient.create({
    data: { ...body, clinicId, firstConsultDate: new Date(), lastConsultDate: new Date() },
  });

  return NextResponse.json(patient, { status: 201 });
}
