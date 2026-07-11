import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser, doctorScopeId } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { parseISO, startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const view = searchParams.get("view") || "day";

  // DOCTOR só vê a própria agenda; admin/recepção veem todos ou filtram por ?doctorId=
  const user = await getSessionUser();
  const scopedDoctorId = doctorScopeId(user) ?? searchParams.get("doctorId") ?? undefined;

  if (!dateStr) return NextResponse.json([]);

  const baseDate = parseISO(dateStr);
  let start: Date, end: Date;

  if (view === "week") {
    start = startOfWeek(baseDate, { weekStartsOn: 1 });
    end = endOfWeek(baseDate, { weekStartsOn: 1 });
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(baseDate); start.setHours(0, 0, 0, 0);
    end = new Date(baseDate); end.setHours(23, 59, 59, 999);
  }

  const appointments = await prisma.appointment.findMany({
    where: { clinicId, ...(scopedDoctorId ? { doctorId: scopedDoctorId } : {}), dateTime: { gte: start, lte: end }, status: { not: "CANCELLED" } },
    include: {
      patient: { select: { id: true, name: true, phone: true, profile: true } },
      doctor: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, type: true } },
    },
    orderBy: { dateTime: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  let { doctorId } = body;
  if (!doctorId) {
    const doctor = await prisma.doctor.findFirst({ where: { clinicId, active: true } });
    doctorId = doctor?.id;
  }

  // Deriva type e isReturn a partir do Service escolhido (regra do backend)
  let derivedType = "CONSULTATION";
  let derivedIsReturn = false;
  if (body.serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: body.serviceId },
      select: { type: true, clinicId: true },
    });
    if (service && service.clinicId === clinicId) {
      derivedType = service.type || "CONSULTATION";
      derivedIsReturn = derivedType === "RETURN";
    }
  } else if (body.isReturn) {
    derivedType = "RETURN";
    derivedIsReturn = true;
  }

  const appointment = await prisma.appointment.create({
    data: {
      clinicId,
      patientId: body.patientId,
      doctorId,
      serviceId: body.serviceId || null,
      dateTime: new Date(body.dateTime),
      status: "CONFIRMED",
      type: derivedType,
      isReturn: derivedIsReturn,
      insurance: body.insurance || null,
      value: body.value || null,
      notes: body.notes || null,
      duration: body.duration || 30,
    },
    include: {
      patient: { select: { id: true, name: true } },
      doctor: { select: { name: true } },
      service: { select: { name: true, type: true } },
    },
  });

  await prisma.patient.update({
    where: { id: body.patientId },
    data: { lastConsultDate: new Date(body.dateTime), totalAppointments: { increment: 1 } },
  });

  return NextResponse.json(appointment, { status: 201 });
}
