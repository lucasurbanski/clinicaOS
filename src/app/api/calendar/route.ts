import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { prisma } from "@/lib/prisma";

// Exceções de calendário (feriados / horários especiais) da clínica
export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = await prisma.clinicCalendarException.findMany({
    where: { clinicId, date: { gte: today } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.date || !body.type) {
    return NextResponse.json({ error: "Data e tipo são obrigatórios" }, { status: 400 });
  }
  if (!["CLOSED", "CUSTOM_HOURS"].includes(body.type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const created = await prisma.clinicCalendarException.create({
    data: {
      clinicId,
      date: new Date(body.date + "T00:00:00Z"),
      type: body.type,
      openingTime: body.type === "CUSTOM_HOURS" ? body.openingTime || null : null,
      closingTime: body.type === "CUSTOM_HOURS" ? body.closingTime || null : null,
      doctorId: body.doctorId || null,
      note: body.note || null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const result = await prisma.clinicCalendarException.deleteMany({ where: { id, clinicId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
