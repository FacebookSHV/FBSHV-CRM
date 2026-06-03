import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const landingPages = sqliteTable(
  "landing_pages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    productSku: text("product_sku").notNull(),
    templateId: text("template_id").notNull(),
    status: text("status").notNull().default("draft"),
    heroJson: text("hero_json").notNull().default("{}"),
    sectionsJson: text("sections_json").notNull().default("{}"),
    seoJson: text("seo_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    publishedAt: text("published_at")
  },
  (table) => ({
    slugUnique: uniqueIndex("landing_pages_slug_unique").on(table.slug),
    statusIdx: index("landing_pages_status_idx").on(table.workspaceId, table.status)
  })
);

export const landingPageVariants = sqliteTable(
  "landing_page_variants",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    landingPageId: text("landing_page_id").notNull(),
    variantKey: text("variant_key").notNull(),
    name: text("name").notNull(),
    weight: integer("weight").notNull().default(100),
    templateId: text("template_id").notNull(),
    contentJson: text("content_json").notNull().default("{}"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    variantUnique: uniqueIndex("landing_page_variants_key_unique").on(table.landingPageId, table.variantKey),
    pageIdx: index("landing_page_variants_page_idx").on(table.landingPageId, table.status)
  })
);

export const landingPageEvents = sqliteTable(
  "landing_page_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    landingPageId: text("landing_page_id").notNull(),
    variantId: text("variant_id"),
    eventId: text("event_id").notNull(),
    eventName: text("event_name").notNull(),
    visitorId: text("visitor_id"),
    sourceUrl: text("source_url"),
    userDataJson: text("user_data_json").notNull().default("{}"),
    customDataJson: text("custom_data_json").notNull().default("{}"),
    capiStatus: text("capi_status").notNull().default("not_sent"),
    capiError: text("capi_error"),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    eventUnique: uniqueIndex("landing_page_events_event_id_unique").on(table.eventId),
    pageEventIdx: index("landing_page_events_page_event_idx").on(table.landingPageId, table.eventName, table.createdAt)
  })
);
