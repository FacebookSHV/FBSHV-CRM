"use client";

import { EyeOff, MessageCircleReply, PackageCheck, RefreshCcw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/pages/page-header";
import { ProductSearchPicker } from "@/components/products/product-search-picker";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProductWithInventory } from "@/lib/ecommerce/types";

type Conversation = {
  id: string;
  customerId?: string | null;
  pageId: string;
  priority: "low" | "normal" | "high";
  unreadCount: number;
  lastMessagePreview?: string | null;
  lastMessageAt: string;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  deliveryStatus: string;
  createdAt: string;
};

type Comment = {
  id: string;
  externalCommentId: string;
  fromName?: string | null;
  body: string;
  hidden: boolean;
  replied: boolean;
  createdAt: string;
};

function priorityTone(priority: Conversation["priority"]) {
  if (priority === "high") return "danger";
  if (priority === "low") return "neutral";
  return "info";
}

export function InboxContent() {
  const [mode, setMode] = useState<"mock" | "real">("mock");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState("Dạ shop còn hàng, mình cho shop xin số điện thoại để hỗ trợ chốt đơn nhé.");
  const [commentReply, setCommentReply] = useState("Dạ shop còn hàng, mình nhắn shop để được tư vấn nhanh nhé.");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadConversations(nextSelectedId?: string | null) {
    setLoading(true);
    const response = await fetch("/api/inbox/conversations", { cache: "no-store" });
    const payload = (await response.json()) as {
      success: boolean;
      data?: { mode: "mock" | "real"; conversations: Conversation[] };
    };
    if (payload.success && payload.data) {
      setMode(payload.data.mode);
      setConversations(payload.data.conversations);
      const target = nextSelectedId ?? selectedId ?? payload.data.conversations[0]?.id ?? null;
      setSelectedId(target);
      if (target) await loadMessages(target);
    }
    setLoading(false);
  }

  async function loadMessages(conversationId: string) {
    const response = await fetch(`/api/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as { success: boolean; data?: { messages: Message[] } };
    if (payload.success && payload.data) setMessages(payload.data.messages);
  }

  async function loadComments() {
    const response = await fetch("/api/comments", { cache: "no-store" });
    const payload = (await response.json()) as { success: boolean; data?: { comments: Comment[] } };
    if (payload.success && payload.data) setComments(payload.data.comments);
  }

  async function sendReply() {
    if (!selectedId) return;
    const response = await fetch("/api/facebook/messages/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: selectedId, message: reply })
    });
    const payload = (await response.json()) as { success: boolean; error?: string; data?: { mock?: boolean } };
    setStatus(payload.success ? `Đã gửi tin nhắn ${payload.data?.mock ? "mock" : "real"}.` : payload.error || "Gửi lỗi.");
    await loadConversations(selectedId);
  }

  async function createOrder() {
    if (!selectedId) return;
    if (!selectedProduct?.sku) {
      setStatus("Cần chọn sản phẩm thật đã đồng bộ trước khi tạo đơn.");
      return;
    }
    const response = await fetch("/api/ecommerce/orders/from-facebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: `customer_${selectedId}`,
        conversationId: selectedId,
        sku: selectedProduct.sku,
        quantity,
        note: "Đơn tạo từ inbox Facebook CRM"
      })
    });
    const payload = (await response.json()) as { success: boolean; error?: string; data?: { externalOrderId?: string } };
    setStatus(payload.success ? `Đã tạo đơn ${payload.data?.externalOrderId ?? ""}` : payload.error || "Tạo đơn lỗi.");
  }

  async function replyToComment(commentId: string) {
    const response = await fetch("/api/facebook/comments/reply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commentId, message: commentReply })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã trả lời bình luận." : payload.error || "Trả lời bình luận lỗi.");
    await loadComments();
  }

  async function hideComment(commentId: string, hidden: boolean) {
    const response = await fetch("/api/facebook/comments/hide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commentId, hidden })
    });
    const payload = (await response.json()) as { success: boolean; error?: string };
    setStatus(payload.success ? "Đã cập nhật trạng thái bình luận." : payload.error || "Ẩn bình luận lỗi.");
    await loadComments();
  }

  useEffect(() => {
    void loadConversations();
    void loadComments();
    // NEO: Màn hình inbox chỉ cần tải dữ liệu ban đầu một lần khi mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = conversations.find((conversation) => conversation.id === selectedId);

  return (
    <div>
      <PageHeader
        title="Trung tâm CSKH Facebook"
        subtitle="Xử lý inbox, bình luận, tư vấn sản phẩm thật và tạo đơn từ hội thoại."
        action={
          <button
            type="button"
            onClick={() => {
              void loadConversations();
              void loadComments();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 focus-ring"
            aria-label="Tải lại"
            title="Tải lại"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-soft">
        <StatusPill tone={mode === "mock" ? "warning" : "success"}>{mode === "mock" ? "Facebook chưa kết nối thật" : "Facebook real"}</StatusPill>
        <StatusPill tone="info">Chốt đơn qua Web TMĐT</StatusPill>
        {status ? <span className="text-sm text-slate-600">{status}</span> : null}
      </div>

      <section className="mb-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{conversations.length}</div>
          <div className="text-sm text-slate-600">hội thoại</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{conversations.reduce((sum, item) => sum + item.unreadCount, 0)}</div>
          <div className="text-sm text-slate-600">tin chưa đọc</div>
        </article>
        <article className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
          <div className="text-2xl font-semibold tabular-nums text-ink">{comments.filter((comment) => !comment.replied).length}</div>
          <div className="text-sm text-slate-600">bình luận cần trả lời</div>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Hội thoại</h2>
          </div>
          {loading ? <div className="p-4 text-sm text-slate-500">Đang tải...</div> : null}
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => {
                  setSelectedId(conversation.id);
                  void loadMessages(conversation.id);
                }}
                className={[
                  "block w-full p-4 text-left focus-ring",
                  selectedId === conversation.id ? "bg-brand-50" : "bg-white hover:bg-slate-50"
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{conversation.customerId || conversation.id}</span>
                  <StatusPill tone={priorityTone(conversation.priority)}>{conversation.priority === "high" ? "Ưu tiên cao" : conversation.priority === "low" ? "Theo dõi" : "Bình thường"}</StatusPill>
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-slate-600">{conversation.lastMessagePreview}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {new Date(conversation.lastMessageAt).toLocaleString("vi-VN")} · Chưa đọc {conversation.unreadCount}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{selected ? selected.id : "Chưa chọn hội thoại"}</h2>
          </div>
          <div className="space-y-3 p-4">
            <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-md bg-slate-50 p-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={[
                    "max-w-[88%] rounded-md px-3 py-2 text-sm",
                    message.direction === "outbound"
                      ? "ml-auto bg-brand-600 text-white"
                      : "bg-white text-ink ring-1 ring-slate-200"
                  ].join(" ")}
                >
                  <div>{message.body}</div>
                  <div className="mt-1 text-[11px] opacity-70">{message.deliveryStatus}</div>
                </div>
              ))}
            </div>

            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void sendReply()}
                disabled={!selectedId}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-3 text-sm font-semibold text-white focus-ring disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Gửi trả lời
              </button>
              <div className="grid flex-1 gap-2 lg:grid-cols-[1fr_80px_auto]">
                <ProductSearchPicker label="Sản phẩm chốt đơn" selectedSku={selectedProduct?.sku} onSelect={setSelectedProduct} />
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="min-h-10 rounded-md border border-slate-200 px-3 text-sm focus-ring"
                  aria-label="Số lượng"
                />
                <button
                  type="button"
                  onClick={() => void createOrder()}
                  disabled={!selectedId}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 focus-ring disabled:opacity-50"
                  aria-label="Chốt đơn"
                  title="Chốt đơn"
                >
                  <PackageCheck className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Bình luận cần xử lý</h2>
        </div>
        <div className="space-y-3 p-4">
          <textarea
            value={commentReply}
            onChange={(event) => setCommentReply(event.target.value)}
            className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-ring"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{comment.fromName || "Facebook user"}</span>
                  <StatusPill tone={comment.hidden ? "warning" : "neutral"}>{comment.hidden ? "Đã ẩn" : "Đang hiện"}</StatusPill>
                  <StatusPill tone={comment.replied ? "success" : "warning"}>{comment.replied ? "Đã trả lời" : "Chưa trả lời"}</StatusPill>
                </div>
                <p className="mt-2 text-sm text-slate-600">{comment.body}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void replyToComment(comment.id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-200 text-brand-700 focus-ring"
                    aria-label="Trả lời bình luận"
                    title="Trả lời bình luận"
                  >
                    <MessageCircleReply className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void hideComment(comment.id, !comment.hidden)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 focus-ring"
                    aria-label={comment.hidden ? "Bỏ ẩn bình luận" : "Ẩn bình luận"}
                    title={comment.hidden ? "Bỏ ẩn bình luận" : "Ẩn bình luận"}
                  >
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
