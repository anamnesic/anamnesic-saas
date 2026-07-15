export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAccessToken, issueRefreshToken } from "@/lib/auth";
import { ok, err } from "@/app/api/_lib/response";

const REFRESH_COOKIE = "nous_refresh";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  workspace: z.string().min(2).optional(),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  const { name, email, password, workspace } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return err("EMAIL_TAKEN", "Email already registered", 409);

  // create user + personal workspace + ownership membership atomically
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: email.toLowerCase(), name, passwordHash: await hashPassword(password) },
    });
    const ws = await tx.workspace.create({
      data: { name: workspace ?? `Workspace de ${name}`, slug: slugify(`${name}-${user.id.slice(-4)}`), ownerId: user.id },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: ws.id, userId: user.id, role: "OWNER" },
    });
    // free-tier subscription by default
    const free = await tx.plan.findUnique({ where: { slug: "free" } });
    if (free) {
      await tx.subscription.create({
        data: { workspaceId: ws.id, planId: free.id, status: "ACTIVE" },
      });
    }
    return { user, ws };
  });

  const accessToken = signAccessToken({ sub: created.user.id, email: created.user.email });
  const { raw, expires } = await issueRefreshToken(created.user.id);

  const res = ok(
    { accessToken, workspaceId: created.ws.id, user: { id: created.user.id, email: created.user.email, name: created.user.name } },
    201,
  );
  res.cookies.set(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
