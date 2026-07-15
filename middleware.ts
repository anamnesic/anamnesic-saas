import { NextRequest, NextResponse } from "next/server";

// Auth gate for the authenticated app shell — kairos had NO middleware.
// Presence of the httpOnly `anamnesic_refresh` cookie means a session exists.
// Hard authz still happens in the API handlers (verifyAccessToken); this is
// just early redirect for the page layer.

const REFRESH_COOKIE = "anamnesic_refresh";

export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  // protect everything under /(app) → /dashboard, /billing, /settings
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/settings");

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // if already logged in, bounce auth pages to dashboard
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/billing/:path*", "/settings/:path*", "/login", "/signup"],
};
