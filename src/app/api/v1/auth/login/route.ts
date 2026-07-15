export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAccessToken, issueRefreshToken } from "@/lib/auth";
import { ok, err } from "@/app/api/_lib/response";

const REFRESH_COOKIE = "nous_refresh";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // identical error to avoid user enumeration
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return err("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }
  if (user.status !== "ACTIVE") return err("ACCOUNT_DISABLED", "Account is not active", 403);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const { raw, expires } = await issueRefreshToken(user.id);

  const res = ok({ accessToken, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
