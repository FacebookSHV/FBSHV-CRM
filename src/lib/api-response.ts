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
    : message.startsWith("BLOCKED_META_PERMISSION_MISSING")
      ? "BLOCKED_META_PERMISSION_MISSING"
      : message.startsWith("AD_WRITE_ACTIONS_DISABLED")
        ? "AD_WRITE_ACTIONS_DISABLED"
      : message.startsWith("ADS_")
        ? message.split(":")[0] || "ADS_ERROR"
      : message.startsWith("META_ADS_API_ERROR")
        ? "META_ADS_API_ERROR"
      : message.startsWith("META_CAPI_CONFIG_MISSING")
        ? "META_CAPI_CONFIG_MISSING"
      : message.startsWith("META_CAPI_ERROR")
        ? "META_CAPI_ERROR"
      : message.startsWith("LANDING_")
        ? message.split(":")[0] || "LANDING_ERROR"
      : message.startsWith("IMAGEFLOW_")
        ? message.split(":")[0] || "IMAGEFLOW_ERROR"
      : message.startsWith("CONTENT_") || message.startsWith("WAITING_IMAGEFLOW_ASSETS")
        ? message.split(":")[0] || "CONTENT_ERROR"
      : message.startsWith("AUTO_PUBLISH_POSTS_DISABLED")
        ? "AUTO_PUBLISH_POSTS_DISABLED"
      : message.startsWith("BLOCKED_BY_MISSING_SECRET")
      ? "BLOCKED_BY_MISSING_SECRET"
      : "INTERNAL_ERROR";
  const status = code.startsWith("BLOCKED") || code.endsWith("DISABLED") || code.startsWith("ADS_") || code.startsWith("LANDING_") || code.startsWith("IMAGEFLOW_") || code.startsWith("CONTENT_") || code === "WAITING_IMAGEFLOW_ASSETS" || code === "META_CAPI_CONFIG_MISSING"
    ? 400
    : code === "META_ADS_API_ERROR" || code === "META_CAPI_ERROR"
      ? 502
      : 500;
  return fail(message, status, code);
}
