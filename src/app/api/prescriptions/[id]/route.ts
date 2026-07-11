import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { getSignedUrl, deleteFile } from "@/lib/storage";

export const runtime = "nodejs";
const CLINICAL_ROLES = ["ADMIN", "DOCTOR", "SUPER_ADMIN"];

// URL assinada do PDF da receita (para baixar / imprimir)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rx = await prisma.prescription.findUnique({ where: { id: params.id } });
  if (!rx || rx.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!rx.pdfPath) return NextResponse.json({ error: "PDF não disponível" }, { status: 404 });

  try {
    const url = await getSignedUrl(rx.pdfPath, 3600);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Falha ao gerar link" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getSessionUser();
  if (!user || !CLINICAL_ROLES.includes(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rx = await prisma.prescription.findUnique({ where: { id: params.id } });
  if (!rx || rx.clinicId !== clinicId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (rx.pdfPath) await deleteFile(rx.pdfPath).catch(() => {});
  await prisma.prescription.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
