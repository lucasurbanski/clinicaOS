import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      phone: true,
      email: true,
      address: true,
      openingTime: true,
      closingTime: true,
      availableDays: true,
      defaultDuration: true,
      intervalBetween: true,
      maxBookingDays: true,
      sameDayLeadMinutes: true,
      evolutionInstance: true,
      agentName: true,
      agentTone: true,
      agentDescription: true,
      timezone: true,
      menuPermissions: true,
      confirmationMessage: true,
      reminder12hMessage: true,
      reminderMessage: true,
      reminder24hEnabled: true,
    },
  });
  return NextResponse.json(clinic);
}

export async function PATCH(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clinicName, doctorName: _ignored, ...rest } = await req.json();

  await prisma.clinic.update({
    where: { id: clinicId },
    data: { ...(clinicName !== undefined && { name: clinicName }), ...rest },
  });
  return NextResponse.json({ ok: true });
}
