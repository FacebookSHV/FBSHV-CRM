import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { blockedMetaPermission } from "./permissions";
import { getFacebookRuntimeConfigAsync } from "./env";
import { getFacebookStore } from "./store";
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

type AdDraftRow = {
  id: string;
  workspace_id: string;
  source_post_id: string | null;
  ad_account_id: string | null;
  name: string;
  budget_daily: number;
  status: string;
  config_json: string;
  created_at: string;
  updated_at: string;
};

type AdDraftConfig = {
  pageId?: string;
  sourcePostId?: string;
  adAccountId?: string;
  name?: string;
  budgetDaily?: number;
  objective?: "OUTCOME_ENGAGEMENT" | "OUTCOME_TRAFFIC" | "OUTCOME_SALES";
  schedule?: string;
  audience?: string;
  creativeText?: string;
  productSku?: string;
  destinationUrl?: string;
};

type MetaObjectResponse = {
  id?: string;
  name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
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

export async function isAdsWriteActionsEnabled() {
  let value = process.env.AD_WRITE_ACTIONS_ENABLED;
  try {
    const context = await getCloudflareContext({ async: true });
    const bindingValue = (context.env as Record<string, unknown>).AD_WRITE_ACTIONS_ENABLED;
    if (typeof bindingValue === "string") value = bindingValue;
  } catch {
    // NEO: Local/test không có Cloudflare context thì dùng process.env.
  }
  return typeof value === "string" && value.trim() === "true";
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

function normalizeMetaParam(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function sanitizeMetaError(message: string) {
  return message.replace(/[A-Za-z0-9_-]{40,}/g, (value) => `${value.slice(0, 6)}...${value.slice(-4)}`);
}

async function metaAdsPostRequest<T>(path: string, params: Record<string, unknown> = {}) {
  const auth = await getAdsAccessToken();
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const normalized = normalizeMetaParam(value);
    if (normalized !== undefined) body.set(key, normalized);
  }
  body.set("access_token", auth.token);

  const response = await fetch(`https://graph.facebook.com/${auth.graphApiVersion}${path}`, {
    method: "POST",
    body
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: {
      message?: string;
      code?: number;
      type?: string;
      error_subcode?: number;
      error_user_title?: string;
      error_user_msg?: string;
      error_data?: unknown;
    };
  };
  if (!response.ok || payload.error) {
    const error = payload.error;
    const details = [error?.type, error?.code ? `code=${error.code}` : "", error?.error_subcode ? `subcode=${error.error_subcode}` : ""]
      .filter(Boolean)
      .join(", ");
    const userDetails = [
      error?.error_user_title,
      error?.error_user_msg,
      error?.error_data ? sanitizeMetaError(JSON.stringify(error.error_data)) : ""
    ].filter(Boolean).join(" | ");
    const message = sanitizeMetaError(error?.message || "Meta Marketing API trả lỗi");
    throw new Error(`META_ADS_API_ERROR: ${message}${details ? ` (${details})` : ""}${userDetails ? `: ${userDetails}` : ""}`);
  }
  return payload;
}

async function metaAdsStep<T>(step: string, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("META_ADS_API_ERROR")) {
      throw new Error(`${error.message}; step=${step}`);
    }
    throw error;
  }
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
      writeActionsEnabled: await isAdsWriteActionsEnabled(),
      accounts: []
    };
  }

  const db = await getD1Database();
  if (!db) {
    return {
      status: "empty",
      missingPermissions: [],
      writeActionsEnabled: await isAdsWriteActionsEnabled(),
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
    writeActionsEnabled: await isAdsWriteActionsEnabled(),
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
    writeActionsEnabled: await isAdsWriteActionsEnabled()
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
  if (!(await isAdsWriteActionsEnabled())) {
    throw new Error("AD_WRITE_ACTIONS_DISABLED");
  }
  const scopes = await currentScopes();
  const missingWrite = missing(scopes, ["ads_management"]);
  if (missingWrite.length > 0) throw blockedMetaPermission(missingWrite.join(","));
}

async function readAdDraft(id: string) {
  const db = await getD1Database();
  if (!db) throw new Error("BLOCKED_BY_MISSING_BINDING: DB");
  const row = await db
    .prepare("select * from ad_drafts where id = ? and workspace_id = ?")
    .bind(id, DEFAULT_WORKSPACE_ID)
    .first<AdDraftRow>();
  if (!row) throw new Error(`ADS_DRAFT_NOT_FOUND: ${id}`);
  return row;
}

function parseDraftConfig(row: AdDraftRow): AdDraftConfig {
  try {
    return JSON.parse(row.config_json || "{}") as AdDraftConfig;
  } catch {
    return {};
  }
}

function ensureDestinationUrl(value?: string) {
  if (!value) throw new Error("ADS_DESTINATION_URL_REQUIRED: Cần nhập link đích trước khi ghi quảng cáo thật.");
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
    return url.toString();
  } catch {
    throw new Error("ADS_DESTINATION_URL_REQUIRED: Link đích phải là URL http/https hợp lệ.");
  }
}

function normalizeObjective(value?: string) {
  if (value === "OUTCOME_ENGAGEMENT" || value === "OUTCOME_SALES") return value;
  return "OUTCOME_TRAFFIC";
}

function optimizationGoalFor(objective: string) {
  if (objective === "OUTCOME_ENGAGEMENT") return "POST_ENGAGEMENT";
  if (objective === "OUTCOME_SALES") {
    throw new Error("ADS_PIXEL_REQUIRED_FOR_SALES_OBJECTIVE: Mục tiêu Sales cần Pixel/CAPI và promoted_object trước khi ghi thật.");
  }
  return "LINK_CLICKS";
}

function normalizeBudget(value: number) {
  const budget = Math.trunc(Number(value || 0));
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new Error("ADS_BUDGET_REQUIRED: Ngân sách ngày phải lớn hơn 0 trước khi ghi quảng cáo thật.");
  }
  return budget;
}

function normalizeStartTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function resolveAdPage(pageId?: string) {
  if (!pageId) throw new Error("ADS_PAGE_REQUIRED: Cần chọn Fanpage trước khi ghi quảng cáo thật.");
  const store = await getFacebookStore();
  const page = (await store.getPage(pageId)) || (await store.findPageByExternalId(pageId));
  if (!page || page.status === "mock") throw new Error("ADS_PAGE_REQUIRED: Fanpage không tồn tại hoặc không phải dữ liệu thật.");
  return page;
}

async function logAdAction(input: {
  actionType: string;
  targetId?: string | null;
  dryRun: boolean;
  status: "success" | "failed" | "blocked";
  error?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getD1Database();
  if (!db) return;
  await db
    .prepare(
      `insert into ad_actions_log (id, workspace_id, action_type, target_id, dry_run, status, error, metadata_json, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      DEFAULT_WORKSPACE_ID,
      input.actionType,
      input.targetId ?? null,
      input.dryRun ? 1 : 0,
      input.status,
      input.error ?? null,
      JSON.stringify(input.metadata ?? {}),
      nowIso()
    )
    .run();
}

async function cacheLiveAdObjects(input: {
  accountId: string;
  campaign: MetaObjectResponse;
  adset: MetaObjectResponse;
  ad: MetaObjectResponse;
  creativeId: string;
  name: string;
  budgetDaily: number;
}) {
  const db = await getD1Database();
  if (!db) return;
  await db.batch([
    db
      .prepare(
        `insert into campaigns (id, ad_account_id, external_campaign_id, name, status)
         values (?, ?, ?, ?, ?)
         on conflict(id) do update set name = excluded.name, status = excluded.status`
      )
      .bind(input.campaign.id!, input.accountId, input.campaign.id!, input.campaign.name || input.name, input.campaign.status || input.campaign.effective_status || "PAUSED"),
    db
      .prepare(
        `insert into ad_sets (id, campaign_id, external_ad_set_id, name, budget, status)
         values (?, ?, ?, ?, ?, ?)
         on conflict(id) do update set name = excluded.name, budget = excluded.budget, status = excluded.status`
      )
      .bind(input.adset.id!, input.campaign.id!, input.adset.id!, input.adset.name || `${input.name} - Nhóm`, input.budgetDaily, input.adset.status || input.adset.effective_status || "PAUSED"),
    db
      .prepare(
        `insert into ads (id, ad_set_id, external_ad_id, name, creative_json, status)
         values (?, ?, ?, ?, ?, ?)
         on conflict(id) do update set name = excluded.name, creative_json = excluded.creative_json, status = excluded.status`
      )
      .bind(
        input.ad.id!,
        input.adset.id!,
        input.ad.id!,
        input.ad.name || `${input.name} - Ad`,
        JSON.stringify({ creativeId: input.creativeId }),
        input.ad.status || input.ad.effective_status || "PAUSED"
      )
  ]);
}

export async function createAdDraft(input: {
  pageId?: string;
  sourcePostId?: string;
  adAccountId?: string;
  name?: string;
  budgetDaily?: number;
  objective?: string;
  schedule?: string;
  audience?: string;
  creativeText?: string;
  productSku?: string;
  destinationUrl?: string;
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
  await requireAdsWrite();
  const row = await readAdDraft(id);
  const config = parseDraftConfig(row);
  const accountId = row.ad_account_id || config.adAccountId;
  if (!accountId) throw new Error("ADS_ACCOUNT_REQUIRED: Thiếu ad account cho draft quảng cáo.");
  const page = await resolveAdPage(config.pageId);
  const destinationUrl = ensureDestinationUrl(config.destinationUrl);
  const objective = normalizeObjective(config.objective);
  const optimizationGoal = optimizationGoalFor(objective);
  const budgetDaily = normalizeBudget(row.budget_daily || Number(config.budgetDaily));
  const name = row.name || config.name || "FBSHV CRM live ad";
  const creativeText = (config.creativeText || name).trim();
  const startTime = normalizeStartTime(config.schedule);
  const targeting = {
    geo_locations: { countries: ["VN"] },
    age_min: 18,
    age_max: 65
  };

  try {
    // NEO: Live write Ads tạo object Meta thật ở trạng thái PAUSED để readback mà không tự chạy tiền.
    const campaign = await metaAdsStep("campaign", () =>
      metaAdsPostRequest<MetaObjectResponse>(`/${encodeURIComponent(accountId)}/campaigns`, {
        name,
        objective,
        status: "PAUSED",
        is_adset_budget_sharing_enabled: false,
        special_ad_categories: []
      })
    );
    const adset = await metaAdsStep("adset", () =>
      metaAdsPostRequest<MetaObjectResponse>(`/${encodeURIComponent(accountId)}/adsets`, {
        name: `${name} - Nhóm quảng cáo`,
        campaign_id: campaign.id,
        daily_budget: budgetDaily,
        billing_event: "IMPRESSIONS",
        optimization_goal: optimizationGoal,
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting,
        start_time: startTime,
        status: "PAUSED"
      })
    );
    const creative = await metaAdsStep("creative", () =>
      metaAdsPostRequest<{ id?: string }>(`/${encodeURIComponent(accountId)}/adcreatives`, {
        name: `${name} - Nội dung`,
        object_story_spec: {
          page_id: page.externalPageId,
          link_data: {
            link: destinationUrl,
            message: creativeText,
            call_to_action: {
              type: "LEARN_MORE",
              value: { link: destinationUrl }
            }
          }
        }
      })
    );
    if (!creative.id) throw new Error("META_ADS_API_ERROR: Meta không trả creative id.");
    const ad = await metaAdsStep("ad", () =>
      metaAdsPostRequest<MetaObjectResponse>(`/${encodeURIComponent(accountId)}/ads`, {
        name: `${name} - Quảng cáo`,
        adset_id: adset.id,
        creative: { creative_id: creative.id },
        status: "PAUSED"
      })
    );
    if (!campaign.id || !adset.id || !ad.id) throw new Error("META_ADS_API_ERROR: Meta không trả đủ campaign/adset/ad id.");

    const [campaignReadback, adsetReadback, adReadback] = await Promise.all([
      metaAdsRequest<MetaObjectResponse>(`/${encodeURIComponent(campaign.id)}`, { fields: "id,name,status,effective_status,objective" }),
      metaAdsRequest<MetaObjectResponse>(`/${encodeURIComponent(adset.id)}`, { fields: "id,name,status,effective_status" }),
      metaAdsRequest<MetaObjectResponse>(`/${encodeURIComponent(ad.id)}`, { fields: "id,name,status,effective_status" })
    ]);

    await cacheLiveAdObjects({
      accountId,
      campaign: campaignReadback,
      adset: adsetReadback,
      ad: adReadback,
      creativeId: creative.id,
      name,
      budgetDaily
    });

    const db = await getD1Database();
    await db
      ?.prepare("update ad_drafts set status = ?, updated_at = ? where id = ? and workspace_id = ?")
      .bind("live_paused", nowIso(), id, DEFAULT_WORKSPACE_ID)
      .run();
    await logAdAction({
      actionType: "ads_live_create_paused",
      targetId: adReadback.id || ad.id,
      dryRun: false,
      status: "success",
      metadata: {
        draftId: id,
        adAccountId: accountId,
        pageId: page.externalPageId,
        campaignId: campaignReadback.id,
        adsetId: adsetReadback.id,
        adId: adReadback.id,
        creativeId: creative.id,
        status: "PAUSED"
      }
    });
    return {
      status: "live_paused" as const,
      draftId: id,
      adAccountId: accountId,
      campaign: campaignReadback,
      adset: adsetReadback,
      ad: adReadback,
      creativeId: creative.id
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "META_ADS_API_ERROR: Không ghi được quảng cáo thật.";
    const db = await getD1Database();
    await db
      ?.prepare("update ad_drafts set status = ?, updated_at = ? where id = ? and workspace_id = ?")
      .bind("failed", nowIso(), id, DEFAULT_WORKSPACE_ID)
      .run();
    await logAdAction({
      actionType: "ads_live_create_paused",
      targetId: id,
      dryRun: false,
      status: "failed",
      error: message,
      metadata: { draftId: id, adAccountId: accountId }
    });
    throw error;
  }
}

export async function changeCampaignState(campaignId: string, nextState: "paused" | "active") {
  await requireAdsWrite();
  const status = nextState === "active" ? "ACTIVE" : "PAUSED";
  await metaAdsPostRequest(`/${encodeURIComponent(campaignId)}`, { status });
  const campaign = await metaAdsRequest<MetaObjectResponse>(`/${encodeURIComponent(campaignId)}`, {
    fields: "id,name,status,effective_status"
  });
  await logAdAction({
    actionType: nextState === "active" ? "ads_campaign_activate" : "ads_campaign_pause",
    targetId: campaignId,
    dryRun: false,
    status: "success",
    metadata: { campaignId, status: campaign.status || campaign.effective_status }
  });
  return { status: campaign.status || status, campaign };
}
