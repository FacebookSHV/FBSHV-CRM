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

// NEO: Secret mapping - file input local có thể thay placeholder mà không commit secret.
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

const env = process.env;

function requireWhen(condition, keys, message, errors) {
  if (!condition) return;
  const missing = keys.filter((key) => isMissing(env[key]));
  if (missing.length > 0) errors.push(`${message}: ${missing.join(", ")}`);
}

const mockEcommerce = env.MOCK_ECOMMERCE_API !== "false";
const mockExternal = env.MOCK_EXTERNAL_APIS !== "false";
const warnings = [];
const errors = [];

if (isMissing(env.AUTH_SECRET)) warnings.push("AUTH_SECRET đang thiếu, chỉ phù hợp local/mock.");
if (isMissing(env.CRM_APP_URL) && isMissing(env.APP_BASE_URL)) warnings.push("Thiếu CRM_APP_URL/APP_BASE_URL, local sẽ dùng http://localhost:3000.");
if (mockEcommerce) warnings.push("MOCK_ECOMMERCE_API đang bật, Product Sync dùng mock provider.");
if (mockExternal) warnings.push("MOCK_EXTERNAL_APIS đang bật, Facebook dùng mock provider.");

requireWhen(
  !mockExternal,
  ["META_APP_ID", "META_APP_SECRET", "META_VERIFY_TOKEN", "ENCRYPTION_KEY"],
  "Tắt MOCK_EXTERNAL_APIS nhưng thiếu cấu hình Facebook thật",
  errors
);

if (!mockExternal && isMissing(env.CRM_APP_URL) && isMissing(env.APP_BASE_URL)) {
  errors.push("Tắt MOCK_EXTERNAL_APIS nhưng thiếu CRM_APP_URL hoặc APP_BASE_URL");
}

requireWhen(
  !mockEcommerce,
  ["ECOMMERCE_API_KEY", "ECOMMERCE_WEBHOOK_SECRET"],
  "Tắt MOCK_ECOMMERCE_API nhưng thiếu secret TMĐT",
  errors
);

for (const warning of warnings) console.log(`WARN: ${warning}`);

if (errors.length > 0) {
  console.error("Env check fail:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Env check pass: cấu hình hiện tại không thiếu secret bắt buộc cho chế độ đang bật.");
