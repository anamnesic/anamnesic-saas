import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

// ────────────────────────────────────────────────────────────
//  Password hashing — FIXES kairos' plain SHA-256.
// ────────────────────────────────────────────────────────────
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ────────────────────────────────────────────────────────────
//  Access tokens — short-lived JWT (15m).
// ────────────────────────────────────────────────────────────
export interface AccessClaims {
  sub: string;            // userId
  email: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL ?? 900); // seconds

function ensureSecrets() {
  if (!ACCESS_SECRET || ACCESS_SECRET.includes("change-me-access")) {
    throw new Error("JWT_ACCESS_SECRET must be set (see .env.example)");
  }
  if (!REFRESH_SECRET || REFRESH_SECRET.includes("change-me-refresh")) {
    throw new Error("JWT_REFRESH_SECRET must be set (see .env.example)");
  }
}

export function signAccessToken(claims: AccessClaims): string {
  ensureSecrets();
  return jwt.sign(claims, ACCESS_SECRET!, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessClaims | null {
  try {
    ensureSecrets();
    return jwt.verify(token, ACCESS_SECRET!) as AccessClaims;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────
//  Refresh tokens — opaque, hashed, stored in DB, ROTATED on use.
//  FIXES kairos' "ignoreExpiration: true" infinite-refresh bug.
// ────────────────────────────────────────────────────────────
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function rawRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export async function issueRefreshToken(userId: string): Promise<{ raw: string; expires: Date }> {
  const raw = rawRefreshToken();
  const expires = new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt: expires },
  });
  return { raw, expires };
}

/** Validate + rotate a refresh token. Returns new raw token + userId, or null. */
export async function rotateRefreshToken(raw: string): Promise<{ userId: string; raw: string; expires: Date } | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  // invalid / already used / revoked / expired
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() }, // burn the old one (rotation)
  });

  const next = await issueRefreshToken(record.userId);
  return { userId: record.userId, raw: next.raw, expires: next.expires };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw) },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
