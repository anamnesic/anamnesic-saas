export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceRoute } from "@/app/api/_lib/auth";
import { pagbank, PagBankCard } from "@/lib/billing/pagbank";
import { ok, err } from "@/app/api/_lib/response";

const schema = z.object({
  planSlug: z.enum(["pro", "team"]),
  customer: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    taxId: z.string().min(11).max(14),
    phone: z.object({ area: z.string(), number: z.string() }).optional(),
  }),
  paymentMethod: z.object({
    type: z.enum(["CREDIT_CARD", "BOLETO"]),
    card: PagBankCardZodSchema().optional(),
  }),
});

function PagBankCardZodSchema() {
  return z.object({
    number: z.string(),
    expMonth: z.string(),
    expYear: z.string(),
    securityCode: z.string(),
    holder: z.object({ name: z.string() }),
  });
}

export async function POST(req: NextRequest) {
  const ws = await requireWorkspaceRoute(req);
  if ("error" in ws) return ws.error;
  const { ctx } = ws;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());

  const plan = await prisma.plan.findUnique({ where: { slug: parsed.data.planSlug } });
  if (!plan?.pagbankPlanId) return err("PLAN_NOT_READY", "Plan has no PagBank plan configured", 409);

  // block duplicate active subscriptions
  const existing = await prisma.subscription.findUnique({ where: { workspaceId: ctx.workspaceId } });
  if (existing && existing.status === "ACTIVE" && existing.planId === plan.id) {
    return err("ALREADY_SUBSCRIBED", "Workspace already on this plan", 409);
  }

  let pagbankSub: any;
  try {
    pagbankSub = await pagbank.createSubscription({
      planId: plan.pagbankPlanId,
      customer: parsed.data.customer,
      paymentMethod:
        parsed.data.paymentMethod.type === "CREDIT_CARD" && parsed.data.paymentMethod.card
          ? { type: "CREDIT_CARD", card: parsed.data.paymentMethod.card }
          : { type: "BOLETO" },
      reference: `ws_${ctx.workspaceId}`,
    });
  } catch (e: any) {
    return err("PAGBANK_ERROR", e.message ?? "PagBank request failed", 502, e.response?.data);
  }

  const subscription = await prisma.subscription.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: {
      workspaceId: ctx.workspaceId,
      planId: plan.id,
      status: "ACTIVE",
      pagbankSubscriptionId: pagbankSub.id,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      pagbankSubscriptionId: pagbankSub.id,
      canceledAt: null,
    },
  });

  await prisma.auditEvent.create({
    data: { workspaceId: ctx.workspaceId, actorId: ctx.userId, action: "subscription.created", meta: { plan: plan.slug, pagbankId: pagbankSub.id } },
  });

  return ok({ subscription }, 201);
}
