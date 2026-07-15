export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/app/api/_lib/auth";
import { ok, err } from "@/app/api/_lib/response";

export async function GET(req: NextRequest) {
  const guard = requireAuth(req);
  if ("error" in guard) return guard.error;

  // Only workspaces the user is a member of — FIXES kairos' "list everything" leak.
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: guard.auth.userId },
    include: { workspace: { select: { id: true, name: true, slug: true, status: true } } },
  });
  return ok({
    items: memberships.map((m) => ({ ...m.workspace, role: m.role })),
    total: memberships.length,
  });
}

const createSchema = z.object({ name: z.string().min(2), slug: z.string().min(2).optional() });

export async function POST(req: NextRequest) {
  const guard = requireAuth(req);
  if ("error" in guard) return guard.error;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());

  const userId = guard.auth.userId; // FIXES kairos' hardcoded ownerId:'system'
  const slug = parsed.data.slug ?? `${parsed.data.name}-${userId.slice(-4)}`.toLowerCase();

  const created = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({ data: { name: parsed.data.name, slug, ownerId: userId } });
    await tx.workspaceMember.create({ data: { workspaceId: ws.id, userId, role: "OWNER" } });
    const free = await tx.plan.findUnique({ where: { slug: "free" } });
    if (free) await tx.subscription.create({ data: { workspaceId: ws.id, planId: free.id, status: "ACTIVE" } });
    return ws;
  });

  return ok({ id: created.id, name: created.name, slug: created.slug }, 201);
}
