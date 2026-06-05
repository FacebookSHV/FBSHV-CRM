import {
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { LandingPage } from "@/lib/landing-pages/types";

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

function ProductThumbs({
  images,
  selectedImageIndex,
  setSelectedImageIndex,
  sizeClass,
  max = 8
}: {
  images: string[];
  selectedImageIndex: number;
  setSelectedImageIndex: Dispatch<SetStateAction<number>>;
  sizeClass: string;
  max?: number;
}) {
  if (images.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
      {images.slice(0, max).map((image, index) => (
        <button
          key={image}
          type="button"
          onClick={() => setSelectedImageIndex(index)}
          className={`${sizeClass} flex-none overflow-hidden rounded-xl border bg-white ${selectedImageIndex === index ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-200"}`}
          aria-label={`Xem ảnh ${index + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </button>
      ))}
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
  return (
    <>
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
          <ProductThumbs images={images} selectedImageIndex={selectedImageIndex} setSelectedImageIndex={setSelectedImageIndex} sizeClass="h-14 w-14" max={6} />
        </div>

        <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
              <BadgePercent className="h-4 w-4" aria-hidden="true" />
              {discountLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {stockLabel}
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
            <ProductThumbs images={images} selectedImageIndex={selectedImageIndex} setSelectedImageIndex={setSelectedImageIndex} sizeClass="h-16 w-16" />
          </div>
        </div>

        <div className="space-y-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                <BadgePercent className="h-4 w-4" aria-hidden="true" />
                {discountLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                {stockLabel}
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
    </>
  );
}
