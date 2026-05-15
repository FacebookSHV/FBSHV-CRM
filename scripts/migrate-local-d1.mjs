import { spawnSync } from "node:child_process";

const result = spawnSync(
  "npx",
  ["wrangler", "d1", "migrations", "apply", "fbshv_crm_db", "--local"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
