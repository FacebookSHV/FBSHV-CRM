import { getD1Database } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/facebook/token-crypto";

export type AiProviderName = "gemini" | "openai";

export type AiRuntimeKey = {
  provider: AiProviderName;
  keyName: string;
  value: string;
  source: "env" | "settings";
  masked: string;
};

export const AI_KEY_SLOTS = [
  { provider: "gemini" as const, keyName: "GEMINI_API_KEY_1", modelEnv: "GEMINI_MODEL" },
  { provider: "gemini" as const, keyName: "GEMINI_API_KEY_2", modelEnv: "GEMINI_MODEL" },
  { provider: "gemini" as const, keyName: "GEMINI_API_KEY_3", modelEnv: "GEMINI_MODEL" },
  { provider: "gemini" as const, keyName: "GEMINI_API_KEY_4", modelEnv: "GEMINI_MODEL" },
  { provider: "gemini" as const, keyName: "GEMINI_API_KEY_5", modelEnv: "GEMINI_MODEL" },
  { provider: "openai" as const, keyName: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL" }
];

type AiKeyRow = {
  provider: AiProviderName;
  key_name: string;
  encrypted_value: string;
  masked_value: string;
  status: string;
  last_tested_at: string | null;
  last_error: string | null;
  updated_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

export function maskAiKey(value: string) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isPlaceholder(value?: string) {
  return !value || value.includes("replace_") || value === "replace_me" || value.includes("BLOCKED_SECRET_MISSING");
}

export function slotForKeyName(keyName: string) {
  return AI_KEY_SLOTS.find((slot) => slot.keyName === keyName) ?? null;
}

function envRuntimeKeys(env: Record<string, string | undefined>) {
  const keys: AiRuntimeKey[] = [];
  const legacyGemini = env.GEMINI_API_KEY;
  if (!isPlaceholder(legacyGemini)) {
    keys.push({
      provider: "gemini",
      keyName: "GEMINI_API_KEY",
      value: legacyGemini!,
      source: "env",
      masked: maskAiKey(legacyGemini!)
    });
  }
  for (const slot of AI_KEY_SLOTS) {
    const value = env[slot.keyName];
    if (isPlaceholder(value)) continue;
    keys.push({
      provider: slot.provider,
      keyName: slot.keyName,
      value: value!,
      source: "env",
      masked: maskAiKey(value!)
    });
  }
  return keys;
}

async function readStoredRows() {
  const db = await getD1Database();
  if (!db) return [] as AiKeyRow[];
  try {
    const rows = await db
      .prepare(
        `select provider, key_name, encrypted_value, masked_value, status, last_tested_at, last_error, updated_at
         from ai_provider_keys
         where active = 1
         order by key_name asc`
      )
      .all<AiKeyRow>();
    return rows.results ?? [];
  } catch {
    return [] as AiKeyRow[];
  }
}

export async function listAiProviderPublicStatus(env: Record<string, string | undefined> = process.env) {
  const envKeys = envRuntimeKeys(env).map((item) => ({
    provider: item.provider,
    keyName: item.keyName,
    source: item.source,
    masked: item.masked,
    status: "configured",
    lastTestedAt: null as string | null,
    lastError: null as string | null
  }));
  const stored = (await readStoredRows()).map((row) => ({
    provider: row.provider,
    keyName: row.key_name,
    source: "settings" as const,
    masked: row.masked_value,
    status: row.status,
    lastTestedAt: row.last_tested_at,
    lastError: row.last_error
  }));
  return { slots: AI_KEY_SLOTS, keys: [...envKeys, ...stored] };
}

export async function listAiRuntimeKeys(env: Record<string, string | undefined> = process.env) {
  const keys = envRuntimeKeys(env);
  if (env !== process.env) return keys;
  const rows = await readStoredRows();
  for (const row of rows) {
    try {
      keys.push({
        provider: row.provider,
        keyName: row.key_name,
        value: await decryptToken(row.encrypted_value, env.ENCRYPTION_KEY),
        source: "settings",
        masked: row.masked_value
      });
    } catch {
      // NEO: Không trả key lỗi giải mã; Settings sẽ hiển thị trạng thái để operator xử lý.
    }
  }
  return keys;
}

export async function saveAiProviderKey(input: {
  keyName: string;
  value: string;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? process.env;
  const slot = slotForKeyName(input.keyName);
  if (!slot) throw new Error("AI_KEY_SLOT_INVALID");
  const value = input.value.trim();
  if (!value) throw new Error("AI_KEY_EMPTY");
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: DB");

  const now = nowIso();
  const encrypted = await encryptToken(value, env.ENCRYPTION_KEY);
  await db
    .prepare(
      `insert into ai_provider_keys
      (id, workspace_id, provider, key_name, encrypted_value, masked_value, active, status, last_tested_at, last_error, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, 1, 'saved', null, null, ?, ?)
      on conflict(workspace_id, key_name) do update set
        provider = excluded.provider,
        encrypted_value = excluded.encrypted_value,
        masked_value = excluded.masked_value,
        active = 1,
        status = 'saved',
        last_error = null,
        updated_at = excluded.updated_at`
    )
    .bind(
      crypto.randomUUID(),
      "workspace-demo",
      slot.provider,
      slot.keyName,
      encrypted,
      maskAiKey(value),
      now,
      now
    )
    .run();
  return { keyName: slot.keyName, provider: slot.provider, masked: maskAiKey(value) };
}

export async function updateAiProviderKeyTestStatus(keyName: string, status: "valid" | "failed", error?: string | null) {
  const db = await getD1Database();
  if (!db) return;
  try {
    await db
      .prepare("update ai_provider_keys set status = ?, last_tested_at = ?, last_error = ?, updated_at = ? where workspace_id = ? and key_name = ?")
      .bind(status, nowIso(), error ?? null, nowIso(), "workspace-demo", keyName)
      .run();
  } catch {
    // Bảng settings có thể chưa migrate trên môi trường local.
  }
}
