"use client";

import { ArrowDown, CheckCircle2, MessageCircle, Phone, Send, ShieldCheck, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LandingPage } from "@/lib/landing-pages/types";
import { formatMoney } from "@/lib/money";

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };
type PixelConfig = { configured: boolean; pixelId: string | null };
type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};
type FbqWindow = Window & {
  fbq?: FbqFn;
  _fbq?: unknown;
};

function getVisitorId() {
  const key = "fbshv_lp_visitor";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

function productPrice(page: LandingPage) {
  const product = page.product;
  if (!product) return "";
  return formatMoney(product.currentPrice || product.salePrice || product.originalPrice, product.currency);
}

function loadMetaPixel(pixelId: string) {
  const win = window as FbqWindow;
  if (win.fbq?.loaded) {
    win.fbq("init", pixelId);
    return true;
  }
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }
    fbq.queue?.push(args);
  }) as FbqFn;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  win.fbq = fbq;
  win._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", pixelId);
  return true;
}

function firePixelEvent(eventName: string, eventId: string, customData: Record<string, unknown>) {
  const fbq = (window as FbqWindow).fbq;
  if (!fbq?.loaded) return;
  fbq("track", eventName, customData, { eventID: eventId });
}

export function LandingPagePublic({ page }: { page: LandingPage }) {
  const [visitorId, setVisitorId] = useState("");
  const [pixelReady, setPixelReady] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadNote, setLeadNote] = useState("");
  const [status, setStatus] = useState("Nhập số điện thoại để shop tư vấn và kiểm tồn.");
  const [submitting, setSubmitting] = useState(false);
  const product = page.product;
  const price = productPrice(page);
  const contentIds = useMemo(() => (product?.sku ? [product.sku] : []), [product?.sku]);

  async function track(eventName: "PageView" | "ViewContent" | "Lead" | "Contact", extra: Record<string, unknown> = {}) {
    const eventId = `${page.id}:${page.variant?.id ?? "A"}:${eventName}:${crypto.randomUUID()}`;
    const sourceUrl = window.location.href;
    const customData = {
      value: product?.currentPrice,
      currency: product?.currency,
      content_name: product?.name ?? page.title,
      content_ids: contentIds
    };
    if (pixelReady) firePixelEvent(eventName, eventId, customData);
    const response = await fetch("/api/landing-pages/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        landingPageId: page.id,
        variantId: page.variant?.id,
        eventName,
        eventId,
        visitorId,
        sourceUrl,
        value: product?.currentPrice,
        currency: product?.currency,
        contentName: product?.name ?? page.title,
        contentIds,
        ...extra
      })
    });
    return (await response.json().catch(() => null)) as ApiEnvelope<{ capiStatus: string; capiError?: string | null }> | null;
  }

  useEffect(() => {
    setVisitorId(getVisitorId());
    void fetch("/api/meta/pixel-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((raw) => {
        const payload = raw as ApiEnvelope<PixelConfig>;
        if (payload.success && payload.data.configured && payload.data.pixelId) {
          setPixelReady(loadMetaPixel(payload.data.pixelId));
        }
      })
      .catch(() => setPixelReady(false));
  }, []);

  useEffect(() => {
    if (!visitorId) return;
    void track("PageView");
    void track("ViewContent");
    // NEO: Landing page public dùng cùng event_id cho Pixel/CAPI để Meta dedup đúng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorId, pixelReady]);

  async function submitLead() {
    if (!leadPhone.trim()) {
      setStatus("Cần nhập số điện thoại để shop gọi lại.");
      return;
    }
    setSubmitting(true);
    const leadPayload = await track("Lead", {
      phone: leadPhone.trim(),
      name: leadName.trim() || undefined
    });
    await track("Contact", {
      phone: leadPhone.trim(),
      name: leadName.trim() || undefined
    });
    setStatus(
      leadPayload?.success
        ? leadPayload.data.capiStatus === "sent"
          ? "Đã gửi thông tin, Pixel/CAPI đã ghi nhận lead."
          : "Đã lưu lead, CAPI cần kiểm tra lại cấu hình nếu chưa gửi được."
        : "Đã nhận thông tin, shop sẽ kiểm tra lại lead trong CRM."
    );
    setLeadNote("");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#f7fafc] pb-28 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-sm font-black uppercase text-brand-700">Shop Huy Vân</div>
            <div className="text-xs text-slate-500">Tư vấn sản phẩm gia dụng</div>
          </div>
          <a href="#lead-form" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-bold text-white">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Nhắn tư vấn
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-10">
        <div>
          <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            Dữ liệu sản phẩm đã đồng bộ
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
            {page.hero.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {page.hero.subheadline}
          </p>
          <div className="mt-5 grid gap-2">
            {page.hero.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="#lead-form" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-black text-white shadow-soft">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {page.hero.primaryCta}
            </a>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-base font-black text-slate-800">
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
              {page.hero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="aspect-[4/3] bg-slate-100">
            {product?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-100 p-8 text-center text-lg font-bold text-slate-500">
                Ảnh sản phẩm sẽ lấy từ Web Quản Lý TMĐT sau khi đồng bộ
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="text-sm font-bold text-slate-500">SKU {product?.sku ?? page.productSku}</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{product?.name ?? page.title}</div>
            {price ? <div className="mt-3 text-3xl font-black tabular-nums text-rose-600">{price}</div> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {page.sections.trustBadges.map((badge) => (
                <span key={badge} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {page.sections.benefits.length ? (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            {page.sections.benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-brand-600" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-black text-slate-950">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page.sections.steps.length ? (
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-2xl bg-[#08111f] p-5 text-white md:p-8">
            <h2 className="text-2xl font-black">Cách mua nhanh</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {page.sections.steps.map((step, index) => (
                <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">{index + 1}</div>
                  <h3 className="mt-4 font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="lead-form" className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Để shop kiểm đúng mẫu cho bạn</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{page.sections.offerNote}</p>
          <div className="mt-4 grid gap-3">
            <input value={leadName} onChange={(event) => setLeadName(event.target.value)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Tên của bạn" />
            <input value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Số điện thoại" inputMode="tel" />
            <textarea value={leadNote} onChange={(event) => setLeadNote(event.target.value)} className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Nhu cầu sử dụng, số lượng, khu vực nhận hàng" />
            <button type="button" onClick={() => void submitLead()} disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-base font-black text-white disabled:opacity-60">
              <Send className="h-5 w-5" aria-hidden="true" />
              {submitting ? "Đang gửi..." : "Gửi cho shop tư vấn"}
            </button>
            <div className="text-sm text-slate-600">{status}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Câu hỏi thường gặp</h2>
          <div className="mt-4 grid gap-3">
            {page.sections.faq.map((item) => (
              <details key={item.question} className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-black text-slate-950">{item.question}</summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-slate-950">{product?.name ?? page.title}</div>
            <div className="text-sm font-black tabular-nums text-rose-600">{price || "Nhắn shop kiểm giá"}</div>
          </div>
          <a href="#lead-form" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-black text-white">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Tư vấn
          </a>
        </div>
      </div>
    </main>
  );
}
