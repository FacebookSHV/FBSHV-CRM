import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const excludedDirs = new Set([
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  "build",
  "dist",
  "node_modules"
]);
const extensions = new Set([".css", ".js", ".json", ".md", ".mjs", ".sql", ".toml", ".ts", ".tsx", ".txt"]);
const mojibakePatterns = [
  "\u00c3",
  "\u00c2",
  "\ufffd",
  "\u00e2\u20ac",
  "\u00e2\u20ac\u0153",
  "\u00e2\u20ac\u009d",
  "\u00c4\u2018",
  "\u0393"
];
const offenders = [];

function extname(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (relative(root, fullPath).replaceAll("\\", "/").startsWith("drizzle/meta")) continue;
    if (entry.isDirectory()) walk(fullPath, files);
    else if (extensions.has(extname(entry.name)) && entry.name !== "package-lock.json") files.push(fullPath);
  }
  return files;
}

for (const file of walk(root)) {
  const buffer = readFileSync(file);
  const text = buffer.toString("utf8");
  if (text.includes("\uFFFD")) {
    offenders.push({ path: relative(root, file), reason: "UTF-8 replacement character" });
    continue;
  }
  const pattern = mojibakePatterns.find((item) => text.includes(item));
  if (pattern) offenders.push({ path: relative(root, file), reason: `mojibake marker ${pattern}` });
  if (statSync(file).size > 30 * 1024) {
    offenders.push({ path: relative(root, file), reason: "file larger than 30KB" });
  }
}

if (offenders.length > 0) {
  console.error("Hygiene check fail:");
  for (const offender of offenders) console.error(`- ${offender.path}: ${offender.reason}`);
  process.exit(1);
}

console.log("Hygiene check pass: UTF-8, mojibake và size đều ổn.");
