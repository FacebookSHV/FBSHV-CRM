import { existsSync, readFileSync, writeFileSync } from "node:fs";

const inputFile = ".env.secret-input.local";
const envFile = ".env.local";
const keys = ["ECOMMERCE_API_KEY", "ECOMMERCE_WEBHOOK_SECRET"];

function parseEnv(file) {
  const env = new Map();
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env.set(match[1], match[2].replace(/^["']|["']$/g, ""));
  }
  return env;
}

function isMissing(value) {
  return !value || value.includes("BLOCKED_SECRET_MISSING") || value.includes("replace_");
}

if (!existsSync(inputFile)) {
  console.error(`Không thấy ${inputFile}.`);
  process.exit(1);
}

let content = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
const input = parseEnv(inputFile);
const imported = [];
const missing = [];

for (const key of keys) {
  const value = input.get(key);
  if (isMissing(value)) {
    missing.push(key);
    continue;
  }
  const line = `${key}="${value}"`;
  if (new RegExp(`^${key}=`, "m").test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, "m"), line);
  } else {
    content += `${content.endsWith("\n") ? "" : "\n"}${line}\n`;
  }
  imported.push(key);
}

writeFileSync(envFile, content, "utf8");

for (const key of imported) console.log(`Đã import ${key} vào .env.local.`);
for (const key of missing) console.log(`SKIP ${key}: BLOCKED_SECRET_MISSING.`);

if (missing.length > 0) process.exit(1);
