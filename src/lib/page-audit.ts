import { getD1Database } from "@/lib/db";
import { getEcommerceProvider } from "@/lib/ecommerce/provider";
import { getFacebookStore } from "@/lib/facebook/store";
import type { FacebookPageRecord } from "@/lib/facebook/types";
import { detectVietnamesePhone } from "@/lib/facebook/automation";

export type PageAuditFinding = {
  id: string;
  runId: string;
  pageId: string;
  category: string;
  severity: "info" | "warning" | "danger";
  title: string;
  recommendation: string;
  createdAt: string;
};

export type PageAuditRun = {
  id: string;
  workspaceId: string;
  pageId: string;
  pageName: string;
  score: number;
  summary: string;
  findings: PageAuditFinding[];
  createdAt: string;
};

type AuditRunRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  score: number;
  summary: string;
  created_at: string;
};

type AuditFindingRow = {
  id: string;
  run_id: string;
  page_id: string;
  category: string;
  severity: "info" | "warning" | "danger";
  title: string;
  recommendation: string;
  created_at: string;
};

const memoryRuns = new Map<string, PageAuditRun>();

function nowIso() {
  return new Date().toISOString();
}

function finding(
  runId: string,
  pageId: string,
  category: string,
  severity: PageAuditFinding["severity"],
  title: string,
  recommendation: string
): PageAuditFinding {
  return {
    id: crypto.randomUUID(),
    runId,
    pageId,
    category,
    severity,
    title,
    recommendation,
    createdAt: nowIso()
  };
}

async function saveRun(run: PageAuditRun) {
  const db = await getD1Database();
  if (!db) {
    memoryRuns.set(run.pageId, run);
    return;
  }

  await db
    .prepare(
      `insert into page_audits (id, workspace_id, page_id, last_score, status, summary, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set last_score = excluded.last_score, status = excluded.status,
      summary = excluded.summary, updated_at = excluded.updated_at`
    )
    .bind(`audit_${run.pageId}`, run.workspaceId, run.pageId, run.score, "ready", run.summary, run.createdAt)
    .run();

  await db
    .prepare(
      "insert into page_audit_runs (id, workspace_id, page_id, score, summary, created_at) values (?, ?, ?, ?, ?, ?)"
    )
    .bind(run.id, run.workspaceId, run.pageId, run.score, run.summary, run.createdAt)
    .run();

  for (const item of run.findings) {
    await db
      .prepare(
        `insert into page_audit_findings
        (id, run_id, page_id, category, severity, title, recommendation, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        item.id,
        item.runId,
        item.pageId,
        item.category,
        item.severity,
        item.title,
        item.recommendation,
        item.createdAt
      )
      .run();
  }
}

async function getLatestRunFromD1(pageId: string, pageName = "") {
  const db = await getD1Database();
  if (!db) return memoryRuns.get(pageId) ?? null;

  const run = await db
    .prepare("select * from page_audit_runs where page_id = ? order by created_at desc limit 1")
    .bind(pageId)
    .first<AuditRunRow>();
  if (!run) return null;

  const findings = await db
    .prepare("select * from page_audit_findings where run_id = ? order by severity desc, created_at asc")
    .bind(run.id)
    .all<AuditFindingRow>();

  return {
    id: run.id,
    workspaceId: run.workspace_id,
    pageId: run.page_id,
    pageName,
    score: run.score,
    summary: run.summary,
    createdAt: run.created_at,
    findings: (findings.results ?? []).map((item) => ({
      id: item.id,
      runId: item.run_id,
      pageId: item.page_id,
      category: item.category,
      severity: item.severity,
      title: item.title,
      recommendation: item.recommendation,
      createdAt: item.created_at
    }))
  };
}

async function scorePage(page: FacebookPageRecord): Promise<PageAuditRun> {
  const store = await getFacebookStore();
  const comments = (await store.listComments()).filter((comment) => comment.pageId === page.id);
  const conversations = (await store.listConversations()).filter((conversation) => conversation.pageId === page.id);
  const runId = crypto.randomUUID();
  const findings: PageAuditFinding[] = [];
  let score = 100;

  if (!page.pictureUrl) {
    score -= 8;
    findings.push(finding(runId, page.id, "profile", "warning", "Thiếu ảnh đại diện trong CRM", "Đồng bộ lại Page hoặc bổ sung ảnh đại diện để tăng độ tin cậy."));
  }
  if (page.tokenStatus !== "valid") {
    score -= 25;
    findings.push(finding(runId, page.id, "response_status", "danger", "Token Page không valid", "Kết nối lại Facebook Page để CRM trả lời và audit được dữ liệu mới."));
  }
  if (!page.subscribedWebhook) {
    score -= 20;
    findings.push(finding(runId, page.id, "engagement", "danger", "Webhook chưa bật", "Subscribe webhook để nhận chat/comment realtime."));
  }

  const exposedPhones = comments.filter((comment) => detectVietnamesePhone(comment.body));
  if (exposedPhones.length > 0) {
    score -= Math.min(20, exposedPhones.length * 5);
    findings.push(finding(runId, page.id, "comment_phone_exposure", "danger", "Có bình luận chứa số điện thoại", "Bật auto hide số điện thoại và xử lý các bình luận đang lộ thông tin khách."));
  }

  const unreplied = comments.filter((comment) => !comment.replied);
  if (unreplied.length > 0) {
    score -= Math.min(12, unreplied.length * 3);
    findings.push(finding(runId, page.id, "response_status", "warning", "Có bình luận chưa trả lời", "Ưu tiên trả lời hoặc bật auto reply comment với template an toàn."));
  }

  if (comments.length + conversations.length === 0) {
    score -= 10;
    findings.push(finding(runId, page.id, "engagement", "info", "Chưa có event gần đây", "Theo dõi webhook sau bài đăng mới để đánh giá engagement thực tế."));
  }

  const products = await getEcommerceProvider().getProducts({ limit: 5 });
  if (!products.success || products.data.length === 0) {
    score -= 10;
    findings.push(finding(runId, page.id, "product_coverage", "warning", "Chưa đọc được sản phẩm TMĐT", "Kiểm tra lại ecommerce provider để planner có sản phẩm lên nội dung."));
  }

  if (findings.length === 0) {
    findings.push(finding(runId, page.id, "profile_completeness", "info", "Page đang ổn định", "Duy trì lịch đăng đều và phản hồi nhanh khi có inbox/comment."));
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    id: runId,
    workspaceId: page.workspaceId,
    pageId: page.id,
    pageName: page.name,
    score: finalScore,
    summary: `Điểm audit ${finalScore}/100 cho ${page.name}.`,
    findings,
    createdAt: nowIso()
  };
}

export async function runPageAudit(pageId?: string) {
  const store = await getFacebookStore();
  const pages = pageId ? [await store.getPage(pageId)].filter(Boolean) as FacebookPageRecord[] : await store.listPages();
  const runs: PageAuditRun[] = [];
  for (const page of pages) {
    const run = await scorePage(page);
    await saveRun(run);
    runs.push(run);
  }
  return runs;
}

export async function listPageAudits() {
  const store = await getFacebookStore();
  const pages = await store.listPages();
  const existing = await Promise.all(pages.map((page) => getLatestRunFromD1(page.id, page.name)));
  return existing.filter((item): item is PageAuditRun => Boolean(item));
}

export async function getLatestPageAudit(pageId: string) {
  const page = await (await getFacebookStore()).getPage(pageId);
  return getLatestRunFromD1(pageId, page?.name ?? "");
}

export function resetPageAuditMemoryForTests() {
  memoryRuns.clear();
}
