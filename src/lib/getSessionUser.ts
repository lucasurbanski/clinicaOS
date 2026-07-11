import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export type SessionUser = { id: string; role: string; doctorId: string | null };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as any;
  return { id: u.id, role: u.role as string, doctorId: (u.doctorId ?? null) as string | null };
}

// doctorId pelo qual filtrar a agenda. DOCTOR só vê a própria agenda;
// ADMIN/RECEPTIONIST/SUPER_ADMIN veem todos (null) — podem filtrar via query param.
export function doctorScopeId(user: SessionUser | null): string | null {
  return user && user.role === "DOCTOR" && user.doctorId ? user.doctorId : null;
}
