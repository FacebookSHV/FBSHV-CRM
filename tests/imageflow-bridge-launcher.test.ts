import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ImageFlow CRM bridge launcher", () => {
  it("keeps startup, PID, logs, and secrets inside the CRM-owned flow", async () => {
    const launcher = await readFile(
      path.join(process.cwd(), "scripts", "start-imageflow-bridge.ps1"),
      "utf8"
    );

    expect(launcher).toContain("IMAGEFLOW_BRIDGE_TOKEN");
    expect(launcher).toContain(".env.local");
    expect(launcher).toContain("imageflow-bridge.mjs");
    expect(launcher).toContain("bridge.pid");
    expect(launcher).toContain("api/pool/status");
    expect(launcher).toContain("Stop-Process -Id");
    expect(launcher).not.toContain("taskkill");
    expect(launcher).not.toContain("chrome.exe");
    expect(launcher).not.toContain("setx");
  });
});
