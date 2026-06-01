import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();

const excludedDirs = new Set([
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "switch github"
]);

const skippedFiles = [
  /^package-lock\.json$/,
  /^profiles\.local\.json$/,
  /^tsconfig\.tsbuildinfo$/,
  /^drizzle\/meta\//,
  /^backup_.*\.sql$/i,
  /^schema_.*\.sql$/i,
  /^db\/.*\.sql$/i,
  /^project_tree_full\.txt$/i
];

const scannedExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const safePlaceholderPatterns = [
  /replace_me/i,
  /replace_with/i,
  /do_not_commit/i,
  /BLOCKED_SECRET_MISSING/i,
  /\$\{/,
  /<[^>]+>/,
  /\.\.\./
];

const secretPatterns = [
  { name: "cloudflare_token", regex: /\bcfat_[A-Za-z0-9_-]{20,}\b/g },
  { name: "facebook_token", regex: /\bEA[A-Za-z0-9]{80,}\b/g },
  { name: "github_token", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { name: "crm_api_key", regex: /\bfbcrm_[A-Za-z0-9_-]{24,}\b/g },
  { name: "webhook_secret", regex: /\bwhsec_[A-Za-z0-9_-]{24,}\b/g },
  {
    name: "assigned_secret",
    regex:
      /\b(?:CLOUDFLARE_API_TOKEN|META_APP_SECRET|ECOMMERCE_API_KEY|ECOMMERCE_WEBHOOK_SECRET|AUTH_SECRET|ENCRYPTION_KEY|PAGE_ACCESS_TOKEN|access_token)\s*[:=]\s*["']?([^"'\s]{16,})/gi
  }
];

function shouldSkip(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (/^\.env(\..*)?$/.test(normalized) && normalized !== ".env.example") return true;
  return skippedFiles.some((pattern) => pattern.test(normalized));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    const rel = relative(root, fullPath);
    const extension = extname(entry.name).toLowerCase();
    if (shouldSkip(rel)) continue;
    if (!scannedExtensions.has(extension) && !entry.name.startsWith(".env")) continue;
    files.push(fullPath);
  }
  return files;
}

function isSafePlaceholder(value) {
  return safePlaceholderPatterns.some((pattern) => pattern.test(value));
}

const findings = [];

for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  for (const pattern of secretPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const value = match[1] ?? match[0];
      if (isSafePlaceholder(value)) continue;
      const lineNumber = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ file: rel, line: lineNumber, type: pattern.name });
    }
  }

  if (/GITHUB.*CLOUDFARE|CLOUDFLARE/i.test(rel) && statSync(file).size > 0) {
    const unsafeLine = lines.findIndex((line) => /\bcfat_|gh[pousr]_|EA[A-Za-z0-9]{80,}/.test(line));
    if (unsafeLine >= 0) findings.push({ file: rel, line: unsafeLine + 1, type: "local_token_file" });
  }
}

if (findings.length > 0) {
  console.error("Secret check fail: phát hiện giá trị giống secret trong file repo.");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.type})`);
  }
  process.exit(1);
}

console.log("Secret check pass: không phát hiện token/API key thật trong file repo được quét.");
