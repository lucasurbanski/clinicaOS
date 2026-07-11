import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";
import { getSignedUrl, deleteFile } from "@/lib/storage";

export const runtime = "nodejs";

// Retorna uma URL assinada temporária para baixar/visualizar o arquivo
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const att = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!att || att.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const url = await getSignedUrl(att.path, 3600);
    return NextResponse.json({ url, fileName: att.fileName, mimeType: att.mimeType });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Falha ao gerar link" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const att = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!att || att.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteFile(att.path).catch(() => {}); // remove do storage (ignora falha)
  await prisma.attachment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
