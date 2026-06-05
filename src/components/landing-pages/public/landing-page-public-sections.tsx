import { Image as ImageIcon, Phone, Send, Star, Wrench } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { LandingPage } from "@/lib/landing-pages/types";

type LandingProduct = LandingPage["product"];

type LandingPublicSectionsProps = {
  images: string[];
  leadName: string;
  leadNote: string;
  leadPhone: string;
  page: LandingPage;
  price: string;
  product: LandingProduct;
  setLeadName: Dispatch<SetStateAction<string>>;
  setLeadNote: Dispatch<SetStateAction<string>>;
  setLeadPhone: Dispatch<SetStateAction<string>>;
  status: string;
  submitLead: () => Promise<void>;
  submitting: boolean;
};

function landingImageClass(image: string, creativeImages: string[]) {
  return creativeImages.includes(image)
    ? "h-full w-full object-cover"
    : "h-full w-full object-contain p-2";
}

export function LandingPublicSections({
  images,
  leadName,
  leadNote,
  leadPhone,
  page,
  price,
  product,
  setLeadName,
  setLeadNote,
  setLeadPhone,
  status,
  submitLead,
  submitting
}: LandingPublicSectionsProps) {
  return (
    <>
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
                  <img src={image} alt={`${product?.name ?? page.title} ${index + 1}`} className={landingImageClass(image, page.creativeImages)} loading="lazy" />
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
    </>
  );
}
