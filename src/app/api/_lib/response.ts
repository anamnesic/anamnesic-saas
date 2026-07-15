// JSON envelope — ported from kairos/packages/app/app/api/_lib/response.ts
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() }, { status });
}

export function err(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error: { code, message, details }, timestamp: new Date().toISOString() },
    { status },
  );
}
