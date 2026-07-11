import { NextResponse } from "next/server";
import { getClinicId } from "@/lib/getClinicId";
import { getSessionUser, doctorScopeId } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";

export async function GET() {
  const clinicId = await getClinicId();
  if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // DOCTOR: estatísticas de consultas restritas à própria agenda
  const user = await getSessionUser();
  const scopedDoctorId = doctorScopeId(user);
  const docWhere = scopedDoctorId ? { doctorId: scopedDoctorId } : {};

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const tomorrowStart = addDays(todayStart, 1);
  const tomorrowEnd = addDays(todayEnd, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [
    todayAll, todayConfirmed, weekAppointments,
    monthRevenue, totalPatients, inactivePatients,
    pendingReturn, newPatients, tomorrowCount,
    totalTomorrow, todaySchedule, highValueInactive,
  ] = await Promise.all([
    prisma.appointment.count({ where: { clinicId, ...docWhere, dateTime: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } } }),
    prisma.appointment.count({ where: { clinicId, ...docWhere, dateTime: { gte: todayStart, lte: todayEnd }, status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { clinicId, ...docWhere, dateTime: { gte: weekStart, lte: weekEnd }, status: { not: "CANCELLED" } } }),
    prisma.appointment.aggregate({ where: { clinicId, ...docWhere, dateTime: { gte: monthStart, lte: monthEnd }, status: "COMPLETED", insurance: null }, _sum: { value: true } }),
    prisma.patient.count({ where: { clinicId } }),
    prisma.patient.count({ where: { clinicId, lastConsultDate: { lte: ninetyDaysAgo } } }),
    prisma.patient.count({ where: { clinicId, profile: "PENDING_RETURN" } }),
    prisma.patient.count({ where: { clinicId, firstConsultDate: { gte: thirtyDaysAgo } } }),
    prisma.appointment.count({ where: { clinicId, ...docWhere, dateTime: { gte: tomorrowStart, lte: tomorrowEnd }, status: { not: "CANCELLED" } } }),
    8,
    prisma.appointment.findMany({
      where: { clinicId, ...docWhere, dateTime: { gte: todayStart, lte: todayEnd }, status: { not: "CANCELLED" } },
      include: { patient: { select: { id: true, name: true, profile: true } }, service: { select: { name: true } }, doctor: { select: { name: true } } },
      orderBy: { dateTime: "asc" },
    }),
    prisma.patient.findMany({
      where: { clinicId, profile: "HIGH_VALUE", lastConsultDate: { lte: ninetyDaysAgo } },
      select: { id: true, name: true },
    }),
  ]);

  const response = NextResponse.json({
    stats: {
      todayAppointments: todayAll,
      todayConfirmed,
      weekAppointments,
      totalActivePatients: totalPatients,
      monthRevenue: monthRevenue._sum.value ?? 0,
      inactivePatients,
      pendingReturnPatients: pendingReturn,
      tomorrowOccupancy: Math.round((tomorrowCount / totalTomorrow) * 100),
      newPatientsMonth: newPatients,
    },
    todaySchedule,
    alerts: {
      inactiveCount: inactivePatients,
      pendingReturnCount: pendingReturn,
      tomorrowOccupancy: Math.round((tomorrowCount / totalTomorrow) * 100),
      highValueInactive,
    },
  });
  // Serve dado em cache por 60s, aceita stale por mais 5 minutos enquanto revalida
  response.headers.set("Cache-Control", "private, s-maxage=60, stale-while-revalidate=300");
  return response;
}
