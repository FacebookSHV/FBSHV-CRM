import { getD1Database } from "@/lib/db";
import { DEFAULT_WORKSPACE_ID } from "@/lib/facebook/types";

export type CrmCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  facebookId?: string | null;
  note?: string | null;
  conversationCount: number;
  commentCount: number;
  orderCount: number;
  lastInteractionAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  facebook_id: string | null;
  note: string | null;
  conversation_count: number;
  comment_count: number;
  order_count: number;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string | null;
};

function mapCustomer(row: CustomerRow): CrmCustomer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    facebookId: row.facebook_id,
    note: row.note,
    conversationCount: Number(row.conversation_count || 0),
    commentCount: Number(row.comment_count || 0),
    orderCount: Number(row.order_count || 0),
    lastInteractionAt: row.last_interaction_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listCrmCustomers(limit = 100) {
  const db = await getD1Database();
  if (!db) {
    return {
      source: "empty_no_d1" as const,
      customers: [] as CrmCustomer[],
      emptyMessage: "Chưa có khách hàng thật. Khách sẽ được tạo khi có inbox/comment/order."
    };
  }

  // NEO: CRM chỉ đọc khách thật sinh ra từ inbox/comment/order, không dùng danh sách demo.
  const rows = await db
    .prepare(
      `select
        c.id,
        c.name,
        c.phone,
        c.facebook_id,
        c.note,
        c.created_at,
        c.updated_at,
        (select count(*) from conversations cv where cv.customer_id = c.id) as conversation_count,
        (select count(*) from comments cm where cm.customer_id = c.id) as comment_count,
        (select count(*) from orders o where o.customer_id = c.id) as order_count,
        max(
          coalesce((select max(cv.last_message_at) from conversations cv where cv.customer_id = c.id), ''),
          coalesce((select max(cm.created_at) from comments cm where cm.customer_id = c.id), ''),
          coalesce((select max(o.created_at) from orders o where o.customer_id = c.id), ''),
          coalesce(c.updated_at, c.created_at)
        ) as last_interaction_at
       from customers c
       where c.workspace_id = ?
       order by coalesce(last_interaction_at, c.updated_at, c.created_at) desc
       limit ?`
    )
    .bind(DEFAULT_WORKSPACE_ID, limit)
    .all<CustomerRow>();

  const customers = (rows.results ?? []).map(mapCustomer);
  return {
    source: "d1_real" as const,
    customers,
    emptyMessage: "Chưa có khách hàng thật. Khách sẽ được tạo khi có inbox/comment/order."
  };
}
