export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRoute } from "@/app/api/_lib/auth";
import { ok, err } from "@/app/api/_lib/response";

export async function GET(req: NextRequest) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: ws.ctx.workspaceId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
  });
  return ok({ items: keys });
}

const schema = z.object({ name: z.string().min(1).max(60) });

export async function POST(req: NextRequest) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Invalid name", 400);

  // anamnesic_<48 random base64url> — full key returned ONCE; only prefix + hash stored.
  const raw = `anamnesic_${crypto.randomBytes(32).toString("base64url")}`;
  const prefix = raw.slice(0, 12);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  await prisma.apiKey.create({
    data: { workspaceId: ws.ctx.workspaceId, userId: ws.ctx.userId, name: parsed.data.name, prefix, hash },
  });
  await prisma.auditEvent.create({
    data: { workspaceId: ws.ctx.workspaceId, actorId: ws.ctx.userId, action: "apikey.issued", meta: { name: parsed.data.name } },
  });
  return ok({ key: raw }, 201);
}
