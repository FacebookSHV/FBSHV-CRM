"use client";

import { CheckCircle2, Image as ImageIcon, MessageCircle, Phone, Send, ShieldCheck, ShoppingCart, Sparkles, Star, Wrench } from "lucide-react";
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

function productImages(page: LandingPage) {
  const product = page.product;
  const sourceImages = [
    ...page.creativeImages,
    ...(product?.images ?? []),
    product?.imageUrl
  ].filter((value): value is string => Boolean(value));
  return [...new Set(sourceImages)].slice(0, 8);
}

function stockText(page: LandingPage) {
  const stock = Number(page.product?.availableStock ?? page.product?.stock ?? 0);
  if (stock <= 0) return "Nhắn shop kiểm tồn";
  if (stock <= 5) return `Còn ${stock} sản phẩm`;
  return `Còn sẵn ${stock}`;
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
  const images = productImages(page);
  const heroImage = images[0] ?? "";
  const price = productPrice(page);
  const contentIds = useMemo(() => (product?.sku ? [product.sku] : []), [product?.sku]);
  const aiImageCount = page.creativeImages.length;

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
      name: leadName.trim() || undefined,
      note: leadNote.trim() || undefined
    });
    await track("Contact", {
      phone: leadPhone.trim(),
      name: leadName.trim() || undefined,
      note: leadNote.trim() || undefined
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
    <main className="min-h-screen bg-[#f5f7fb] pb-28 text-slate-950">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/15 bg-slate-950/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-sm font-black uppercase tracking-wide">Shop Huy Vân</div>
            <div className="text-xs text-white/70">Gia dụng điện nước chính hãng</div>
          </div>
          <a href="#lead-form" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-slate-950">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Tư vấn ngay
          </a>
        </div>
      </header>

      <section className="relative isolate min-h-[92svh] overflow-hidden bg-slate-950 pt-16 text-white">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt={product?.name ?? page.title} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,0.92),rgba(2,6,23,0.62),rgba(2,6,23,0.18))]" />
        <div className="mx-auto grid min-h-[calc(92svh-4rem)] max-w-6xl content-end gap-8 px-4 pb-8 pt-10 md:grid-cols-[1fr_360px] md:items-end md:pb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black ring-1 ring-white/20">
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" />
              {aiImageCount > 0 ? `${aiImageCount} ảnh AI từ sản phẩm thật` : "Sẵn sàng tạo ảnh AI 4:5"}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] text-white sm:text-5xl lg:text-6xl">
              {page.hero.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              {page.hero.subheadline}
            </p>
            <div className="mt-5 grid gap-2">
              {page.hero.bullets.slice(0, 4).map((bullet) => (
                <div key={bullet} className="flex items-start gap-2 text-sm font-bold text-white">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="#lead-form" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-base font-black text-white shadow-2xl shadow-rose-950/30">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {page.hero.primaryCta}
              </a>
              <a href="#proof" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/12 px-6 text-base font-black text-white backdrop-blur">
                Xem lý do nên mua
              </a>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl backdrop-blur md:mb-2">
            <div className="text-xs font-black uppercase text-slate-500">Ưu đãi hôm nay</div>
            <div className="mt-2 text-lg font-black leading-snug">{product?.name ?? page.title}</div>
            <div className="mt-3 flex items-end gap-2">
              <div className="text-3xl font-black tabular-nums text-rose-600">{price || "Nhắn shop kiểm giá"}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">{stockText(page)}</div>
              <div className="rounded-lg bg-sky-50 px-3 py-2 text-sky-700">Giao nhanh nội thành</div>
            </div>
            <a href="#lead-form" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
              Giữ giá và tư vấn lắp đặt
            </a>
          </aside>
        </div>
      </section>

      <section id="proof" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-4 md:grid-cols-4">
          {page.sections.trustBadges.slice(0, 4).map((badge) => (
            <div key={badge} className="flex min-h-14 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-black text-slate-800">
              <ShieldCheck className="h-5 w-5 flex-none text-brand-600" aria-hidden="true" />
              <span>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Ảnh sản phẩm dùng cho quảng cáo</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ưu tiên ảnh AI 4:5 đã render từ ImageFlow; nếu chưa render xong, trang dùng ảnh thật từ Product Core.
            </p>
          </div>
          <div className="hidden rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white sm:block">
            {aiImageCount > 0 ? "AI creative live" : "Đang chờ AI creative"}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.slice(0, 4).map((image, index) => (
            <figure key={image} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/5] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={`${product?.name ?? page.title} ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              <figcaption className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600">
                <ImageIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Ảnh {index + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {page.sections.benefits.length ? (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            {page.sections.benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Star className="h-6 w-6 text-amber-500" aria-hidden="true" />
                <h2 className="mt-3 text-lg font-black text-slate-950">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page.sections.steps.length ? (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="rounded-2xl bg-[#08111f] p-5 text-white md:p-8">
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-sky-300" aria-hidden="true" />
              <h2 className="text-2xl font-black">Mua nhanh, dùng đúng, đỡ phát sinh</h2>
            </div>
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

      <section id="lead-form" className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">Để shop kiểm đúng mẫu cho bạn</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{page.sections.offerNote}</p>
          <div className="mt-4 grid gap-3">
            <input value={leadName} onChange={(event) => setLeadName(event.target.value)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Tên của bạn" />
            <input value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Số điện thoại" inputMode="tel" />
            <textarea value={leadNote} onChange={(event) => setLeadNote(event.target.value)} className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500" placeholder="Nhu cầu sử dụng, số lượng, khu vực nhận hàng" />
            <button type="button" onClick={() => void submitLead()} disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-base font-black text-white disabled:opacity-60">
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
          <a href="#lead-form" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Tư vấn
          </a>
        </div>
      </div>
    </main>
  );
}
