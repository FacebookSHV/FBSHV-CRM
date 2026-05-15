import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("db/seed.sql")) {
  console.error("Thiếu db/seed.sql.");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", "fbshv_crm_db", "--local", "--file", "db/seed.sql"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
