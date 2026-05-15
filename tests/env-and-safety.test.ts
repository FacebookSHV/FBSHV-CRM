import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { getProductionWriteTestDecision } from "@/lib/external-test-safety";

describe("env and secret safety", () => {
  it("production write test skip khi chưa đủ điều kiện", () => {
    const decision = getProductionWriteTestDecision({
      MOCK_ECOMMERCE_API: "true",
      RUN_EXTERNAL_WRITE_TESTS: "false"
    });
    expect(decision.shouldRun).toBe(false);
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  it("secret generator tạo mapping dùng chung", () => {
    const result = spawnSync(
      "node",
      [
        "-e",
        "import('./scripts/lib/secrets.mjs').then((m)=>{const s=m.createSharedSecrets((n)=>Buffer.alloc(n,1)); if(!s.API_KEY_FOR_FACEBOOK_CRM.startsWith('fbcrm_')) process.exit(1); if(!s.WEBHOOK_SECRET_FOR_FACEBOOK_CRM.startsWith('whsec_')) process.exit(1);})"
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    );
    expect(result.status, result.stderr).toBe(0);
  });

  it("secret leak checker không phát hiện secret trong repo", () => {
    const result = spawnSync("node", ["scripts/check-secrets.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });

  it("mask secret không in đầy đủ", () => {
    const result = spawnSync(
      "node",
      ["-e", "import('./scripts/lib/secrets.mjs').then((m)=>{if(m.maskSecret('fbcrm_1234567890')!=='fbcrm_...7890') process.exit(1);})"],
      { cwd: process.cwd(), encoding: "utf8" }
    );
    expect(result.status, result.stderr).toBe(0);
  });
});
