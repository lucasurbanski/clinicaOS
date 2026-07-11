import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const patchRole = (session?.user as any)?.role;
  if (patchRole !== "ADMIN" && patchRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing || existing.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.doctorId !== undefined) data.doctorId = body.doctorId;
  if (body.password) data.password = await bcrypt.hash(body.password, 10);

  // Se virou DOCTOR sem doctorId, mantém null. Se deixou de ser DOCTOR, limpa doctorId.
  if (data.role && data.role !== "DOCTOR") data.doctorId = null;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true, doctorId: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const delRole = (session?.user as any)?.role;
  if (delRole !== "ADMIN" && delRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if ((session?.user as any)?.id === params.id) {
    return NextResponse.json({ error: "Não pode deletar a si mesmo" }, { status: 400 });
  }

  const result = await prisma.user.deleteMany({ where: { id: params.id, clinicId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
