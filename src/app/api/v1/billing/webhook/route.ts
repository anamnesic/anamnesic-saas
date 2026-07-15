export const runtime = "nodejs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PagBank v4 webhook — FIXES pagbank-finance-backend's missing signature check.
// PagBank sends `x-signature: t=<ts>,v1=<hex-hmac>`. HMAC-SHA256 over
// `<ts>.<rawBody>` with the shared webhook secret. Always returns 200 so PagBank
// doesn't retry forever.

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((s) => s.trim().split("=")));
  const ts = parts["t"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // reject stale timestamps (5 min window) to prevent replays
  const ageMs = Math.abs(Date.now() - Number(ts) * 1000);
  if (ageMs > 5 * 60_000) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAGBANK_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!secret || !verifySignature(rawBody, req.headers.get("x-signature"), secret)) {
    // still 200 — but ignore. (Don't help attackers enumerate.)
    return NextResponse.json({ received: false }, { status: 200 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: false }, { status: 200 });
  }

  const type: string = event.type ?? event.event ?? "";
  const data = event.data ?? event;

  try {
    // Subscription lifecycle (v4)
    if (type.startsWith("subscription.")) {
      const pagbankSubId: string = data.id ?? data.subscription?.id;
      const status: string = data.status ?? "";
      if (pagbankSubId) {
        const map: Record<string, string> = {
          ACTIVE: "ACTIVE", TRIALING: "TRIALING", PAST_DUE: "PAST_DUE",
          CANCELED: "CANCELED", EXPIRED: "EXPIRED",
        };
        await prisma.subscription.updateMany({
          where: { pagbankSubscriptionId: pagbankSubId },
          data: { status: (map[status] as any) ?? "PAST_DUE" },
        });
      }
    }

    // Order / charge paid → record invoice + ensure ACTIVE entitlement
    if (type === "ORDER.PAID" || type === "CHARGE.PAID") {
      const ref: string = data.reference_id ?? "";
      const wsMatch = ref.match(/ws_(.+)$/);
      const workspaceId = wsMatch?.[1];
      const orderId = data.id;
      if (workspaceId) {
        const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE" } });
          await prisma.invoice.upsert({
            where: { pagbankOrderId: orderId ?? "unknown" },
            create: {
              workspaceId, subscriptionId: sub.id, planId: sub.planId,
              amountCents: data.amount?.summary?.paid ?? 0,
              status: "PAID", pagbankOrderId: orderId, paidAt: new Date(),
            },
            update: { status: "PAID", paidAt: new Date() },
          });
        }
      }
    }
  } catch {
    // swallow — we already returned 200
  }

  return NextResponse.json({ received: true, type }, { status: 200 });
}
