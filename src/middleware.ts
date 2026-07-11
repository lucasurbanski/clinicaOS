import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Unauthenticated → send to login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // SUPER_ADMIN without an active clinic → must select one first
  if (
    token.role === "SUPER_ADMIN" &&
    !token.activeClinicId &&
    !pathname.startsWith("/clinicas")
  ) {
    return NextResponse.redirect(new URL("/clinicas", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/pacientes/:path*",
    "/crm/:path*",
    "/servicos/:path*",
    "/convenios/:path*",
    "/automacoes/:path*",
    "/configuracoes/:path*",
    "/bot/:path*",
    "/medicos/:path*",
    "/usuarios/:path*",
    "/atendimento/:path*",
    "/clinicas",
    "/clinicas/:path*",
  ],
};
