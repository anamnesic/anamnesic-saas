export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRoute } from "@/app/api/_lib/auth";
import { ok } from "@/app/api/_lib/response";

export async function GET(req: NextRequest) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: ws.ctx.workspaceId },
    include: { plan: true, invoices: { orderBy: { createdAt: "desc" }, take: 12 } },
  });

  return ok({ subscription });
}

// Cancel (user-initiated) — keeps access until period end, marks CANCELED.
export async function DELETE(req: NextRequest) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;

  const sub = await prisma.subscription.findUnique({ where: { workspaceId: ws.ctx.workspaceId } });
  if (!sub?.pagbankSubscriptionId) return ok({ subscription: sub });

  const { pagbank } = await import("@/lib/billing/pagbank");
  try {
    await pagbank.cancelSubscription(sub.pagbankSubscriptionId);
  } catch {
    // continue: we still mark locally; reconcile via webhook later
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", canceledAt: new Date() },
  });

  await prisma.auditEvent.create({
    data: { workspaceId: ws.ctx.workspaceId, actorId: ws.ctx.userId, action: "subscription.canceled", meta: {} },
  });

  return ok({ subscription: updated });
}
