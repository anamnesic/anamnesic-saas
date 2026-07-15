"use client";

// Client fetch wrapper — ported from kairos/packages/app/src/lib/api.ts.
// Auto-injects Authorization + X-Workspace-Id and transparently refreshes
// the access token once on 401 using the httpOnly refresh cookie.

const ACCESS_KEY = "anamnesic_access";
const WS_KEY = "anamnesic_workspace";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function setAccessToken(t: string | null) {
  if (t) localStorage.setItem(ACCESS_KEY, t);
  else localStorage.removeItem(ACCESS_KEY);
}
export function getWorkspaceId(): string | null {
  return localStorage.getItem(WS_KEY);
}
export function setWorkspaceId(id: string | null) {
  if (id) localStorage.setItem(WS_KEY, id);
  else localStorage.removeItem(WS_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include", // sends the httpOnly anamnesic_refresh cookie
      });
      if (!res.ok) return null;
      const json = await res.json();
      const token = json.data?.accessToken as string | undefined;
      if (token) {
        setAccessToken(token);
        setWorkspaceId(json.data?.workspaceId ?? null);
      }
      return token ?? null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export interface ApiOptions extends RequestInit {
  workspace?: boolean; // inject X-Workspace-Id (default true)
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { workspace = true, headers, ...rest } = opts;
  const req = async () => {
    const h = new Headers(headers);
    const token = getAccessToken();
    if (token) h.set("authorization", `Bearer ${token}`);
    if (workspace) {
      const ws = getWorkspaceId();
      if (ws) h.set("x-workspace-id", ws);
    }
    const res = await fetch(path, { ...rest, headers: h, credentials: "include" });
    return res;
  };

  let res = await req();

  // single transparent refresh on 401
  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) res = await req();
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json.data as T;
}
