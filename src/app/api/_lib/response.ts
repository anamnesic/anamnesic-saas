// JSON envelope — ported from kairos/packages/app/app/api/_lib/response.ts
export function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, timestamp: new Date().toISOString() }, { status });
}

export function err(code: string, message: string, status: number, details?: unknown) {
  return Response.json(
    { success: false, error: { code, message, details }, timestamp: new Date().toISOString() },
    { status },
  );
}
