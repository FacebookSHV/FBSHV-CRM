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

// NEO: Secret mapping - GitHub Actions chỉ nhận secret đã có local, không tự bịa production.
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
  "MOCK_ECOMMERCE_API",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN"
];

const gh = process.platform === "win32" ? "gh.exe" : "gh";
const auth = spawnSync(gh, ["auth", "status"], {
  stdio: ["ignore", "ignore", "ignore"]
});

if (auth.status !== 0) {
  console.log("SKIP_GITHUB_SECRETS: gh CLI chưa login hoặc thiếu quyền.");
  process.exit(0);
}

const git = process.platform === "win32" ? "git.exe" : "git";
const repoRoot = spawnSync(git, ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"]
});

if (repoRoot.status !== 0) {
  console.log("SKIP_GITHUB_SECRETS: thư mục hiện tại chưa phải git repo nên không đoán repo đích.");
  process.exit(0);
}

const available = secretKeys.filter((key) => !isMissing(process.env[key]));
const missing = secretKeys.filter((key) => isMissing(process.env[key]));

for (const key of missing) console.log(`SKIP ${key}: BLOCKED_SECRET_MISSING`);

for (const key of available) {
  const result = spawnSync(gh, ["secret", "set", key, "--body-file", "-"], {
    input: process.env[key],
    stdio: ["pipe", "inherit", "inherit"]
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`Đã set GitHub Actions secret: ${key}`);
}

console.log("Hoàn tất cập nhật GitHub Actions secrets có sẵn trong env local.");
