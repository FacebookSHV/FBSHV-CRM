"use client";

import { useEffect, useMemo, useState } from "react";
import { LandingCommerceTop } from "@/components/landing-pages/public/landing-page-commerce-top";
import { LandingPublicSections } from "@/components/landing-pages/public/landing-page-public-sections";
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
  const stockLabel = stockText(page);
  const discountLabel = discountText(page);
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
      <LandingCommerceTop
        aiImageCount={aiImageCount}
        discountLabel={discountLabel}
        heroImage={heroImage}
        images={images}
        page={page}
        price={price}
        product={product}
        selectedImageIndex={selectedImageIndex}
        setSelectedImageIndex={setSelectedImageIndex}
        stockLabel={stockLabel}
      />
      <LandingPublicSections
        images={images}
        leadName={leadName}
        leadNote={leadNote}
        leadPhone={leadPhone}
        page={page}
        price={price}
        product={product}
        setLeadName={setLeadName}
        setLeadNote={setLeadNote}
        setLeadPhone={setLeadPhone}
        status={status}
        submitLead={submitLead}
        submitting={submitting}
      />
    </main>
  );
}
