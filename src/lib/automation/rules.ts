import { getD1Database } from "@/lib/db";
import { getFacebookAutomationConfig } from "@/lib/facebook/automation";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export type AutomationRuleView = {
  id: string;
  name: string;
  triggerType: string;
  active: boolean;
  actionTypes: string[];
  runtimeEnabled: boolean;
  createdAt: string;
};

export type AutomationActionView = {
  id: string;
  pageId?: string | null;
  eventId: string;
  actionType: string;
  targetId?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

type RuleRow = {
  id: string;
  name: string;
  trigger_type: string;
  active: number;
  created_at: string;
  action_types: string | null;
};

type ActionRow = {
  id: string;
  page_id: string | null;
  event_id: string;
  action_type: string;
  target_id: string | null;
  status: string;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const defaultRules = [
  {
    id: "rule_auto_reply_message",
    name: "Auto reply message",
    triggerType: "facebook_message",
    actionTypes: ["auto_reply_message"]
  },
  {
    id: "rule_auto_reply_comment",
    name: "Auto reply comment",
    triggerType: "facebook_comment",
    actionTypes: ["auto_reply_comment"]
  },
  {
    id: "rule_hide_phone_comment",
    name: "Hide comment chứa số điện thoại",
    triggerType: "facebook_comment",
    actionTypes: ["auto_hide_phone_comment"]
  }
];

function runtimeEnabled(actionTypes: string[]) {
  const config = getFacebookAutomationConfig();
  return actionTypes.some((actionType) => {
    if (actionType === "auto_reply_message") return config.messageReplyEnabled;
    if (actionType === "auto_reply_comment") return config.commentReplyEnabled;
    if (actionType === "auto_hide_phone_comment") return config.phoneHideEnabled;
    return false;
  });
}

function mapRule(row: RuleRow): AutomationRuleView {
  const actionTypes = row.action_types?.split(",").filter(Boolean) ?? [];
  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type,
    active: Boolean(row.active),
    actionTypes,
    runtimeEnabled: runtimeEnabled(actionTypes),
    createdAt: row.created_at
  };
}

export async function listAutomationRules() {
  const db = await getD1Database();
  if (!db) {
    return defaultRules.map((rule) => ({
      ...rule,
      active: false,
      runtimeEnabled: runtimeEnabled(rule.actionTypes),
      createdAt: new Date(0).toISOString()
    }));
  }

  // NEO: Automation UI đọc rule/action thật từ D1, không dựng danh sách demo.
  const rows = await db
    .prepare(
      `select
        r.id,
        r.name,
        r.trigger_type,
        r.active,
        r.created_at,
        group_concat(a.action_type) as action_types
       from automation_rules r
       left join automation_actions a on a.rule_id = r.id
       where r.workspace_id = ?
       group by r.id
       order by r.created_at asc`
    )
    .bind(DEFAULT_WORKSPACE_ID)
    .all<RuleRow>();

  return (rows.results ?? []).map(mapRule);
}

export async function listAutomationActions(limit = 50) {
  const db = await getD1Database();
  if (!db) return [] as AutomationActionView[];

  const rows = await db
    .prepare(
      `select id, page_id, event_id, action_type, target_id, status, error, created_at, updated_at
       from facebook_automation_actions
       order by updated_at desc
       limit ?`
    )
    .bind(limit)
    .all<ActionRow>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    pageId: row.page_id,
    eventId: row.event_id,
    actionType: row.action_type,
    targetId: row.target_id,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
