"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function Settings() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  async function load() {
    try {
      const r = await apiFetch<{ items: any[] }>("/api/v1/settings/api-keys");
      setKeys(r.items);
    } catch {}
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    if (!name) return;
    const r = await apiFetch<{ key: string }>("/api/v1/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: { "content-type": "application/json" },
    });
    setNewKey(r.key);
    setName("");
    void load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Configurações</h1>

      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 max-w-xl mb-6">
        <h2 className="font-medium mb-1">API Keys</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Use para autenticar o CLI <code>nous</code> e o MCP server do nous-context.
        </p>
        <div className="flex gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="nome (ex: local-cli)"
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2" />
          <button onClick={create} className="bg-[var(--color-primary)] text-white px-4 rounded-lg">Gerar</button>
        </div>
        {newKey && (
          <p className="text-sm text-[var(--color-primary)] mb-4 break-all">
            Copie agora (não aparece mais): {newKey}
          </p>
        )}
        <ul className="text-sm space-y-1">
          {keys.map((k) => (
            <li key={k.id} className="flex justify-between text-[var(--color-muted)]">
              <span>{k.name} · nous_{k.prefix}…</span>
              <span>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
