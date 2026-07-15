"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch, getAccessToken, setAccessToken, setWorkspaceId } from "@/lib/api";

interface AuthUser { id: string; email: string; name: string }
interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // bootstrap: refresh once (uses httpOnly cookie), then fetch /me
  const bootstrap = useCallback(async () => {
    if (!getAccessToken()) {
      try {
        const r = await apiFetch<{ accessToken: string; workspaceId: string | null }>("/api/v1/auth/refresh", {
          method: "POST",
          workspace: false,
        });
        setAccessToken(r.accessToken);
        if (r.workspaceId) setWorkspaceId(r.workspaceId);
      } catch {
        setAccessToken(null);
      }
    }
    try {
      const me = await apiFetch<{ user: AuthUser }>("/api/v1/auth/me");
      setUser(me.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch<{ accessToken: string; user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      workspace: false,
      body: JSON.stringify({ email, password }),
      headers: { "content-type": "application/json" },
    });
    setAccessToken(r.accessToken);
    setUser(r.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const r = await apiFetch<{ accessToken: string; workspaceId: string; user: AuthUser }>(
      "/api/v1/auth/signup",
      {
        method: "POST",
        workspace: false,
        body: JSON.stringify({ name, email, password }),
        headers: { "content-type": "application/json" },
      },
    );
    setAccessToken(r.accessToken);
    setWorkspaceId(r.workspaceId);
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/v1/auth/refresh", { method: "DELETE", workspace: false }).catch(() => {});
    setAccessToken(null);
    setWorkspaceId(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
