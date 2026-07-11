import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: credentials.email },
          include: { clinic: true },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clinicId: user.clinicId ?? null,
          clinicName: user.clinic?.name ?? null,
          doctorId: user.doctorId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.clinicId = (user as any).clinicId;
        token.clinicName = (user as any).clinicName;
        token.doctorId = (user as any).doctorId;
      }
      // SUPER_ADMIN updates activeClinicId when they select a clinic
      if (trigger === "update" && session?.activeClinicId !== undefined) {
        token.activeClinicId = session.activeClinicId ?? null;
        token.activeClinicName = session.activeClinicName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).clinicId = token.clinicId;
        (session.user as any).clinicName = token.clinicName;
        (session.user as any).doctorId = token.doctorId;
        (session.user as any).activeClinicId = token.activeClinicId ?? null;
        (session.user as any).activeClinicName = token.activeClinicName ?? null;
      }
      return session;
    },
  },
};
