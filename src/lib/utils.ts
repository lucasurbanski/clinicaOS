import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

export function formatDateTimeNaive(date: string | Date) {
  // Para campos gravados como BR local naive (ex: Appointment.dateTime). Exibe o
  // valor exatamente como gravado, sem conversão do fuso do navegador.
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(date));
}

export function formatTime(date: string | Date) {
  // Appointment.dateTime é BR local (wall-clock) armazenado como naive; o Prisma o
  // devolve com sufixo Z (UTC). Formatar em UTC exibe o horário como gravado, sem
  // conversão do fuso do navegador (consistente com a aba Agenda, que usa getUTCHours).
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "UTC" }).format(new Date(date));
}

export function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Realizado",
  NO_SHOW: "Faltou",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SCHEDULED: "bg-sky-100 text-sky-800 border-sky-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  NO_SHOW: "bg-gray-100 text-gray-600 border-gray-200",
};

export const PROFILE_LABELS: Record<string, string> = {
  NEW: "Novo",
  RECURRING: "Recorrente",
  HIGH_VALUE: "Alto Valor",
  INACTIVE: "Inativo",
  PENDING_RETURN: "Retorno Pendente",
  AT_RISK: "Em Risco",
};

export const PROFILE_COLORS: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800",
  RECURRING: "bg-indigo-100 text-indigo-800",
  HIGH_VALUE: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-gray-100 text-gray-600",
  PENDING_RETURN: "bg-orange-100 text-orange-800",
  AT_RISK: "bg-red-100 text-red-700",
};

export const OPPORTUNITY_LABELS: Record<string, string> = {
  REACTIVATION: "Reativação",
  PENDING_RETURN: "Retorno Pendente",
  HIGH_VALUE_FOLLOW_UP: "Follow-up Alto Valor",
  NEW_PATIENT_FOLLOW_UP: "Acompanhamento Novo Paciente",
  COMPLEMENTARY_SERVICE: "Serviço Complementar",
  APPOINTMENT_CONFIRMATION: "Confirmação de Consulta",
};
