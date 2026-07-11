import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as any;
  if (user.role !== "SUPER_ADMIN") return null;
  return user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clinics = await prisma.clinic.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: { select: { users: true, patients: true, appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(clinics);
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const clinic = await prisma.clinic.create({
    data: {
      name: body.name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      _count: { select: { users: true, patients: true, appointments: true } },
    },
  });

  return NextResponse.json(clinic, { status: 201 });
}
