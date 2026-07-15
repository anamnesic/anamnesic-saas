export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/app/api/_lib/auth";
import { ok } from "@/app/api/_lib/response";

export async function GET(req: NextRequest) {
  const guard = requireAuth(req);
  if ("error" in guard) return guard.error;

  const user = await prisma.user.findUnique({
    where: { id: guard.auth.userId },
    select: { id: true, email: true, name: true, status: true, createdAt: true },
  });
  if (!user) return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  return ok({ user });
}
