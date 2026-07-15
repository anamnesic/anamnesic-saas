export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/app/api/_lib/response";
import { featuresFor, type PlanFeature } from "@/lib/billing/plans";

// ────────────────────────────────────────────────────────────
//  POST /api/v1/auth/api-key
//
//  External validation endpoint called by anamnesic-context
//  (CLI / MCP server) — NOT a user-session route. The caller
//  authenticates with the raw API key itself (no JWT), so this
//  route does its own lookup instead of requireAuth/requireWorkspace.
//
//  Request:  { "key": "anamnesic_xxx..." }
//  Response: { workspaceId, plan: "pro", features: {...}, usage: {...} }
// ────────────────────────────────────────────────────────────

const schema = z.object({ key: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Missing 'key'", 400);

  const raw = parsed.data.key;
  if (!raw.startsWith("anamnesic_")) {
    return err("UNAUTHORIZED", "Invalid API key", 401);
  }
  const hash = crypto.createHash("sha256").update(raw).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { hash },
    select: { id: true, workspaceId: true, revokedAt: true },
  });

  if (!apiKey || apiKey.revokedAt) {
    return err("UNAUTHORIZED", "Invalid or revoked API key", 401);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: apiKey.workspaceId },
    select: { id: true, status: true },
  });

  if (!workspace || workspace.status !== "ACTIVE") {
    return err("FORBIDDEN", "Workspace is not active", 403);
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: apiKey.workspaceId },
    select: { status: true, plan: { select: { slug: true, features: true } } },
  });

  // No subscription row yet (never upgraded) → default to the free plan.
  const planSlug = subscription?.plan.slug ?? "free";
  const planActive =
    !subscription || subscription.status === "ACTIVE" || subscription.status === "TRIALING";

  if (!planActive) {
    return err("PLAN_INACTIVE", "Subscription is not active", 402);
  }

  const features: PlanFeature =
    (subscription?.plan.features as unknown as PlanFeature) ?? featuresFor(planSlug);

  // contextEntries used so far by this workspace (best-effort usage counter,
  // driven by AuditEvent rows written by anamnesic-context on ingest).
  const contextEntriesUsed = await prisma.auditEvent.count({
    where: { workspaceId: apiKey.workspaceId, action: "context.entry.created" },
  });

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return ok({
    workspaceId: apiKey.workspaceId,
    plan: planSlug,
    features,
    usage: {
      contextEntries: contextEntriesUsed,
      contextEntriesLimit: features.contextEntries,
      remaining: Math.max(features.contextEntries - contextEntriesUsed, 0),
    },
  });
}
