import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EXPECTED_ACCOUNT_ID = "3d1e8c3bd1f4f9ace7388e60dd11fbed";
const wranglerToml = readFileSync("wrangler.toml", "utf8").replace(/^\uFEFF/, "");

function readTomlValue(key) {
  const match = wranglerToml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1];
}

function readBindingValue(section, key) {
  const match = wranglerToml.match(new RegExp(`\\[\\[${section}\\]\\][\\s\\S]*?^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1];
}

function runWrangler(args) {
  const command = `npx wrangler ${args.join(" ")}`;
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", command], { encoding: "utf8" })
      : spawnSync("npx", ["wrangler", ...args], { encoding: "utf8" });

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ""}${result.stderr || ""}`
  };
}

const workerName = readTomlValue("name");
const d1Name = readBindingValue("d1_databases", "database_name");
const d1Id = readBindingValue("d1_databases", "database_id");
const r2Bucket = readBindingValue("r2_buckets", "bucket_name");

const errors = [];
if (workerName !== "fbshv-crm") errors.push("Worker name trong wrangler.toml không phải fbshv-crm.");
if (d1Name !== "fbshv_crm_db" || d1Id !== "218d0eab-7734-4fda-91b9-e3e2604e6c86") {
  errors.push("D1 binding DB không trỏ đúng database mới.");
}
if (r2Bucket !== "fbshv-crm-assets") errors.push("R2 binding BUCKET không trỏ đúng fbshv-crm-assets.");

const whoami = runWrangler(["whoami"]);
if (whoami.status !== 0) {
  errors.push("BLOCKED_CLOUDFLARE_AUTH: Wrangler chưa login hoặc token không hợp lệ.");
} else if (!whoami.output.includes(EXPECTED_ACCOUNT_ID)) {
  errors.push("BLOCKED_CLOUDFLARE_ACCOUNT_MISMATCH: Wrangler không dùng account mới.");
}

if (errors.length === 0) {
  const d1Info = runWrangler(["d1", "info", d1Name]);
  if (d1Info.status !== 0 || !d1Info.output.includes(d1Id)) {
    errors.push(`D1 ${d1Name} không khớp database_id trong account mới.`);
  }

  const buckets = runWrangler(["r2", "bucket", "list"]);
  if (buckets.status !== 0 || !buckets.output.includes(`name:           ${r2Bucket}`)) {
    errors.push(`R2 bucket ${r2Bucket} chưa tồn tại trong account mới.`);
  }
}

if (errors.length > 0) {
  console.error("Cloudflare project check fail:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Cloudflare project check pass: account=${EXPECTED_ACCOUNT_ID}, worker=${workerName}, d1=${d1Name}, r2=${r2Bucket}.`);
