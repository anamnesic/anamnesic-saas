export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rotateRefreshToken, signAccessToken, revokeRefreshToken } from "@/lib/auth";
import { ok, err } from "@/app/api/_lib/response";

const REFRESH_COOKIE = "anamnesic_refresh";

// Logout: revoke the refresh cookie and clear it.
export async function DELETE(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (raw) await revokeRefreshToken(raw).catch(() => {});
  const res = ok({ ok: true });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!raw) return err("NO_REFRESH", "Missing refresh token", 401);

  const rotated = await rotateRefreshToken(raw);
  if (!rotated) return err("INVALID_REFRESH", "Invalid or expired refresh token", 401);

  const user = await prisma.user.findUnique({
    where: { id: rotated.userId },
    select: { id: true, email: true },
  });
  if (!user) return err("USER_GONE", "User not found", 401);

  const accessToken = signAccessToken({ sub: user.id, email: user.email });

  // pick a default workspace to return (first membership)
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
    orderBy: { createdAt: "asc" },
  });

  const res = ok({ accessToken, workspaceId: membership?.workspaceId ?? null });
  res.cookies.set(REFRESH_COOKIE, rotated.raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: rotated.expires,
  });
  return res;
}
