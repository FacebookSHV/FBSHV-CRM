import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const limit = 30 * 1024;
const nearLimit = 28 * 1024;
const excludedDirs = new Set([
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  "build",
  "dist",
  "work",
  "node_modules"
]);
const excludedFiles = new Set(["package-lock.json"]);
const extensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml"
]);

function extname(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function walk(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (relative(root, fullPath).replaceAll("\\", "/").startsWith("drizzle/meta")) continue;
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }
    if (excludedFiles.has(entry.name) || !extensions.has(extname(entry.name))) continue;
    const size = statSync(fullPath).size;
    results.push({ path: relative(root, fullPath), size });
  }
  return results;
}

const files = walk(root);
const oversized = files.filter((file) => file.size > limit);
const near = files.filter((file) => file.size > nearLimit && file.size <= limit);

if (near.length > 0) {
  console.log("File gần giới hạn 30KB:");
  for (const file of near) console.log(`- ${file.path}: ${file.size} bytes`);
}

if (oversized.length > 0) {
  console.error("File vượt quá 30KB:");
  for (const file of oversized) console.error(`- ${file.path}: ${file.size} bytes`);
  process.exit(1);
}

console.log(`Size check pass: ${files.length} file đều <= 30KB.`);
