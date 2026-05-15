import { NextResponse } from "next/server";
import type { ApiResult } from "./ecommerce/types";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error, code }, { status });
}

export function fromResult<T>(result: ApiResult<T>) {
  return result.success ? ok(result.data) : fail(result.error);
}

export function failFromError(error: unknown, fallback = "Lỗi hệ thống") {
  const message = error instanceof Error ? error.message : fallback;
  const code = message.startsWith("BLOCKED_BY_MISSING_BINDING")
    ? "BLOCKED_BY_MISSING_BINDING"
    : message.startsWith("BLOCKED_BY_MISSING_SECRET")
      ? "BLOCKED_BY_MISSING_SECRET"
      : "INTERNAL_ERROR";
  const status = code.startsWith("BLOCKED") ? 400 : 500;
  return fail(message, status, code);
}
