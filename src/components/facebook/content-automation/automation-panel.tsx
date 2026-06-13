"use client";

import { Bot, CalendarClock, CheckCircle2, LoaderCircle, ShieldCheck, Target } from "lucide-react";
import { useState } from "react";
import type { FacebookPage, PublishSettings } from "../content-planner-types";

type AutomationRunResult = {
  date: string;
  created: Array<unknown>;
  held: Array<unknown>;
};

type ContentAutomationPanelProps = {
  pages: FacebookPage[];
  selectedPageIds: string[];
  settings: PublishSettings;
  onFinished: (message: string) => Promise<void> | void;
};

const dailySlots = [
  { time: "08:10", purpose: "Nỗi đau và giải pháp" },
  { time: "09:00", purpose: "Giới thiệu sản phẩm" },
  { time: "19:45", purpose: "Bài bán hàng chính" },
  { time: "20:30", purpose: "So sánh và tư vấn chọn" }
];

const roadmap = [
  { week: "Tuần 1", title: "Tạo thói quen xem", detail: "Đăng đều bài giải quyết vấn đề và giới thiệu sản phẩm thật." },
  { week: "Tuần 2", title: "Tăng tin tưởng", detail: "Dùng bài so sánh, hướng dẫn chọn và ảnh sản phẩm rõ ràng." },
  { week: "Tuần 3", title: "Kéo tương tác", detail: "Đặt câu hỏi ngắn, mời khách nhắn tin và trả lời nhu cầu cụ thể." },
  { week: "Tuần 4", title: "Tối ưu bán hàng", detail: "Giữ chủ đề hiệu quả, giảm nội dung ít phản hồi và tăng CTA rõ." }
];

export function ContentAutomationPanel({ pages, selectedPageIds, settings, onFinished }: ContentAutomationPanelProps) {
  const [running, setRunning] = useState(false);
  const live = settings.autoPublishEnabled;
  const ready = Boolean(settings.automationConfigured && settings.operatorRunEnabled);
  const selectedPages = pages.filter((page) => selectedPageIds.includes(page.id));
  const targetPageIds = selectedPages.map((page) => page.id);
  const targetPageLabel = selectedPages.length === 1 ? selectedPages[0]?.name : `${selectedPages.length} Fanpage đã chọn`;

  async function runToday() {
    if (targetPageIds.length === 0) {
      await onFinished("Chọn ít nhất một Fanpage trước khi tự động lên lịch.");
      return;
    }
    const message = live
      ? `AI sẽ tạo nội dung, xếp tạo ảnh và lên lịch 4 bài cho ${targetPageLabel}. Mỗi page sẽ nhận nội dung/SKU khác nhau để test hiệu quả. Tiếp tục?`
      : `AI sẽ tạo nội dung, xếp tạo ảnh và lên lịch 4 bài cho ${targetPageLabel} trong CRM. Chế độ đăng thật đang tắt nên chưa có bài nào được gửi lên Facebook. Tiếp tục?`;
    if (!window.confirm(message)) return;

    setRunning(true);
    try {
      const response = await fetch("/api/content/automation/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "CREATE_TODAY_SCHEDULE", pageIds: targetPageIds })
      });
      const payload = (await response.json()) as { success: boolean; data?: AutomationRunResult; error?: string };
      if (!response.ok || !payload.success || !payload.data) {
        await onFinished(payload.error || "Không tạo được lịch tự động.");
        return;
      }
      await onFinished(
        `Đã tạo ${payload.data.created.length} bài cho hôm nay. ${payload.data.held.length} vị trí được giữ lại để kiểm tra.`
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-stone-950">
            <Bot className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Tự động đăng bài
          </div>
          <p className="mt-1 text-xs leading-5 text-stone-500">Mỗi ngày AI chuẩn bị 4 bài cho đúng Fanpage bạn đang chọn.</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {live ? "Đang đăng thật" : "Chỉ tạo lịch trong CRM"}
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Chỉ đăng khi ảnh đã sẵn sàng
        </div>
        <div className="mt-2 rounded-xl bg-white px-2.5 py-2 text-xs leading-5 text-stone-600">
          Fanpage áp dụng: <span className="font-semibold text-stone-900">{targetPageIds.length ? targetPageLabel : "Chưa chọn Fanpage"}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {dailySlots.map((slot) => (
            <div key={slot.time} className="rounded-xl bg-white px-2.5 py-2">
              <div className="text-sm font-bold tabular-nums text-stone-900">{slot.time}</div>
              <div className="mt-0.5 text-[11px] leading-4 text-stone-500">{slot.purpose}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void runToday()}
        disabled={!ready || running || targetPageIds.length === 0}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {running ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarClock className="h-4 w-4" aria-hidden="true" />}
        {running ? "Đang tạo nội dung và lịch..." : "Tự động lên lịch 4 bài hôm nay"}
      </button>

      {!ready ? (
        <p className="mt-2 text-xs leading-5 text-amber-700">
          Hệ thống tự động chưa đủ cấu hình vận hành. Nút sẽ mở khi lịch nền và quyền thao tác đã sẵn sàng.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-stone-500">
          {live
            ? "Bài sẽ tự đăng đúng giờ sau khi ảnh hoàn tất."
            : "Bài được tạo và xếp lịch, nhưng chưa gửi lên Facebook cho đến khi bật chế độ đăng thật."}
        </p>
      )}
    </section>
  );
}

export function GrowthRoadmap({ title }: { title: string }) {
  return (
    <section className="rounded-[24px] border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-violet-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-stone-950">{title}</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500">Lộ trình giúp tăng cơ hội tiếp cận; không cam kết lượt xem giả.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {roadmap.map((item) => (
          <article key={item.week} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{item.week}</span>
            </div>
            <div className="mt-1 text-sm font-bold text-stone-900">{item.title}</div>
            <p className="mt-1 text-xs leading-5 text-stone-600">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
