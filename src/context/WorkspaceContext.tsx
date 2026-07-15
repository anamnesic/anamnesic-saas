"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, getWorkspaceId, setWorkspaceId } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface WSItem { id: string; name: string; slug: string; role: string }
interface WSContext {
  workspaces: WSItem[];
  current: WSItem | null;
  setCurrent: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<WSContext>(null!);
export const useWorkspace = () => useContext(Ctx);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WSItem[]>([]);
  const [current, setCurrentState] = useState<WSItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentState(null);
      return;
    }
    (async () => {
      try {
        const { items } = await apiFetch<{ items: WSItem[] }>("/api/v1/workspaces");
        setWorkspaces(items);
        const saved = getWorkspaceId();
        const pick = items.find((w) => w.id === saved) ?? items[0] ?? null;
        if (pick) setWorkspaceId(pick.id);
        setCurrentState(pick);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const setCurrent = (id: string) => {
    setWorkspaceId(id);
    setCurrentState(workspaces.find((w) => w.id === id) ?? null);
  };

  return <Ctx.Provider value={{ workspaces, current, setCurrent, loading }}>{children}</Ctx.Provider>;
}
