"use client";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function Dashboard() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Olá, {user?.name.split(" ")[0]} 👋</h1>
      <p className="text-[var(--color-muted)] mb-8">
        Workspace: <span className="text-white">{current?.name ?? "—"}</span>
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          ["Contexto", "Sincronize regras do projeto → CLAUDE.md / .cursorrules", "/billing"],
          ["Plano atual", "Veja seu plano e uso", "/billing"],
          ["API keys", "Conecte o CLI / MCP", "/settings"],
        ].map(([t, d, href]) => (
          <a key={t} href={href} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 block hover:border-[var(--color-primary)]">
            <h3 className="font-medium mb-1">{t}</h3>
            <p className="text-sm text-[var(--color-muted)]">{d}</p>
          </a>
        ))}
      </div>

      <div className="mt-8 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
        <h3 className="font-medium mb-2">Próximo: conectar o produto</h3>
        <p className="text-sm text-[var(--color-muted)]">
          Este app é o <strong>shell multi-tenant + billing</strong>. O produto (contexto/memory/MCP)
          vem do <code>anamnesic-context</code> (thinkbrew). Conecte via API key em Configurações e aponte
          o MCP server para <code>ANAMNESIC_CONTEXT_API_URL</code>.
        </p>
      </div>
    </div>
  );
}
