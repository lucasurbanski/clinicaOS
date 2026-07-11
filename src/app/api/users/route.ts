import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const sessionRole = (session?.user as any)?.role;
  if (sessionRole !== "ADMIN" && sessionRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { clinicId },
    select: { id: true, email: true, name: true, role: true, doctorId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const postRole = (session?.user as any)?.role;
  if (postRole !== "ADMIN" && postRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "email, password e name são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { email: body.email, clinicId },
  });
  if (existing) return NextResponse.json({ error: "E-mail já existe nesta clínica" }, { status: 409 });

  const role = body.role ?? "RECEPTIONIST";
  let doctorId: string | null = body.doctorId ?? null;

  if (role === "DOCTOR" && doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.clinicId !== clinicId) {
      return NextResponse.json({ error: "Doctor não pertence a esta clínica" }, { status: 400 });
    }
  } else if (role !== "DOCTOR") {
    doctorId = null;
  }

  const hash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      clinicId,
      email: body.email,
      password: hash,
      name: body.name,
      role,
      doctorId,
    },
    select: { id: true, email: true, name: true, role: true, doctorId: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
