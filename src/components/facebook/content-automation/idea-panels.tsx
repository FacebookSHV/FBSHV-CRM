"use client";

import { FilePlus2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { ContentIdea, Suggestion } from "../content-planner-types";

type ContentIdeaPanelsProps = {
  suggestions: Suggestion[];
  ideas: ContentIdea[];
  onSaveIdea: (idea: ContentIdea) => void;
};

export function ContentIdeaPanels({ suggestions, ideas, onSaveIdea }: ContentIdeaPanelsProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-[24px] border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900">Gợi ý lịch & chủ đề</h2>
          <StatusPill tone="neutral">{suggestions.length}</StatusPill>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {suggestions.slice(0, 4).map((item) => (
            <div key={`${item.date}-${item.suggestedTemplate}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="text-sm font-semibold text-stone-900">{new Date(item.date).toLocaleDateString("vi-VN")}</div>
              <div className="mt-1 text-sm text-stone-600">{item.theme}</div>
              <div className="mt-2">
                <StatusPill tone="neutral">{item.suggestedTemplate}</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-900">Gợi ý nội dung mới</h2>
          <StatusPill tone="info">{ideas.length}</StatusPill>
        </div>
        <div className="mt-3 grid gap-2">
          {ideas.slice(0, 2).map((idea) => (
            <article key={idea.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="info">{idea.template}</StatusPill>
                <StatusPill tone={idea.aiMode === "ai" ? "success" : "warning"}>
                  {idea.aiMode === "ai" ? "AI thật" : "Mẫu an toàn"}
                </StatusPill>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-stone-900">{idea.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-stone-600">{idea.caption}</p>
              <button
                type="button"
                onClick={() => onSaveIdea(idea)}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700"
              >
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Lưu thành nháp
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
