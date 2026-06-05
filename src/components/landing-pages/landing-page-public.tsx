"use client";

import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Wrench
} from "lucide-react";
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

function discountText(page: LandingPage) {
  const product = page.product;
  const current = Number(product?.currentPrice || product?.salePrice || 0);
  const original = Number(product?.originalPrice || 0);
  if (!current || !original || original <= current) return "Giá tốt hôm nay";
  return `Tiết kiệm ${Math.round(((original - current) / original) * 100)}%`;
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [status, setStatus] = useState("Nhập số điện thoại để shop tư vấn và kiểm tồn.");
  const [submitting, setSubmitting] = useState(false);
  const product = page.product;
  const images = productImages(page);
  const heroImage = images[selectedImageIndex] ?? images[0] ?? "";
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
    <main className="min-h-screen bg-[#f4f6f8] pb-24 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700" aria-label="Mở menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-sm font-black uppercase tracking-wide text-brand-700">Shop Huy Vân</div>
            <div className="truncate text-xs font-semibold text-slate-500">Điện nước gia dụng chính hãng</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="#lead-form" className="hidden min-h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-black text-white sm:inline-flex">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Tư vấn ngay
            </a>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700" aria-label="Tìm kiếm">
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
            <a href="#lead-form" className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700" aria-label="Giỏ tư vấn">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-black text-white">1</span>
            </a>
          </div>
        </div>
        <div className="bg-brand-700 text-white">
          <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/25 px-2 py-2 text-center text-[11px] font-black leading-tight sm:text-sm">
            <div className="flex items-center justify-center gap-1 px-1">
              <Truck className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>Ship nhanh</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-1">
              <ShieldCheck className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>Hàng chuẩn</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-1">
              <MessageCircle className="h-4 w-4 flex-none" aria-hidden="true" />
              <span>Tư vấn lắp đặt</span>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-4 lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-3 bg-[radial-gradient(circle_at_88%_22%,#dbeafe_0,#ffffff_38%,#f8fafc_100%)] p-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-brand-700 shadow-sm ring-1 ring-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                {aiImageCount > 0 ? `${aiImageCount} ảnh AI` : "Ảnh thật"}
              </div>
              <h1 className="mt-3 break-words text-[25px] font-black leading-[1.08] text-slate-950">
                {page.hero.headline}
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                {page.hero.subheadline}
              </p>
            </div>
            <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-white/90">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={product?.name ?? page.title} className="h-full w-full object-contain" />
              ) : null}
            </div>
          </div>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
              {images.slice(0, 6).map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`h-14 w-14 flex-none overflow-hidden rounded-xl border bg-white ${selectedImageIndex === index ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-200"}`}
                  aria-label={`Xem ảnh ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
              <BadgePercent className="h-4 w-4" aria-hidden="true" />
              {discountText(page)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {stockText(page)}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-black leading-tight text-slate-950">
            {product?.name ?? page.title}
          </h2>
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-sky-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">Giá bán hôm nay</div>
            <div className="mt-1 text-3xl font-black tabular-nums text-rose-600">{price || "Nhắn shop kiểm giá"}</div>
            <div className="mt-2 text-xs font-bold text-slate-600">SKU {product?.sku ?? "đang cập nhật"}</div>
          </div>
          <div className="mt-4 grid gap-2">
            {page.hero.bullets.slice(0, 4).map((bullet) => (
              <div key={bullet} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a href="#lead-form" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-black text-white shadow-lg shadow-brand-900/15">
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {page.hero.primaryCta}
            </a>
            <a href="#lead-form" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-sm font-black text-white">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Tư vấn
            </a>
          </div>
        </article>

        <section id="proof" className="mt-4 grid grid-cols-3 gap-2">
          {page.sections.trustBadges.slice(0, 3).map((badge) => (
            <div key={badge} className="flex min-h-20 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-5 w-5 text-brand-600" aria-hidden="true" />
              <span className="text-[12px] font-black leading-snug text-slate-800">{badge}</span>
            </div>
          ))}
        </section>
      </section>

      <section className="mx-auto hidden max-w-6xl gap-4 px-4 py-4 lg:grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-start lg:py-8">
        <div className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid min-h-[420px] grid-cols-[minmax(0,1fr)_minmax(118px,42%)] items-center gap-2 overflow-hidden bg-[radial-gradient(circle_at_85%_25%,#dbeafe_0,#ffffff_34%,#f8fafc_100%)] p-4 sm:grid-cols-[0.9fr_1.1fr] sm:p-6">
              <div className="min-w-0 self-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black text-brand-700 shadow-sm ring-1 ring-slate-200">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {aiImageCount > 0 ? `${aiImageCount} ảnh AI` : "Ảnh Product Core"}
                </div>
                <h1 className="mt-4 break-words text-[26px] font-black leading-[1.06] text-slate-950 sm:text-5xl">
                  {page.hero.headline}
                </h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                  {page.hero.subheadline}
                </p>
                <div className="mt-4 hidden gap-2 sm:grid">
                  {page.hero.bullets.slice(0, 3).map((bullet) => (
                    <div key={bullet} className="flex items-start gap-2 text-sm font-bold text-slate-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative aspect-[4/5] min-w-0 max-w-full overflow-hidden rounded-2xl bg-white/80">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={product?.name ?? page.title} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">Chưa có ảnh sản phẩm</div>
              )}
                <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 px-3 py-2 text-right shadow-sm">
                  <div className="text-[11px] font-black uppercase text-slate-500">Giá từ</div>
                  <div className="text-lg font-black text-rose-600">{price || "Liên hệ"}</div>
                </div>
              </div>
            </div>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
                {images.slice(0, 8).map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-16 w-16 flex-none overflow-hidden rounded-xl border bg-white ${selectedImageIndex === index ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-200"}`}
                    aria-label={`Xem ảnh ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                <BadgePercent className="h-4 w-4" aria-hidden="true" />
                {discountText(page)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                {stockText(page)}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              {product?.name ?? page.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              Nhắn shop để kiểm đúng mẫu, tồn kho và phương án lắp đặt trước khi chốt đơn.
            </p>
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-sky-50 p-4">
              <div className="text-xs font-black uppercase text-slate-500">Giá bán hôm nay</div>
              <div className="mt-1 text-4xl font-black tabular-nums text-rose-600">{price || "Nhắn shop kiểm giá"}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span>SKU {product?.sku ?? "đang cập nhật"}</span>
                <span>•</span>
                <span>Dữ liệu lấy từ sản phẩm đã đồng bộ</span>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {page.hero.bullets.slice(0, 4).map((bullet) => (
                <div key={bullet} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a href="#lead-form" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-base font-black text-white shadow-lg shadow-rose-900/15">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {page.hero.primaryCta}
              </a>
              <a href="#proof" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-base font-black text-slate-950">
                {page.hero.secondaryCta || "Xem lý do nên mua"}
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </article>

          <section id="proof" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {page.sections.trustBadges.slice(0, 4).map((badge) => (
              <div key={badge} className="flex min-h-20 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <span className="text-sm font-black leading-snug text-slate-800">{badge}</span>
              </div>
            ))}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Truck className="h-5 w-5 text-sky-600" aria-hidden="true" />
              <div className="mt-2 text-sm font-black">Giao nhanh</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Shop xác nhận tồn và tư vấn phương án nhận hàng phù hợp.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              <div className="mt-2 text-sm font-black">Đúng mẫu</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Dựa trên SKU và ảnh sản phẩm thật đã đồng bộ trong CRM.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <MessageCircle className="h-5 w-5 text-rose-600" aria-hidden="true" />
              <div className="mt-2 text-sm font-black">Tư vấn lắp đặt</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">Nhắn nhu cầu để shop kiểm mẫu, số lượng và khu vực giao.</p>
            </div>
          </section>
        </div>
      </section>

      {page.sections.benefits.length ? (
        <section className="mx-auto max-w-6xl px-4 py-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Vì sao nên chọn sản phẩm này?</h2>
              <p className="mt-1 text-sm text-slate-600">Lợi ích được viết từ thông tin sản phẩm thật và prompt AI.</p>
            </div>
            <span className="hidden rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white sm:inline-flex">
              Copy AI
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {page.sections.benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <Star className="h-6 w-6 text-amber-500" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-black text-slate-950">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {images.length > 1 ? (
        <section className="mx-auto max-w-6xl px-4 py-5">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-slate-950">Ảnh để xem trước khi mua</h2>
            <p className="mt-1 text-sm text-slate-600">Ảnh AI 4:5 dùng cho quảng cáo và ảnh nguồn thật nằm chung một gallery.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {images.slice(0, 4).map((image, index) => (
              <figure key={image} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[4/5] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`${product?.name ?? page.title} ${index + 1}`} className="h-full w-full object-contain" />
                </div>
                <figcaption className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600">
                  <ImageIcon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                  Ảnh {index + 1}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {page.sections.steps.length ? (
        <section className="mx-auto max-w-6xl px-4 py-5">
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
