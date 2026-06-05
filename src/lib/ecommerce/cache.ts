import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { getEcommerceProviderAsync } from "./provider";
import type { ApiResult, ProductSyncSummary, ProductWithInventory } from "./types";

type CacheProductInput = Partial<ProductWithInventory> & {
  id?: string | null;
  sku?: string | null;
  name?: string | null;
  images?: unknown;
  promptAssets?: unknown;
  variants?: unknown;
};

type CachedProductRow = {
  id: string;
  workspace_id: string;
  external_product_id: string;
  sku: string;
  name: string;
  category: string | null;
  cost_price: number;
  original_price: number;
  sale_price: number;
  current_price: number;
  discount_amount: number;
  discount_percent: number;
  currency: string;
  image_url: string | null;
  description: string | null;
  status: ProductWithInventory["status"];
  source: string | null;
  raw_payload_json: string | null;
  missing_from_source: number | null;
  price_updated_at: string | null;
  synced_at: string;
  stock: number | null;
  available_stock: number | null;
  reserved_stock: number | null;
  low_stock_threshold: number | null;
  inventory_synced_at: string | null;
};

type SyncLogRow = {
  status: string;
  synced_count: number;
  error: string | null;
  created_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStatus(value: unknown, availableStock: number, lowStockThreshold: number) {
  if (value === "inactive") return "inactive";
  if (availableStock <= lowStockThreshold) return "low_stock";
  return "active";
}

function clampLimit(limit?: number) {
  const numeric = Number(limit ?? 50);
  if (!Number.isFinite(numeric)) return 50;
  return Math.max(1, Math.min(500, Math.floor(numeric)));
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function normalizePromptAssets(input: unknown, raw: Record<string, unknown>) {
  const assets = parseJsonRecord(input);
  const rawAssets = parseJsonRecord(raw.promptAssets);
  const merged = { ...rawAssets, ...assets };
  const allImageUrls = uniqueStrings([
    ...stringArray(rawAssets.allImageUrls),
    ...stringArray(assets.allImageUrls)
  ]);
  if (allImageUrls.length > 0) merged.allImageUrls = allImageUrls;
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function normalizeVariants(input: unknown, raw: Record<string, unknown>) {
  const variants = Array.isArray(input) ? input : Array.isArray(raw.variants) ? raw.variants : [];
  return variants.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

export function normalizeProductForCache(input: CacheProductInput, syncedAt = nowIso()): ProductWithInventory {
  const raw = parseJsonRecord(input.rawPayload);
  const sku = safeText(input.sku, safeText(input.id, crypto.randomUUID()));
  const availableStock = safeNumber(input.availableStock, safeNumber(input.stock, 0));
  const lowStockThreshold = safeNumber(input.lowStockThreshold, 10);
  const promptAssets = normalizePromptAssets(input.promptAssets, raw);
  const imageUrl = safeText(input.imageUrl, safeText(raw.imageUrl));
  const images = uniqueStrings([
    imageUrl,
    ...stringArray(input.images),
    ...stringArray(raw.images),
    ...stringArray(promptAssets?.allImageUrls)
  ]);
  const variants = normalizeVariants(input.variants, raw);

  return {
    id: safeText(input.id, sku),
    workspaceId: safeText(input.workspaceId, DEFAULT_WORKSPACE_ID),
    externalProductId: safeText(input.externalProductId, safeText(input.id, sku)),
    sku,
    name: safeText(input.name, `SKU ${sku}`),
    category: safeText(input.category),
    costPrice: safeNumber(input.costPrice),
    originalPrice: safeNumber(input.originalPrice),
    salePrice: safeNumber(input.salePrice),
    currentPrice: safeNumber(input.currentPrice, safeNumber(input.salePrice, safeNumber(input.originalPrice))),
    discountAmount: safeNumber(input.discountAmount),
    discountPercent: safeNumber(input.discountPercent),
    currency: safeText(input.currency, "VND"),
    imageUrl: imageUrl || images[0] || "",
    images,
    description: safeText(input.description, safeText(raw.description)),
    promptAssets,
    variants,
    status: normalizeStatus(input.status, availableStock, lowStockThreshold),
    source: safeText(input.source, "ecommerce_external_products"),
    rawPayload: safeText(input.rawPayload, safeJson(input)),
    missingFromSource: Boolean(input.missingFromSource),
    priceUpdatedAt: safeText(input.priceUpdatedAt, syncedAt),
    syncedAt,
    stock: safeNumber(input.stock, availableStock),
    availableStock,
    reservedStock: safeNumber(input.reservedStock),
    lowStockThreshold
  };
}

function mapCachedProduct(row: CachedProductRow): ProductWithInventory {
  const syncedAt = row.synced_at || row.inventory_synced_at || nowIso();
  return normalizeProductForCache({
    id: row.id,
    workspaceId: row.workspace_id,
    externalProductId: row.external_product_id,
    sku: row.sku,
    name: row.name,
    category: row.category ?? "",
    costPrice: safeNumber(row.cost_price),
    originalPrice: safeNumber(row.original_price),
    salePrice: safeNumber(row.sale_price),
    currentPrice: safeNumber(row.current_price),
    discountAmount: safeNumber(row.discount_amount),
    discountPercent: safeNumber(row.discount_percent),
    currency: safeText(row.currency, "VND"),
    imageUrl: row.image_url ?? "",
    description: row.description ?? "",
    status: row.status,
    source: row.source ?? "ecommerce_external_products",
    rawPayload: row.raw_payload_json ?? "{}",
    missingFromSource: Boolean(row.missing_from_source),
    priceUpdatedAt: row.price_updated_at ?? syncedAt,
    syncedAt,
    stock: safeNumber(row.stock),
    availableStock: safeNumber(row.available_stock),
    reservedStock: safeNumber(row.reserved_stock),
    lowStockThreshold: safeNumber(row.low_stock_threshold, 10)
  }, syncedAt);
}

const cachedProductSelect = `
  select
    p.id, p.workspace_id, p.external_product_id, p.sku, p.name, p.category,
    p.cost_price, p.original_price, p.sale_price, p.current_price, p.discount_amount,
    p.discount_percent, p.currency, p.image_url, p.description, p.status,
    p.source, p.raw_payload_json, p.missing_from_source, p.price_updated_at, p.synced_at,
    i.stock, i.available_stock, i.reserved_stock, i.low_stock_threshold, i.synced_at as inventory_synced_at
  from product_cache p
  left join inventory_cache i on i.sku = p.sku and i.workspace_id = p.workspace_id
`;

export async function readCachedProducts(params: { q?: string; sku?: string; limit?: number } = {}) {
  const db = await getD1Database();
  if (!db) return [] as ProductWithInventory[];

  const limit = clampLimit(params.limit);
  const where: string[] = ["p.workspace_id = ?"];
  const binds: Array<string | number> = [DEFAULT_WORKSPACE_ID];
  if (params.sku?.trim()) {
    where.push("lower(p.sku) = lower(?)");
    binds.push(params.sku.trim());
  }
  if (params.q?.trim()) {
    where.push("(lower(p.name) like lower(?) or lower(p.sku) like lower(?) or lower(p.external_product_id) like lower(?))");
    const needle = `%${params.q.trim()}%`;
    binds.push(needle, needle, needle);
  }

  // NEO: Product picker và trang Products đọc cache D1 bền sau F5, không đọc state React tạm thời.
  const rows = await db
    .prepare(`${cachedProductSelect} where ${where.join(" and ")} order by p.synced_at desc, p.name asc limit ?`)
    .bind(...binds, limit)
    .all<CachedProductRow>();
  return (rows.results ?? []).map(mapCachedProduct);
}

export async function readCachedProductById(id: string) {
  const db = await getD1Database();
  if (!db) return null;
  const row = await db
    .prepare(`${cachedProductSelect} where p.workspace_id = ? and (p.id = ? or p.external_product_id = ? or p.sku = ?) limit 1`)
    .bind(DEFAULT_WORKSPACE_ID, id, id, id)
    .first<CachedProductRow>();
  return row ? mapCachedProduct(row) : null;
}

export async function readCachedProductBySku(sku: string) {
  const products = await readCachedProducts({ sku, limit: 1 });
  return products[0] ?? null;
}

export async function getProductSyncSummary(): Promise<ProductSyncSummary> {
  const db = await getD1Database();
  if (!db) return { lastSyncedAt: null, syncedCount: 0, status: "no_database", error: null };
  const latestAny = await db
    .prepare("select status, synced_count, error, created_at from product_sync_logs where workspace_id = ? order by created_at desc limit 1")
    .bind(DEFAULT_WORKSPACE_ID)
    .first<SyncLogRow>();
  const latestSuccess = await db
    .prepare("select status, synced_count, error, created_at from product_sync_logs where workspace_id = ? and status = 'success' order by created_at desc limit 1")
    .bind(DEFAULT_WORKSPACE_ID)
    .first<SyncLogRow>();
  return {
    lastSyncedAt: latestSuccess?.created_at ?? latestAny?.created_at ?? null,
    syncedCount: latestSuccess?.synced_count ?? latestAny?.synced_count ?? 0,
    status: latestAny?.status ?? null,
    error: latestAny?.status === "failed" ? latestAny.error : null
  };
}

async function writeProductSyncLog(
  db: D1Database | undefined,
  status: "success" | "failed",
  syncedCount: number,
  error?: string
) {
  if (!db) return;
  await db
    .prepare(
      `insert into product_sync_logs (id, workspace_id, source, status, synced_count, error, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), DEFAULT_WORKSPACE_ID, "ecommerce_external_products", status, syncedCount, error ?? null, nowIso())
    .run();
}

export async function cacheProductsToD1(products: ProductWithInventory[]) {
  const db = await getD1Database();
  const normalized = products.map((product) => normalizeProductForCache(product));
  if (!db) return { cached: normalized.length, d1: false };

  for (const product of normalized) {
    // NEO: Product Sync chỉ cache dữ liệu đọc từ Web Quản Lý TMĐT, không tự quản lý tồn kho gốc.
    await db
      .prepare(
        `insert into product_cache
        (id, workspace_id, external_product_id, sku, name, category, cost_price, original_price, sale_price, current_price,
         discount_amount, discount_percent, currency, image_url, description, status, source, raw_payload_json, missing_from_source,
         price_updated_at, synced_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(sku) do update set
          external_product_id = excluded.external_product_id,
          name = excluded.name,
          category = excluded.category,
          cost_price = excluded.cost_price,
          original_price = excluded.original_price,
          sale_price = excluded.sale_price,
          current_price = excluded.current_price,
          discount_amount = excluded.discount_amount,
          discount_percent = excluded.discount_percent,
          currency = excluded.currency,
          image_url = excluded.image_url,
          description = excluded.description,
          status = excluded.status,
          source = excluded.source,
          raw_payload_json = excluded.raw_payload_json,
          missing_from_source = 0,
          price_updated_at = excluded.price_updated_at,
          synced_at = excluded.synced_at`
      )
      .bind(
        product.id,
        product.workspaceId,
        product.externalProductId,
        product.sku,
        product.name,
        product.category,
        product.costPrice,
        product.originalPrice,
        product.salePrice,
        product.currentPrice,
        product.discountAmount,
        product.discountPercent,
        product.currency,
        product.imageUrl,
        product.description,
        product.status,
        product.source ?? "ecommerce_external_products",
        product.rawPayload ?? safeJson(product),
        product.missingFromSource ? 1 : 0,
        product.priceUpdatedAt,
        product.syncedAt
      )
      .run();

    await db
      .prepare(
        `insert into inventory_cache
        (id, workspace_id, sku, stock, available_stock, reserved_stock, low_stock_threshold, synced_at)
        values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          stock = excluded.stock,
          available_stock = excluded.available_stock,
          reserved_stock = excluded.reserved_stock,
          low_stock_threshold = excluded.low_stock_threshold,
          synced_at = excluded.synced_at`
      )
      .bind(
        `inventory_${product.sku}`,
        product.workspaceId,
        product.sku,
        product.stock,
        product.availableStock,
        product.reservedStock,
        product.lowStockThreshold,
        product.syncedAt
      )
      .run();
  }

  await writeProductSyncLog(db, "success", normalized.length);
  return { cached: normalized.length, d1: true };
}

export async function syncProductsFromExternal(
  limit = 200
): Promise<ApiResult<{ synced: number; cached: number; source: "http"; d1: boolean; lastSyncedAt: string | null }>> {
  const products = await (await getEcommerceProviderAsync()).getProducts({ limit });
  const db = await getD1Database();
  if (!products.success) {
    await writeProductSyncLog(db, "failed", 0, products.error);
    return { success: false, error: products.error, code: products.code };
  }

  const cached = await cacheProductsToD1(products.data);
  const summary = await getProductSyncSummary();
  return {
    success: true as const,
    data: {
      synced: products.data.length,
      cached: cached.cached,
      source: "http" as const,
      d1: cached.d1,
      lastSyncedAt: summary.lastSyncedAt
    }
  };
}
