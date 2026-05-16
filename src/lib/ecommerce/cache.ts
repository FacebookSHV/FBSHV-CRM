import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";
import { getEcommerceProvider } from "./provider";
import type { ApiResult, ProductWithInventory } from "./types";

type CacheProductInput = Partial<ProductWithInventory> & {
  id?: string | null;
  sku?: string | null;
  name?: string | null;
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

export function normalizeProductForCache(input: CacheProductInput, syncedAt = nowIso()): ProductWithInventory {
  const sku = safeText(input.sku, safeText(input.id, crypto.randomUUID()));
  const availableStock = safeNumber(input.availableStock, safeNumber(input.stock, 0));
  const lowStockThreshold = safeNumber(input.lowStockThreshold, 10);

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
    imageUrl: safeText(input.imageUrl),
    description: safeText(input.description),
    status: normalizeStatus(input.status, availableStock, lowStockThreshold),
    priceUpdatedAt: safeText(input.priceUpdatedAt, syncedAt),
    syncedAt,
    stock: safeNumber(input.stock, availableStock),
    availableStock,
    reservedStock: safeNumber(input.reservedStock),
    lowStockThreshold
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
         discount_amount, discount_percent, currency, image_url, description, status, price_updated_at, synced_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
): Promise<ApiResult<{ synced: number; cached: number; source: "http"; d1: boolean }>> {
  const products = await getEcommerceProvider().getProducts({ limit });
  const db = await getD1Database();
  if (!products.success) {
    await writeProductSyncLog(db, "failed", 0, products.error);
    return { success: false, error: products.error, code: products.code };
  }

  const cached = await cacheProductsToD1(products.data);
  return {
    success: true as const,
    data: {
      synced: products.data.length,
      cached: cached.cached,
      source: "http" as const,
      d1: cached.d1
    }
  };
}
