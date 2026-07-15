// Seed: creates the 3 plans (free/pro/team). Run with `pnpm db:seed`.
// PagBank plan ids are left null — after you create them in the PagBank panel
// (or via pagbank.createPlan), paste the ids into the `pagbankPlanId` column.

import { PrismaClient, PlanInterval } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      slug: "free", name: "Free", description: "Para testar",
      priceCents: 0, interval: PlanInterval.MONTHLY, trialDays: 0,
      sortOrder: 0, features: { seats: 1, contextEntries: 500, mcp: true, sync: false },
    },
  });

  await prisma.plan.upsert({
    where: { slug: "pro" },
    update: {},
    create: {
      slug: "pro", name: "Pro", description: "Para profissionais",
      priceCents: 4900, interval: PlanInterval.MONTHLY, trialDays: 7,
      sortOrder: 1, features: { seats: 3, contextEntries: 50000, mcp: true, sync: true },
    },
  });

  await prisma.plan.upsert({
    where: { slug: "team" },
    update: {},
    create: {
      slug: "team", name: "Team", description: "Para equipes",
      priceCents: 19900, interval: PlanInterval.MONTHLY, trialDays: 7,
      sortOrder: 2, features: { seats: 15, contextEntries: 1000000, mcp: true, sync: true },
    },
  });

  console.log("✓ Plans seeded (free / pro / team). Set pagbankPlanId after creating PagBank plans.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
