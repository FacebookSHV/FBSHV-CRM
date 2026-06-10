import { Clock3, ShoppingBag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { LandingRealProof } from "@/lib/landing-pages/real-proof";

function countText(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function useCountdown(endsAt: string | null) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const remaining = Date.parse(endsAt) - Date.now();
      if (remaining <= 0) {
        setLabel("");
        return;
      }
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  return label;
}

export function LandingProofBadges({ proof }: { proof: LandingRealProof }) {
  const countdown = useCountdown(proof.campaignEndsAt);
  if (proof.soldCount === null && proof.rating === null && !countdown) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {proof.soldCount !== null ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 ring-1 ring-orange-100">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Đã bán {countText(proof.soldCount)}
        </span>
      ) : null}
      {proof.rating !== null ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 ring-1 ring-amber-100">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
          {proof.rating.toFixed(1)}{proof.reviewCount !== null ? ` · ${countText(proof.reviewCount)} đánh giá` : ""}
        </span>
      ) : null}
      {countdown ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black tabular-nums text-rose-700 ring-1 ring-rose-100">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          Kết thúc sau {countdown}
        </span>
      ) : null}
    </div>
  );
}

export function LandingTestimonials({ proof }: { proof: LandingRealProof }) {
  if (!proof.testimonials.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-slate-950">Khách đã mua đánh giá</h2>
        <p className="mt-1 text-sm text-slate-600">Nội dung lấy từ dữ liệu đánh giá thật của sản phẩm.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {proof.testimonials.slice(0, 3).map((item, index) => (
          <article key={`${item.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {item.rating !== null ? (
              <div className="text-sm font-black text-amber-500">{"★".repeat(Math.max(1, Math.min(5, Math.round(item.rating))))}</div>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-slate-700">“{item.text}”</p>
            <div className="mt-3 text-xs font-bold text-slate-500">{item.name}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
