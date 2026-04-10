import { NextResponse } from "next/server";

export function jsonSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(
  error: string,
  status = 400,
  details?: string[] | Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function handleRouteError(error: unknown, fallback = "Unexpected server error") {
  console.error(fallback, error);
  return jsonError(fallback, 500);
}
