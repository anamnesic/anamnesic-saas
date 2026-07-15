"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function Billing() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ subscription: any }>("/api/v1/billing/subscription")
      .then((r) => setData(r.subscription))
      .finally(() => setLoading(false));
  }, []);

  async function cancel() {
    if (!confirm("Cancelar assinatura? O acesso continua até o fim do período.")) return;
    await apiFetch("/api/v1/billing/subscription", { method: "DELETE" });
    location.reload();
  }

  if (loading) return <p className="text-[var(--color-muted)]">Carregando…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Cobrança</h1>
      {!data ? (
        <p className="text-[var(--color-muted)]">Nenhuma assinatura.</p>
      ) : (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-md">
          <div className="flex justify-between mb-2">
            <span className="text-[var(--color-muted)]">Plano</span>
            <span className="font-medium">{data.plan?.name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-[var(--color-muted)]">Status</span>
            <span>{data.status}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-[var(--color-muted)]">PagBank ID</span>
            <code className="text-xs">{data.pagbankSubscriptionId ?? "—"}</code>
          </div>
          {data.plan?.slug !== "free" && (
            <button onClick={cancel} className="text-sm text-red-400">Cancelar assinatura</button>
          )}
        </div>
      )}

      <h2 className="font-medium mt-8 mb-3">Faturas recentes</h2>
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)] max-w-md">
        {(!data?.invoices || data.invoices.length === 0) && (
          <p className="p-4 text-sm text-[var(--color-muted)]">Sem faturas ainda.</p>
        )}
        {data?.invoices?.map((inv: any) => (
          <div key={inv.id} className="flex justify-between p-4 text-sm">
            <span>R$ {(inv.amountCents / 100).toFixed(2)}</span>
            <span className="text-[var(--color-muted)]">{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
