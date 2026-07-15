import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-8 py-5 border-b border-[var(--color-border)]">
        <span className="font-semibold text-lg">◆ Nous</span>
        <nav className="flex gap-6 text-sm text-[var(--color-muted)]">
          <Link href="/pricing">Preços</Link>
          <Link href="/login">Entrar</Link>
          <Link href="/signup" className="text-[var(--color-primary)]">Começar grátis</Link>
        </nav>
      </header>

      <section className="max-w-3xl mx-auto px-8 py-28 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          O contexto da sua equipe, <span className="text-[var(--color-primary)]">em qualquer IA.</span>
        </h1>
        <p className="text-lg text-[var(--color-muted)] mb-10">
          Decisões arquiteturais, convenções e regras de projeto — unificados e exportados
          automaticamente para Claude Code, Cursor, Copilot e Windsurf. Pare de manter
          <code className="mx-1 px-1 rounded bg-[var(--color-card)]">CLAUDE.md</code> na mão.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium">
            Começar grátis
          </Link>
          <Link href="/pricing" className="border border-[var(--color-border)] px-6 py-3 rounded-lg">
            Ver planos
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-8 pb-28">
        {[
          ["Contexto unificado", "Uma fonte de verdade, exportada para cada ferramenta."],
          ["MCP integrado", "41 tools acessíveis por Model Context Protocol."],
          ["Multi-tenant", "Workspaces com RBAC e sincronização em nuvem."],
        ].map(([t, d]) => (
          <div key={t} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
            <h3 className="font-medium mb-2">{t}</h3>
            <p className="text-sm text-[var(--color-muted)]">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
