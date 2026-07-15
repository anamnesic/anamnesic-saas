"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Plan {
  slug: string; name: string; description: string | null;
  priceCents: number; interval: string; trialDays: number; features: Record<string, any>;
}

export default function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => {
    apiFetch<{ items: Plan[] }>("/api/v1/billing/plans").then((r) => setPlans(r.items)).catch(() => {});
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-8 py-20">
      <h1 className="text-4xl font-bold text-center mb-12">Planos</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.slug} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 flex flex-col">
            <h3 className="font-semibold text-lg">{p.name}</h3>
            <p className="text-sm text-[var(--color-muted)] mb-4">{p.description}</p>
            <div className="text-3xl font-bold mb-4">
              {p.priceCents === 0 ? "Grátis" : `R$ ${(p.priceCents / 100).toFixed(0)}`}
              <span className="text-sm font-normal text-[var(--color-muted)]">/mês</span>
            </div>
            <ul className="text-sm text-[var(--color-muted)] space-y-1 mb-6 flex-1">
              <li>{p.features?.seats ?? "—"} assentos</li>
              <li>{p.features?.contextEntries?.toLocaleString() ?? "—"} entradas de contexto</li>
              <li>{p.features?.mcp ? "✓" : "✗"} MCP server</li>
              <li>{p.features?.sync ? "✓" : "✗"} Sync em nuvem</li>
            </ul>
            <Link
              href={p.priceCents === 0 ? "/signup" : "/login"}
              className="text-center border border-[var(--color-border)] rounded-lg py-2 hover:border-[var(--color-primary)]"
            >
              {p.priceCents === 0 ? "Começar" : "Assinar"}
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
