import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("file size guard", () => {
  it("repo không có file source/docs/config vượt 30KB", () => {
    const result = spawnSync("node", ["scripts/check-file-sizes.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
});
