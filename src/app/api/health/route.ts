import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, users: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: 500 });
  }
}
