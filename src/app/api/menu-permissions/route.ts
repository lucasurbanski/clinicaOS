import { NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ menuPermissions: null });

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { menuPermissions: true },
  });

  return NextResponse.json({ menuPermissions: clinic?.menuPermissions ?? null });
}
