"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const redirect = useSearchParams().get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-8">
        <h1 className="text-xl font-semibold mb-1">Entrar</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">Bem-vindo de volta ao Nous.</p>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <label className="block text-sm mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 mb-4" />
        <label className="block text-sm mb-1">Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 mb-6" />
        <button type="submit" className="w-full bg-[var(--color-primary)] text-white rounded-lg py-2 font-medium">
          Entrar
        </button>
        <p className="text-sm text-[var(--color-muted)] mt-4 text-center">
          Não tem conta? <Link href="/signup" className="text-[var(--color-primary)]">Criar</Link>
        </p>
      </form>
    </main>
  );
}
