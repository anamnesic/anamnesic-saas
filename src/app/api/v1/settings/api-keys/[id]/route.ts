export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRoute } from "@/app/api/_lib/auth";
import { ok, err } from "@/app/api/_lib/response";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;
  const { id } = await params;

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.workspaceId !== ws.ctx.workspaceId) return err("NOT_FOUND", "API key not found", 404);

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return ok({ ok: true });
}
