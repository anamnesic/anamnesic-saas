"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEffect } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Cobrança" },
  { href: "/settings", label: "Configurações" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { workspaces, current, setCurrent } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=" + pathname);
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-[var(--color-muted)]">Carregando…</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-[var(--color-border)] p-4 flex flex-col gap-1">
        <span className="font-semibold px-2 py-3">◆ Nous</span>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-2 rounded-lg text-sm ${pathname.startsWith(n.href) ? "bg-[var(--color-card)] text-white" : "text-[var(--color-muted)]"}`}
          >
            {n.label}
          </Link>
        ))}

        <div className="mt-auto">
          {workspaces.length > 0 && (
            <select
              value={current?.id ?? ""}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-sm mb-2"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => logout().then(() => router.push("/login"))} className="w-full text-left px-3 py-2 text-sm text-[var(--color-muted)]">
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
