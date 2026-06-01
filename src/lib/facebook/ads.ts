import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { blockedMetaPermission } from "./permissions";
import { getFacebookRuntimeConfigAsync } from "./env";
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

async function getAdsAccessToken() {
  await getAdsReadiness({ strict: true });
  const config = await getFacebookRuntimeConfigAsync();
  if (config.mode !== "real") throw blockedMetaPermission("ads_read,business_management");
  const connection = await latestConnection();
  if (!connection) throw blockedMetaPermission("ads_read,business_management");
  return {
    token: await decryptToken(connection.access_token_encrypted, config.encryptionKey),
    graphApiVersion: config.graphApiVersion
  };
}

async function metaAdsRequest<T>(path: string, params: Record<string, string | undefined> = {}) {
  const auth = await getAdsAccessToken();
  const url = new URL(`https://graph.facebook.com/${auth.graphApiVersion}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", auth.token);
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string; code?: number; type?: string; error_subcode?: number };
  };
  if (!response.ok || payload.error) {
    const error = payload.error;
    const details = [error?.type, error?.code ? `code=${error.code}` : "", error?.error_subcode ? `subcode=${error.error_subcode}` : ""]
      .filter(Boolean)
      .join(", ");
    throw new Error(`META_ADS_API_ERROR: ${error?.message || "Meta Marketing API trả lỗi"}${details ? ` (${details})` : ""}`);
  }
  return payload;
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
  const config = await getFacebookRuntimeConfigAsync();
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

export async function getAdAccountDetail(accountId: string) {
  const readiness = await getAdsReadiness({ strict: true });
  const cached = readiness.accounts.find((account) => account.id === accountId || account.externalAccountId === accountId);
  const externalId = cached?.externalAccountId || accountId;
  // NEO: Ad account detail gọi Marketing API thật; nếu thiếu quyền thì trả lỗi permission, không dựng số liệu giả.
  const detail = await metaAdsRequest<{
    id?: string;
    name?: string;
    account_status?: number | string;
    currency?: string;
    timezone_name?: string;
    timezone_id?: number;
  }>(`/${encodeURIComponent(externalId)}`, {
    fields: "id,name,account_status,currency,timezone_name,timezone_id"
  });
  return {
    id: cached?.id || detail.id || externalId,
    externalAccountId: detail.id || externalId,
    name: detail.name || cached?.name || externalId,
    status: String(detail.account_status ?? cached?.status ?? "unknown"),
    currency: detail.currency ?? null,
    timezoneName: detail.timezone_name ?? null,
    timezoneId: detail.timezone_id ?? null,
    writeActionsEnabled: process.env.AD_WRITE_ACTIONS_ENABLED === "true"
  };
}

export async function listAdAccountCampaigns(accountId: string) {
  const payload = await metaAdsRequest<{
    data?: Array<{
      id?: string;
      name?: string;
      status?: string;
      effective_status?: string;
      objective?: string;
      created_time?: string;
      updated_time?: string;
    }>;
  }>(`/${encodeURIComponent(accountId)}/campaigns`, {
    fields: "id,name,status,effective_status,objective,created_time,updated_time",
    limit: "100"
  });
  return payload.data ?? [];
}

export async function listAdAccountAdSets(accountId: string, campaignId?: string | null) {
  const payload = await metaAdsRequest<{
    data?: Array<{
      id?: string;
      name?: string;
      campaign_id?: string;
      status?: string;
      effective_status?: string;
      optimization_goal?: string;
      billing_event?: string;
      daily_budget?: string;
      lifetime_budget?: string;
      targeting?: Record<string, unknown>;
    }>;
  }>(`/${encodeURIComponent(accountId)}/adsets`, {
    fields: "id,name,campaign_id,status,effective_status,optimization_goal,billing_event,daily_budget,lifetime_budget,targeting",
    filtering: campaignId ? JSON.stringify([{ field: "campaign.id", operator: "EQUAL", value: campaignId }]) : undefined,
    limit: "100"
  });
  return payload.data ?? [];
}

export async function listAdAccountAds(accountId: string, campaignId?: string | null, adsetId?: string | null) {
  const filters = [
    campaignId ? { field: "campaign.id", operator: "EQUAL", value: campaignId } : null,
    adsetId ? { field: "adset.id", operator: "EQUAL", value: adsetId } : null
  ].filter(Boolean);
  const payload = await metaAdsRequest<{
    data?: Array<{
      id?: string;
      name?: string;
      adset_id?: string;
      campaign_id?: string;
      status?: string;
      effective_status?: string;
      preview_shareable_link?: string;
      creative?: { id?: string; name?: string };
    }>;
  }>(`/${encodeURIComponent(accountId)}/ads`, {
    fields: "id,name,adset_id,campaign_id,status,effective_status,preview_shareable_link,creative{id,name}",
    filtering: filters.length ? JSON.stringify(filters) : undefined,
    limit: "100"
  });
  return payload.data ?? [];
}

export async function listAdAccountInsights(
  accountId: string,
  params: { datePreset?: string | null; since?: string | null; until?: string | null; level?: string | null } = {}
) {
  const timeRange = params.since && params.until ? JSON.stringify({ since: params.since, until: params.until }) : undefined;
  const payload = await metaAdsRequest<{
    data?: Array<Record<string, unknown>>;
  }>(`/${encodeURIComponent(accountId)}/insights`, {
    fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,actions",
    date_preset: timeRange ? undefined : params.datePreset || "last_7d",
    time_range: timeRange,
    level: params.level || "account",
    limit: "100"
  });
  return payload.data ?? [];
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

export async function createAdDraft(input: {
  sourcePostId?: string;
  adAccountId?: string;
  name?: string;
  budgetDaily?: number;
  objective?: string;
  schedule?: string;
  audience?: string;
  creativeText?: string;
  productSku?: string;
}) {
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
