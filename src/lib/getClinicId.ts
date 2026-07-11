import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getClinicId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const user = session.user as any;

  // SUPER_ADMIN uses the clinic they actively selected
  if (user.role === "SUPER_ADMIN") {
    return user.activeClinicId ?? null;
  }

  return user.clinicId ?? null;
}
