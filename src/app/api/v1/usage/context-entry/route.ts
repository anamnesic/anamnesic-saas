export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/app/api/_lib/response";

// ────────────────────────────────────────────────────────────
//  POST /api/v1/usage/context-entry
//
//  Called by anamnesic-context when context entries are
//  created or deleted. Uses API key auth (no JWT).
// ────────────────────────────────────────────────────────────

const schema = z.object({
  key: z.string().min(1),
  action: z.enum(["created", "deleted", "bulk_created", "bulk_deleted"]),
  projectId: z.string().optional(),
  count: z.number().int().positive().optional(),
  timestamp: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return err("VALIDATION_ERROR", "Invalid request body", 400);
  }

  const { key, action, projectId, count, timestamp } = parsed.data;

  // Validate API key
  if (!key.startsWith("anamnesic_")) {
    return err("UNAUTHORIZED", "Invalid API key", 401);
  }

  const hash = require("crypto").createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { hash },
    select: { id: true, workspaceId: true, revokedAt: true },
  });

  if (!apiKey || apiKey.revokedAt) {
    return err("UNAUTHORIZED", "Invalid or revoked API key", 401);
  }

  // Calculate the number of entries to report
  let entryCount = 1;
  if (action === "bulk_created" || action === "bulk_deleted") {
    entryCount = count || 1;
  }

  // For deletions, we decrement the count (negative value)
  const effectiveCount = action.includes("deleted") ? -entryCount : entryCount;

  // Create audit event for usage tracking
  await prisma.auditEvent.create({
    data: {
      workspaceId: apiKey.workspaceId,
      action: `context.entry.${action.replace("bulk_", "")}`,
      meta: {
        projectId,
        count: entryCount,
        timestamp,
      },
      createdAt: new Date(timestamp),
    },
  });

  return ok({
    reported: true,
    action,
    count: entryCount,
    effectiveCount,
  });
}
