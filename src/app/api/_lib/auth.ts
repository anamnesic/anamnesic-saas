import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";
import { err } from "./response";

export interface Auth {
  userId: string;
  email: string;
}

export type AuthResult = { auth: Auth } | { error: Response };

/** Verify the access token from `Authorization: Bearer`. */
export function requireAuth(req: NextRequest): AuthResult {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { error: err("UNAUTHORIZED", "Missing or invalid token", 401) };
  }
  const claims = verifyAccessToken(header.slice(7));
  if (!claims) return { error: err("UNAUTHORIZED", "Invalid or expired token", 401) };
  return { auth: { userId: claims.sub, email: claims.email } };
}

// ────────────────────────────────────────────────────────────
//  TENANT AUTHORIZATION — the gap kairos left open.
//  Resolves workspace from header/query AND verifies the authed
//  user is actually a member of it. Never trusts the client alone.
// ────────────────────────────────────────────────────────────
export interface WorkspaceCtx {
  workspaceId: string;
  role: string;
  userId: string;
}

export type WorkspaceResult = { ctx: WorkspaceCtx } | { error: Response };

export async function requireWorkspace(req: NextRequest, auth: Auth): Promise<WorkspaceResult> {
  const workspaceId =
    req.headers.get("x-workspace-id") ||
    new URL(req.url).searchParams.get("workspaceId") ||
    "";

  if (!workspaceId) {
    return { error: err("BAD_WORKSPACE", "Missing X-Workspace-Id", 400) };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: auth.userId } },
    select: { role: true },
  });

  if (!membership) {
    return { error: err("FORBIDDEN", "Not a member of this workspace", 403) };
  }

  return { ctx: { workspaceId, role: membership.role, userId: auth.userId } };
}

/** Combined guard for workspace-scoped routes. */
export async function requireWorkspaceRoute(
  req: NextRequest,
): Promise<{ ctx: WorkspaceCtx } | { error: Response }> {
  const authRes = requireAuth(req);
  if ("error" in authRes) return authRes;
  return requireWorkspace(req, authRes.auth);
}
