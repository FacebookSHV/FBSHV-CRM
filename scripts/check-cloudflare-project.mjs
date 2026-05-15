import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const wranglerToml = readFileSync("wrangler.toml", "utf8");

function readTomlValue(key) {
  const match = wranglerToml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1];
}

function readBindingValue(section, key) {
  const match = wranglerToml.match(new RegExp(`\\[\\[${section}\\]\\][\\s\\S]*?^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1];
}

function run(command, args) {
  const result = spawnSync([command, ...args].join(" "), {
    encoding: "utf8",
    shell: true
  });
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
const whoami = run("npx", ["wrangler", "whoami"]);
if (whoami.status !== 0) errors.push("Wrangler chưa login hoặc token không hợp lệ.");

const d1Info = run("npx", ["wrangler", "d1", "info", d1Name]);
if (d1Info.status !== 0 || !d1Info.output.includes(d1Id)) {
  errors.push(`D1 ${d1Name} không khớp database_id trong wrangler.toml.`);
}

const buckets = run("npx", ["wrangler", "r2", "bucket", "list"]);
if (buckets.status !== 0 || !buckets.output.includes(`name:           ${r2Bucket}`)) {
  errors.push(`R2 bucket ${r2Bucket} chưa tồn tại trong account đang login.`);
}

if (errors.length > 0) {
  console.error("Cloudflare project check fail:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Cloudflare project check pass: worker=${workerName}, d1=${d1Name}, r2=${r2Bucket}.`);
