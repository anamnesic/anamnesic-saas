// Plan catalog — replaces pagbank-finance-backend's hardcoded student/teacher/school
// arrays. Plans live in the DB (see prisma/seed.ts) and map to PagBank plans via
// pagbankPlanId. The FREE tier has no PagBank plan (pagbankPlanId = null).

export interface PlanFeature {
  seats: number;
  contextEntries: number;   // quota for anamnesic-context
  mcp: boolean;
  sync: boolean;            // cloud sync (Pro+)
}

export const DEFAULT_FEATURES: Record<string, PlanFeature> = {
  free: { seats: 1, contextEntries: 500, mcp: true, sync: false },
  pro: { seats: 3, contextEntries: 50_000, mcp: true, sync: true },
  team: { seats: 15, contextEntries: 1_000_000, mcp: true, sync: true },
};

export function featuresFor(slug: string): PlanFeature {
  return DEFAULT_FEATURES[slug] ?? DEFAULT_FEATURES.free;
}

export const PRICING_BRL: Record<string, number> = {
  free: 0,
  pro: 49,
  team: 199,
};
