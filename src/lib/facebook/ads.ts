import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { blockedMetaPermission } from "./permissions";
import { getFacebookRuntimeConfig } from "./env";
import { decryptToken } from "./token-crypto";

export type AdsReadiness = {
  status: "blocked" | "ready" | "empty";
  missingPermissions: string[];
  writeActionsEnabled: boolean;
  accounts: Array<{ id: string; externalAccountId: string; name: string; status: string }>;
};

type ScopeRow = { scopes: string };
type AccountRow = {
  id: string;
  external_account_id: string;
  name: string;
  status: string;
};

type ConnectionTokenRow = {
  access_token_encrypted: string;
  scopes: string;
};

type CampaignRow = {
  id: string;
  ad_account_id: string;
  external_campaign_id: string;
  name: string;
  status: string;
};

const readPermissions = ["ads_read", "business_management"];

function nowIso() {
  return new Date().toISOString();
}

async function currentScopes() {
  const db = await getD1Database();
  if (!db) return [] as string[];
  const rows = await db
    .prepare("select scopes from facebook_connections where workspace_id = ? and status = 'active' order by updated_at desc limit 5")
    .bind(DEFAULT_WORKSPACE_ID)
    .all<ScopeRow>();
  return (rows.results ?? [])
    .flatMap((row) => row.scopes.split(","))
    .map((scope) => scope.trim())
    .filter(Boolean);
}

async function latestConnection() {
  const db = await getD1Database();
  if (!db) return null;
  return db
    .prepare("select access_token_encrypted, scopes from facebook_connections where workspace_id = ? and status = 'active' order by updated_at desc limit 1")
    .bind(DEFAULT_WORKSPACE_ID)
    .first<ConnectionTokenRow>();
}

function missing(scopes: string[], required: string[]) {
  return required.filter((permission) => !scopes.includes(permission));
}

export async function getAdsReadiness(options: { strict?: boolean } = {}): Promise<AdsReadiness> {
  const scopes = await currentScopes();
  const missingPermissions = missing(scopes, readPermissions);
  if (missingPermissions.length > 0) {
    if (options.strict) throw blockedMetaPermission(missingPermissions.join(","));
    return {
      status: "blocked",
      missingPermissions,
      writeActionsEnabled: process.env.AD_WRITE_ACTIONS_ENABLED === "true",
      accounts: []
    };
  }

  const db = await getD1Database();
  if (!db) {
    return {
      status: "empty",
      missingPermissions: [],
      writeActionsEnabled: process.env.AD_WRITE_ACTIONS_ENABLED === "true",
      accounts: []
    };
  }

  // NEO: Ads ở giai đoạn read-only; chỉ đọc cache/quyền, không tạo chiến dịch thật.
  const rows = await db
    .prepare("select id, external_account_id, name, status from ad_accounts where workspace_id = ? order by name asc")
    .bind(DEFAULT_WORKSPACE_ID)
    .all<AccountRow>();
  const accounts = (rows.results ?? [])
    .filter((row) => row.status !== "mock" && !row.external_account_id.toLowerCase().includes("mock"))
    .map((row) => ({
      id: row.id,
      externalAccountId: row.external_account_id,
      name: row.name,
      status: row.status
    }));

  return {
    status: accounts.length ? "ready" : "empty",
    missingPermissions: [],
    writeActionsEnabled: process.env.AD_WRITE_ACTIONS_ENABLED === "true",
    accounts
  };
}

export async function syncAdAccountsFromMeta() {
  const readiness = await getAdsReadiness({ strict: true });
  void readiness;
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: DB");
  const config = getFacebookRuntimeConfig();
  if (config.mode !== "real") throw blockedMetaPermission("ads_read,business_management");
  const connection = await latestConnection();
  if (!connection) throw blockedMetaPermission("ads_read,business_management");
  const token = await decryptToken(connection.access_token_encrypted, config.encryptionKey);

  const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/me/adaccounts`);
  url.searchParams.set("fields", "id,name,account_status");
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as {
    data?: Array<{ id?: string; name?: string; account_status?: number | string }>;
    error?: { message?: string };
  };
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Meta Ads API trả lỗi.");

  const now = nowIso();
  const accounts = (payload.data ?? []).filter((item) => item.id && item.name);
  for (const account of accounts) {
    // NEO: Ad account chỉ cache khi Meta Graph trả dữ liệu thật, không tạo account giả trong CRM.
    await db
      .prepare(
        `insert into ad_accounts (id, workspace_id, external_account_id, name, status)
         values (?, ?, ?, ?, ?)
         on conflict(id) do update set name = excluded.name, status = excluded.status`
      )
      .bind(
        account.id!,
        DEFAULT_WORKSPACE_ID,
        account.id!,
        account.name!,
        String(account.account_status ?? "active")
      )
      .run();
  }

  return { synced: accounts.length, updatedAt: now, accounts: await getAdsReadiness() };
}

export async function listAdCampaigns() {
  await getAdsReadiness({ strict: true });
  const db = await getD1Database();
  if (!db) return [] as Array<{ id: string; adAccountId: string; externalCampaignId: string; name: string; status: string }>;
  const rows = await db
    .prepare("select id, ad_account_id, external_campaign_id, name, status from campaigns order by name asc limit 100")
    .all<CampaignRow>();
  return (rows.results ?? []).map((row) => ({
    id: row.id,
    adAccountId: row.ad_account_id,
    externalCampaignId: row.external_campaign_id,
    name: row.name,
    status: row.status
  }));
}

export async function listAdInsights() {
  await getAdsReadiness({ strict: true });
  const db = await getD1Database();
  if (!db) return [];
  const rows = await db
    .prepare(
      `select date, sum(spend) as spend, sum(impressions) as impressions, sum(clicks) as clicks
       from ad_metric_daily
       group by date
       order by date desc
       limit 30`
    )
    .all<{ date: string; spend: number; impressions: number; clicks: number }>();
  return rows.results ?? [];
}

async function requireAdsWrite() {
  if (process.env.AD_WRITE_ACTIONS_ENABLED !== "true") {
    throw new Error("AD_WRITE_ACTIONS_DISABLED");
  }
  const scopes = await currentScopes();
  const missingWrite = missing(scopes, ["ads_management"]);
  if (missingWrite.length > 0) throw blockedMetaPermission(missingWrite.join(","));
}

export async function createAdDraft(input: { sourcePostId?: string; adAccountId?: string; name?: string; budgetDaily?: number }) {
  const db = await getD1Database();
  const now = nowIso();
  const draft = {
    id: crypto.randomUUID(),
    workspaceId: DEFAULT_WORKSPACE_ID,
    sourcePostId: input.sourcePostId ?? null,
    adAccountId: input.adAccountId ?? null,
    name: input.name || "Boost post draft",
    budgetDaily: Number.isFinite(Number(input.budgetDaily)) ? Number(input.budgetDaily) : 0,
    status: "draft",
    createdAt: now,
    updatedAt: now
  };
  if (db) {
    await db
      .prepare(
        `insert into ad_drafts
        (id, workspace_id, source_post_id, ad_account_id, name, budget_daily, status, config_json, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        draft.id,
        draft.workspaceId,
        draft.sourcePostId,
        draft.adAccountId,
        draft.name,
        draft.budgetDaily,
        draft.status,
        JSON.stringify(input),
        draft.createdAt,
        draft.updatedAt
      )
      .run();
  }
  return draft;
}

export async function publishAdDraft(id: string) {
  void id;
  await requireAdsWrite();
  return { status: "ready_for_meta_write" as const };
}

export async function changeCampaignState(campaignId: string, nextState: "paused" | "active") {
  void campaignId;
  void nextState;
  await requireAdsWrite();
  return { status: "ready_for_meta_write" as const };
}
