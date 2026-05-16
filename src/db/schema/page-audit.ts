import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pageAudits = sqliteTable(
  "page_audits",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id").notNull(),
    lastScore: integer("last_score").notNull().default(0),
    status: text("status").notNull().default("ready"),
    summary: text("summary").notNull().default(""),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({
    pageIdx: index("page_audits_page_idx").on(table.pageId)
  })
);

export const pageAuditRuns = sqliteTable(
  "page_audit_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    pageId: text("page_id").notNull(),
    score: integer("score").notNull(),
    summary: text("summary").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    pageCreatedIdx: index("page_audit_runs_page_created_idx").on(table.pageId, table.createdAt)
  })
);

export const pageAuditFindings = sqliteTable(
  "page_audit_findings",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    pageId: text("page_id").notNull(),
    category: text("category").notNull(),
    severity: text("severity").notNull().default("info"),
    title: text("title").notNull(),
    recommendation: text("recommendation").notNull(),
    createdAt: text("created_at").notNull()
  },
  (table) => ({
    runIdx: index("page_audit_findings_run_idx").on(table.runId)
  })
);
