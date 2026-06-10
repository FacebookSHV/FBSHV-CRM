import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Zap
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { LandingPage } from "@/lib/landing-pages/types";
import { readLandingRealProof } from "@/lib/landing-pages/real-proof";
import { getLandingTemplate } from "@/lib/landing-pages/template-catalog";
import { LandingProofBadges } from "./landing-conversion-proof";

type LandingProduct = LandingPage["product"];

type LandingCommerceTopProps = {
  aiImageCount: number;
  discountLabel: string;
  heroImage: string;
  images: string[];
  page: LandingPage;
  price: string;
  product: LandingProduct;
  selectedImageIndex: number;
  setSelectedImageIndex: Dispatch<SetStateAction<number>>;
  stockLabel: string;
};

function landingImageClass(image: string, creativeImages: string[]) {
  return creativeImages.includes(image)
    ? "h-full w-full object-cover"
    : "h-full w-full object-contain p-2";
}

function originalPriceText(product: LandingProduct) {
  const original = Number(product?.originalPrice || 0);
  const current = Number(product?.currentPrice || product?.salePrice || 0);
  if (!original || !current || original <= current) return "";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: product?.currency || "VND",
    maximumFractionDigits: 0
  }).format(original);
}

function interestText(page: LandingPage) {
  const leads = Number(page.metrics?.leads ?? 0);
  const contacts = Number(page.metrics?.contacts ?? 0);
  const views = Number(page.metrics?.views ?? 0);
  if (leads > 0) return `${leads} khách đã để lại thông tin`;
  if (contacts > 0) return `${contacts} lượt liên hệ`;
  if (views > 0) return `${views} lượt xem trang`;
  return "Đang ghi nhận lượt quan tâm";
}

function ProductThumbs({
  creativeImages,
  images,
  selectedImageIndex,
  setSelectedImageIndex,
  sizeClass,
  max = 8
}: {
  creativeImages: string[];
  images: string[];
  selectedImageIndex: number;
  setSelectedImageIndex: Dispatch<SetStateAction<number>>;
  sizeClass: string;
  max?: number;
}) {
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-white p-3 scrollbar-hide">
      {images.slice(0, max).map((image, index) => (
        <button
          key={image}
          type="button"
          onClick={() => setSelectedImageIndex(index)}
          className={`${sizeClass} flex-none overflow-hidden rounded-xl border-2 bg-white transition-all duration-150 ${
            selectedImageIndex === index
              ? "border-rose-500 shadow-md shadow-rose-100"
              : "border-slate-100 hover:border-slate-300"
          }`}
          aria-label={`Xem ảnh ${index + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className={landingImageClass(image, creativeImages)} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

function TrustBar() {
  return (
    <div className="border-b border-slate-100 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/20 px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1.5 px-2 py-0.5">
          <Truck className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="text-[11px] font-black sm:text-xs">Ship nhanh toàn quốc</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-2 py-0.5">
          <ShieldCheck className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="text-[11px] font-black sm:text-xs">Hàng chính hãng</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-2 py-0.5">
          <MessageCircle className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="text-[11px] font-black sm:text-xs">Tư vấn lắp đặt</span>
        </div>
      </div>
    </div>
  );
}

function PriceBadge({ discountLabel, originalPrice, price }: { discountLabel: string; originalPrice: string; price: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-orange-600 p-px shadow-lg shadow-rose-200">
      <div className="rounded-2xl bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-500">Ưu đãi hôm nay</div>
          <div className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600">{discountLabel}</div>
        </div>
        <div className="mt-1 text-3xl font-black tabular-nums text-rose-600 sm:text-4xl">
          {price || "Nhắn shop kiểm giá"}
        </div>
        {originalPrice ? <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-400 line-through">{originalPrice}</div> : null}
      </div>
    </div>
  );
}

export function LandingCommerceTop({
  aiImageCount,
  discountLabel,
  heroImage,
  images,
  page,
  price,
  product,
  selectedImageIndex,
  setSelectedImageIndex,
  stockLabel
}: LandingCommerceTopProps) {
  const originalPrice = originalPriceText(product);
  const interestLabel = interestText(page);
  const realProof = readLandingRealProof(product);
  const template = getLandingTemplate(page.templateId);
  return (
    <>
      {/* ─── Sticky Header ─── */}
      <header
        className="sticky top-0 z-30 border-b border-t-4 border-slate-200 bg-white/95 backdrop-blur-xl"
        style={{ borderTopColor: template.accent }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-sm">
              <Star className="h-4.5 w-4.5 text-white" aria-hidden="true" fill="white" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-slate-950">Shop Huy Vân</div>
              <div className="text-[10px] font-semibold text-slate-400">Điện nước gia dụng chính hãng</div>
            </div>
          </div>
          <a
            href="#lead-form"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-black text-white shadow-sm shadow-rose-200 transition hover:bg-rose-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Tư vấn ngay
          </a>
        </div>
        <TrustBar />
      </header>

      {/* ─── MOBILE HERO (< md) ─── */}
      <section className="w-full px-3 py-4 md:hidden">

        {/* Image card full-width */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-slate-50 via-white to-blue-50 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-brand-700 shadow-sm ring-1 ring-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                {aiImageCount > 0 ? `${aiImageCount} ảnh AI` : "Ảnh thật"}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-100">
                <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                {discountLabel}
              </div>
            </div>
            {/* 4:5 hero image – large, centred */}
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={product?.name ?? page.title}
                  className={landingImageClass(heroImage, page.creativeImages)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">Chưa có ảnh</div>
              )}
              {/* Floating price chip */}
              <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 shadow-md ring-1 ring-slate-100">
                <div className="text-[10px] font-black uppercase text-slate-400">Giá từ</div>
                <div className="text-base font-black tabular-nums text-rose-600">{price || "Liên hệ"}</div>
              </div>
            </div>
          </div>
          <ProductThumbs
            creativeImages={page.creativeImages}
            images={images}
            selectedImageIndex={selectedImageIndex}
            setSelectedImageIndex={setSelectedImageIndex}
            sizeClass="h-[68px] w-[54px]"
            max={6}
          />
        </div>

        {/* Copy + purchase card */}
        <article className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Headline – full column width so it wraps naturally */}
          <h1 className="text-[26px] font-black leading-[1.1] text-slate-950">
            {page.hero.headline}
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            {page.hero.subheadline}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {stockLabel}
            </span>
          </div>
          <div className="mt-3">
            <LandingProofBadges proof={realProof} />
          </div>

          <div className="mt-4">
            <PriceBadge discountLabel={discountLabel} originalPrice={originalPrice} price={price} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100">
              <Clock3 className="mb-1 h-4 w-4" aria-hidden="true" />
              Giữ giá khi nhắn shop hôm nay
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-800 ring-1 ring-sky-100">
              <Star className="mb-1 h-4 w-4" aria-hidden="true" />
              {interestLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {page.hero.bullets.slice(0, 4).map((bullet) => (
              <div key={bullet} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              href="#lead-form"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white shadow-lg shadow-rose-900/20 active:scale-[0.98]"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              {page.hero.primaryCta}
            </a>
            <a
              href="#lead-form"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-black text-slate-950 active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5 text-brand-600" aria-hidden="true" />
              Tư vấn
            </a>
          </div>
        </article>

        {/* Trust badges row */}
        <section id="proof" className="mt-3 grid grid-cols-3 gap-2">
          {page.sections.trustBadges.slice(0, 3).map((badge) => (
            <div key={badge} className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm">
              <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <span className="text-[11px] font-black leading-snug text-slate-800">{badge}</span>
            </div>
          ))}
        </section>
      </section>

      {/* ─── TABLET / DESKTOP HERO (≥ md) ─── */}
      <section className="mx-auto hidden w-full max-w-7xl gap-6 px-4 py-5 md:grid md:grid-cols-1 xl:grid-cols-[1fr_400px] xl:items-start xl:py-6">

        {/* Left: image + copy side by side */}
        <div className="xl:sticky xl:top-28">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 lg:p-5">
              {/* Headline ABOVE the two-column on md so it's never squeezed */}
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-black text-brand-700 shadow-sm ring-1 ring-slate-200">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {aiImageCount > 0 ? `${aiImageCount} ảnh AI 4:5` : "Ảnh Product Core"}
                </div>
                <h1 className="mt-3 max-w-4xl text-[34px] font-black leading-[1.08] text-slate-950 lg:text-[42px]">
                  {page.hero.headline}
                </h1>
                <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-500">
                  {page.hero.subheadline}
                </p>
              </div>

              {/* Image + bullets side by side */}
              <div className="grid items-start gap-5 md:grid-cols-[minmax(240px,280px)_1fr] lg:grid-cols-[300px_1fr]">
                {/* 4:5 image – large fixed frame */}
                <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl bg-white/80 shadow-md ring-1 ring-slate-100 lg:max-w-[300px]">
                  {heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroImage}
                      alt={product?.name ?? page.title}
                      className={landingImageClass(heroImage, page.creativeImages)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">Chưa có ảnh sản phẩm</div>
                  )}
                  <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 px-3 py-2 text-right shadow-md ring-1 ring-slate-100">
                    <div className="text-[10px] font-black uppercase text-slate-400">Giá từ</div>
                    <div className="text-lg font-black tabular-nums text-rose-600">{price || "Liên hệ"}</div>
                  </div>
                </div>

                {/* Bullets + badges */}
                <div className="flex flex-col justify-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                      <BadgePercent className="h-4 w-4" aria-hidden="true" />
                      {discountLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      <PackageCheck className="h-4 w-4" aria-hidden="true" />
                      {stockLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                      <Star className="h-4 w-4" aria-hidden="true" />
                      {interestLabel}
                    </span>
                  </div>
                  <LandingProofBadges proof={realProof} />

                  <div className="grid gap-2">
                    {page.hero.bullets.slice(0, 4).map((bullet) => (
                      <div key={bullet} className="flex items-start gap-2.5 text-sm font-semibold text-slate-800">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden="true" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    <a
                      href="#lead-form"
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-base font-black text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-700 active:scale-[0.98]"
                    >
                      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                      {page.hero.primaryCta}
                    </a>
                    <a
                      href="#proof"
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-base font-black text-slate-950 transition hover:bg-slate-50 active:scale-[0.98]"
                    >
                      {page.hero.secondaryCta || "Xem lý do nên mua"}
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-black text-amber-900">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      Ưu đãi chốt nhanh
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                      Nhắn shop kèm ảnh quạt/mạch cũ để giữ giá, kiểm đúng loại lắp được và tránh mua nhầm.
                    </p>
                  </div>

                  {/* Service micro-cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <Truck className="h-4 w-4 text-sky-500" aria-hidden="true" />
                      <div className="mt-1.5 text-xs font-black text-slate-900">Giao nhanh</div>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Xác nhận tồn trước khi ship</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      <div className="mt-1.5 text-xs font-black text-slate-900">Đúng mẫu</div>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Dựa trên SKU thật đã sync</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <Zap className="h-4 w-4 text-amber-500" aria-hidden="true" />
                      <div className="mt-1.5 text-xs font-black text-slate-900">Tư vấn lắp</div>
                      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Nhắn nhu cầu, shop lo tiếp</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ProductThumbs
              creativeImages={page.creativeImages}
              images={images}
              selectedImageIndex={selectedImageIndex}
              setSelectedImageIndex={setSelectedImageIndex}
              sizeClass="h-[84px] w-[68px]"
            />
          </div>
        </div>

        {/* Right: purchase card (desktop only) */}
        <div className="space-y-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black leading-tight text-slate-950">
              {product?.name ?? page.title}
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              Nhắn shop để kiểm đúng mẫu, tồn kho và phương án lắp đặt trước khi chốt đơn.
            </p>

            <div className="mt-4">
              <PriceBadge discountLabel={discountLabel} originalPrice={originalPrice} price={price} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>SKU {product?.sku ?? "đang cập nhật"}</span>
              <span>·</span>
              <span>Dữ liệu từ sản phẩm đã sync</span>
            </div>

            <div className="mt-4 grid gap-2">
              {page.hero.bullets.slice(0, 4).map((bullet) => (
                <div key={bullet} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2.5">
              <a
                href="#lead-form"
                className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-base font-black text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-700 active:scale-[0.98]"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {page.hero.primaryCta}
              </a>
              <a
                href="#lead-form"
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-base font-black text-slate-950 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5 text-brand-600" aria-hidden="true" />
                Tư vấn trực tiếp
              </a>
            </div>
          </article>

          <section id="proof" className="grid grid-cols-2 gap-2">
            {page.sections.trustBadges.slice(0, 4).map((badge) => (
              <div key={badge} className="flex min-h-[76px] flex-col justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
                <span className="text-sm font-black leading-snug text-slate-800">{badge}</span>
              </div>
            ))}
          </section>
        </div>
      </section>
    </>
  );
}
