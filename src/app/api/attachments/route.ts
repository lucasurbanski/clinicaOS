import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Lista anexos (por paciente ou da clínica)
export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patientId = new URL(req.url).searchParams.get("patientId") || undefined;
  const items = await prisma.attachment.findMany({
    where: { clinicId, ...(patientId ? { patientId } : {}) },
    orderBy: { createdAt: "desc" },
    select: { id: true, patientId: true, appointmentId: true, type: true, fileName: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json(items);
}

// Upload de arquivo (multipart/form-data: file, patientId?, type?, appointmentId?)
export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });

  const patientId = (form.get("patientId") as string) || null;
  const appointmentId = (form.get("appointmentId") as string) || null;
  const type = (form.get("type") as string) || "DOCUMENT";

  // limite de 15 MB
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo excede 15 MB" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${clinicId}/${patientId || "clinica"}/${randomUUID()}-${safeName}`;

  try {
    const bytes = await file.arrayBuffer();
    await uploadFile(path, bytes, file.type);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Falha no upload" }, { status: 500 });
  }

  const created = await prisma.attachment.create({
    data: {
      clinicId, patientId, appointmentId, type,
      fileName: file.name, mimeType: file.type || null, size: file.size,
      path, uploadedBy: user?.id ?? null,
    },
    select: { id: true, fileName: true, type: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
