export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { ok } from "@/app/api/_lib/response";

// Public plan catalog (used by the pricing page). Sourced from the DB, not hardcoded.
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      priceCents: true,
      interval: true,
      trialDays: true,
      features: true,
    },
  });
  return ok({ items: plans });
}
