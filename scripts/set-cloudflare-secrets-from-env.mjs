import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function isMissing(value) {
  return (
    !value ||
    value === "replace_me" ||
    value === "do_not_commit_real_token" ||
    value.includes("replace_") ||
    value.includes("BLOCKED_SECRET_MISSING")
  );
}

function loadLocalEnv() {
  // NEO: Secret mapping - secret input local override placeholder nhưng không ghi log giá trị.
  for (const file of [".env", ".env.local", ".env.secret-input.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!process.env[key] || (isMissing(process.env[key]) && !isMissing(value))) {
        process.env[key] = value;
      }
    }
  }
}

const preflight = spawnSync(process.execPath, ["scripts/check-cloudflare-project.mjs"], {
  stdio: "inherit"
});
if (preflight.status !== 0) process.exit(preflight.status ?? 1);

loadLocalEnv();

const secretKeys = [
  "AUTH_SECRET",
  "ENCRYPTION_KEY",
  "CRM_APP_URL",
  "APP_BASE_URL",
  "META_APP_ID",
  "META_APP_SECRET",
  "META_VERIFY_TOKEN",
  "META_GRAPH_API_VERSION",
  "META_REDIRECT_URI",
  "ECOMMERCE_API_BASE_URL",
  "ECOMMERCE_API_KEY",
  "ECOMMERCE_WEBHOOK_SECRET",
  "MOCK_EXTERNAL_APIS",
  "MOCK_ECOMMERCE_API"
];

const missing = secretKeys.filter((key) => isMissing(process.env[key]));

if (missing.length > 0) {
  console.error("BLOCKED_SECRET_MISSING: chưa set đủ biến local để đẩy Cloudflare secrets.");
  for (const key of missing) console.error(`- ${key}`);
  process.exit(1);
}

function runWrangler(args, input) {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx wrangler ${args.join(" ")}`], {
      input,
      stdio: ["pipe", "inherit", "inherit"]
    });
  }

  return spawnSync("npx", ["wrangler", ...args], {
    input,
    stdio: ["pipe", "inherit", "inherit"]
  });
}

for (const key of secretKeys) {
  const result = runWrangler(["secret", "put", key], process.env[key]);
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Đã set Cloudflare secret: ${key}`);
}

console.log("Đã set Cloudflare secrets cho project fbshv-crm.");
