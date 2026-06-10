import { NextResponse } from "next/server";
import { ok } from "@/lib/api-response";
import { buildRuntimeGuardReport, readRuntimeGuardBindings } from "@/lib/core-flow/runtime-guards";
import { getEcommerceRuntimeEnv } from "@/lib/ecommerce/provider";

export async function GET() {
  const ecommerceEnv = await getEcommerceRuntimeEnv();
  const report = buildRuntimeGuardReport({ ...process.env, ...ecommerceEnv }, await readRuntimeGuardBindings());
  if (!report.ready) {
    const first = report.checks.find((item) => !item.ok);
    return NextResponse.json(
      {
        success: false,
        error: first?.message ?? "Runtime chưa sẵn sàng.",
        code: first?.code ?? "BLOCKED_BY_MISSING_SECRET",
        data: report
      },
      { status: 400 }
    );
  }
  return ok(report);
}
