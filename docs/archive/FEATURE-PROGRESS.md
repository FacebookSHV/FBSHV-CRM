# FBSHV CRM - Feature Progress Index

Last updated: 2026-06-07

Purpose: one-page map for future Codex chats. Read this after `AGENTS.md` and before editing a feature.

## Global Rules

- Repo scope: only `E:\FBSHV-CRM`.
- Production URL: `https://fbshv-crm.ngchihuy.workers.dev`.
- Chrome profile for production/UI checks: `E:\codex-chrome-profiles\fbshv-meta`.
- Cloudflare account for deploy: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Do not stage or commit `.env*`, `profiles.local.json`, tokens, secrets, `tsconfig.tsbuildinfo`, backup SQL/zip files.

## Feature Map

| Feature | Status | Source Files | Production Notes | Next Action |
|---|---|---|---|---|
| Products sync | Verified production | `src/app/api/products/*`, `src/lib/ecommerce/*`, D1 `products` | Sync from Web Quan Ly TMDT Product Core, persists after F5, search by SKU/name works. | Re-test only if product API or cache schema changes. |
| Content Planner | Verified production | `src/components/facebook/*`, `src/app/api/content/*`, `src/lib/content-publishing.ts` | Draft/schedule/edit/delete/publish job flow verified; product picker uses real D1 products. | Improve creative workflow only after ImageFlow bridge is stable. |
| AI Settings / Assistant | Verified production | `src/components/settings/*`, `src/app/api/settings/*`, `src/lib/ai/*` | Gemini key slots 1-5 supported, masked only, classified key status. | Re-test if provider/model settings change. |
| Facebook Ads | Verified production live-write paused | `src/lib/facebook/ads.ts`, `src/app/ads/*`, `src/app/api/ads/*` | Three real ad accounts clickable; live-write created PAUSED campaign/adset/ad. | Do not create more live ads unless user explicitly confirms. |
| Pixel + CAPI | Verified production | `src/app/api/meta/capi/events/route.ts`, `src/lib/meta/*` | Meta dedup uses `event_id`; Pixel/CAPI configured and sent PageView successfully. | Optional `META_TEST_EVENT_CODE` only for Events Manager diagnostics. |
| Landing Page builder | Verified production - AI template catalog deployed | `src/components/landing-pages/*`, `src/lib/landing-pages/*`, `src/app/lp/[slug]/*` | The user-supplied builder/blueprint files were adapted into CRM templates: TikTok, Shopee, Facebook Ads, Livestream, Combo, Flash Sale, Trust, Story, Minimal, Bold, plus existing templates. Each template passes conversion angle, visual style, proof policy, and 5 slot-specific 4:5 image frames to ImageFlow/CDP. Social proof blocks are kept but only render real Product Core/CRM/campaign data. Production page `1-bo-cs-300w-k268-tiktok-shop-05043c` was created, published, rendered with ImageFlow, and verified on mobile/tablet/desktop. | Improve ImageFlow prompt/source-reference quality further so all 5 frames can be approved; current K268 run approved 2 correct assets and rejected 3 incorrect/over-claimed assets. |
| ImageFlow bridge | Verified bridge, Facebook image mode tested, creative QA failed | `src/components/imageflow/*`, `src/app/api/imageflow/*`, `scripts/imageflow-*.mjs` | CRM creates jobs, local ImageFlow uses `external_product_api` to build `product_package.json`; CRM adapter appends `landingCopy`, `creativeBrief`, `frameSpec`, and source-photo render guard. Separate local ImageFlow Facebook Ads mode exists with `target_format=facebook_album`, `aspect_ratio=4:5`, `output_size=1080x1350`. Test job `ae6176de-8492-402a-936a-8298860556c1` for SKU `1_MUIKHOAN_10MM_K265` completed and uploaded 2 assets to CRM/R2, verified in production `/imageflow-bridge` with Chrome profile `fbshv-meta`. Visual QA failed because generated images still included unsupported claims such as `khoan gỗ` and `khoan sắt`; do not use those assets for ads yet. | Fix prompt-lock path so allowed/forbidden product claims from CRM are enforced inside ImageFlow `facebook_album` prompt and add pre-upload claim QA; also fix/render profile mapping issue for profile `6`. |
| CRM shell responsive UI | Verified previous pass | `src/app/*`, shared layout/components | Mobile and tablet/PC shell split exists. | Re-check only when touching shell/navigation. |

## Latest Landing AI Generator Update - 2026-06-06

- Source map: `docs/reference/landing-ai-template-source-map.md`.
- Added template catalog in `src/lib/landing-pages/template-catalog.ts`.
- Added real social-proof reader in `src/lib/landing-pages/real-proof.ts`.
- Added public conversion proof UI in `src/components/landing-pages/public/landing-conversion-proof.tsx`.
- Added review-gate UI for ImageFlow assets; public landing pages use approved assets only.
- Added test file `tests/landing-page-ai-generator.test.ts`.
- Keep conversion blocks such as discount, sold count, reviews, testimonials, countdown and vouchers, but never invent values. If there is no real source, hide or label the block as unavailable instead of filling fake numbers.
- Deployed Worker version `4c84f434-34ae-4b16-92af-857fbe24b7fc` on Cloudflare account `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Production verification used visible Chrome profile `E:\codex-chrome-profiles\fbshv-meta`.
- Verified `/landing-pages`, `/imageflow-bridge`, and `/lp/1-bo-cs-300w-k268-tiktok-shop-05043c` at desktop `1366x900`, tablet `820x1180`, and mobile `390x844` with no horizontal overflow.
- ImageFlow local watcher rendered job `e0f572a6-c393-4c2d-9bb6-10f1fee7a3ad` and uploaded 5 assets to CRM/R2.
- Visual QA approved 2 assets that preserved the real product identity and rejected 3 assets that either over-claimed use case or redrew the K268 product as a different board/remote/control panel.
- Public `/lp/1-bo-cs-300w-k268-tiktok-shop-05043c` now uses only approved asset ids `70fcbad6-3a28-4804-8a66-1f4cd8d27b4d` and `f1c49ed3-eb07-42ec-97b6-bd09e17d29ca`.

## Latest Facebook ImageFlow Test - 2026-06-07

- Confirmed local ImageFlow has a separate Facebook Ads/image path: `target_format=facebook_album`, `aspect_ratio=4:5`, `output_size=1080x1350`.
- Production CRM test job `e9c759df-7515-44d7-be7d-90e78ddeb3f6` for SKU `1_MUIKHOAN_10MM_K265` failed because local ImageFlow was missing port mapping for render profile `6`, but local files were still generated.
- Production CRM strict test job `ae6176de-8492-402a-936a-8298860556c1` completed and uploaded 2 assets:
  - `651746b2-5c0a-4b6d-8abc-2a721b1be6aa`
  - `8c503114-6382-46a7-acb4-b3a8f38adb2a`
- Verified visible production page `https://fbshv-crm.ngchihuy.workers.dev/imageflow-bridge` with Chrome profile `E:\codex-chrome-profiles\fbshv-meta`; job showed `Đã về CRM`, `2/2`, `4:5 · 1080x1350`.
- Creative QA result: not approved for Facebook ads yet. The images have correct 4:5 size and upload path, but still contain unsupported usage claims (`khoan gỗ`, `khoan sắt`) that are not in Product Core description for SKU `1_MUIKHOAN_10MM_K265`.
- Next fix must be prompt-level and gate-level: inject CRM `allowedClaims` / `forbiddenClaims` into the actual ImageFlow `facebook_album` prompt path, block stale final-file reuse, and reject/hold assets before upload if rendered text violates forbidden claims.

## Active Handoff

Current detailed handoff: `docs/handoff/LATEST.md`.

Historical handoff for current landing-page UI pass:

- `docs/handoff/2026-06-06-landing-page-ui-imageflow.md`

## Latest Facebook Ads ImageFlow Lane Fix - 2026-06-07

- User clarified the correct local ImageFlow flow is `http://127.0.0.1:7096` -> `Facebook Ads`, with placements `Feed 4:5`, `Banner`, `Story`, and `Logo`.
- CRM `/imageflow-bridge` now creates placement-specific jobs:
  - Feed: `targetFormat=facebook_feed`, `1080x1350`, `4:5`.
  - Banner: `targetFormat=facebook_banner`, `820x312`.
  - Story/Reels: `targetFormat=facebook_story`, `1080x1920`, `9:16`.
  - Logo/Avatar: `targetFormat=facebook_logo`, `170x170`, `1:1`.
- Local ImageFlow backend was fixed to accept `pipeline=facebook_ads`; before this, the UI tab existed but backend silently fell back to the normal `image` queue.
- CRM adapter now prefers the matching queue pipeline, clears stale `chatgpt_cdp_renders` and `image_prompts*.json` before each job, and stores CRM claim policy/placement in `product_package.json`.
- Local ImageFlow now filters CDP queue runs by requested pipeline, so `pipeline=facebook_ads` no longer consumes old queued `image` jobs for the same SKU.
- Local ImageFlow prompt flow now injects CRM forbidden claims into the storyboard prompt and sanitizes `idea`, `design`, `text_hook_vi`, and `prompt_ai` before render.
- Verified clean production job `c8b1b502-4d55-4cd7-82a1-00dd631a15ab`:
  - Queue id: `facebook_ads|lazada|0909128999|1_MUIKHOAN_10MM_K265||1_MUIKHOAN_10MM_K265`.
  - Source references: 7 local/remote images.
  - Output: `final_facebook_feed_01.jpg`, `1080x1350`.
  - Uploaded CRM asset: `f38e7562-58ec-4c15-944f-2331ab69f0dc`.
  - Batch prompt check: no `wood`, `steel`, `khoan gỗ`, or `khoan sắt`.
  - Visual QA: pass for the previously failing unsupported-claim issue; image text now says `Khoan gạch - gạch men - tường`.
- Failed intermediate jobs kept for trace:
  - `74f35560-ca22-4883-b88e-a386165a49fa` completed but reused stale final image before stale-output cleanup.
  - `6f481edc-639c-4f1e-a3e0-037c441208b9` failed because prompt/render profiles were exhausted while validating the no-stale path.
- Current local blocker/risk: several ChatGPT profile IDs are marked failed in ImageFlow pool state. The latest pass succeeded after fallback, but future runs may still need profile pool reset/login if CDP tabs are not available.
