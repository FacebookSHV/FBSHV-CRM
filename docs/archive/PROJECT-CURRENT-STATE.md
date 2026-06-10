# FBSHV CRM - Project Current State

Last updated: 2026-06-06

## Production

- Production URL: `https://fbshv-crm.ngchihuy.workers.dev`.
- Cloudflare account verified: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Worker: `fbshv-crm`.
- D1: `fbshv_crm_db`.
- R2: `fbshv-crm-assets`.
- Latest deploy verified in this run: `4c84f434-34ae-4b16-92af-857fbe24b7fc`.

## Current Verified Capabilities

- Products sync from Web Quan Ly TMDT real Product Core API into CRM D1 cache; `/products` keeps synced data after F5 and search works on saved products.
- Product Core prompt payload is preserved in CRM cache/API: `images[]`, `promptAssets`, and `variants[]` are normalized from live endpoint payload or restored from `raw_payload_json`.
- Content Planner uses real product picker from synced products; draft, schedule, edit, delete confirm, publish job/live confirm, and F5 persistence were verified on production.
- AI Settings supports Gemini key slots 1-5 plus OpenAI slot. Production currently shows:
  - `GEMINI_API_KEY_1`: `valid`, masked only.
  - `GEMINI_API_KEY_2`: `valid`, masked only.
  - `GEMINI_API_KEY_3`: `permission_denied`, masked only.
  - Runtime provider display is `gemini` when a valid Gemini key is present.
- AI Assistant can generate with Gemini real when a valid key is available; fallback template is only used when provider calls fail.
- Ads has 3 real cached ad accounts, clickable detail pages, real campaigns/adsets/ads/insights calls, draft create, and live-write creation in Meta with objects created as `PAUSED`.
- Inbox now uses a real product picker from the CRM product cache when creating ecommerce orders from a Facebook conversation.
- Settings shows real runtime status for Meta, Ecommerce, Cloudflare, Ads, Webhook, AI, Meta SDK status, Pixel + CAPI status, and social UX integration.
- Facebook automation live-write is enabled for Messenger auto reply, comment auto reply, and phone-number comment hiding.
- Landing Page module is live:
  - Admin route `/landing-pages` creates mobile-first landing pages from synced real products only.
  - Admin route `/landing-pages` now has an ImageFlow toggle when creating a landing page. When enabled, CRM creates a `landing_page` ImageFlow job at 4:5 from real Product Core `images[]` and `promptAssets`.
  - Public route `/lp/[slug]` renders outside the CRM shell for ad traffic.
  - Public route `/lp/[slug]` prioritizes completed ImageFlow R2 assets for the hero and gallery, then falls back to Product Core images if no creative assets exist.
  - Public route `/lp/[slug]` now uses separate mobile and tablet/PC layout branches. Mobile follows a commerce landing pattern inspired by Shopee/TikTok style: shop header, trust bar, split hero, price card, product bullets, and sticky CTA.
  - Public landing page UI was refactored into separate component files so mobile and tablet/PC can be developed independently without the main public component approaching the 30KB file limit.
  - ImageFlow landing/page-album jobs now include explicit `frameSpec` prompt data for each generated image slot: output `4:5` at `1080x1350`, safe-area rules, slot roles, crop rules, and negative prompts so ChatGPT/ImageFlow creates assets that fit the landing-page frames instead of relying only on CSS.
  - Landing Page image prompts now add a fan-controller creative brief for SKU/model `CS 300W K268`: preserve the red horizontal PCB, blue button panel, white remote, and cable; require installation-guide and fan-compatibility slots; and forbid renaming the product into a generic power-source/electrical-supply product.
  - Because K268 currently has too few upstream reference images, the prompt now explicitly requires a source-photo layout mode: use the exact source photo as the product layer and add crop/zoom/callout/background around it instead of redrawing a new PCB, remote, or button panel.
  - CRM ImageFlow adapter now appends `landingCopy`, `creativeBrief`, `frameSpec`, and a non-negotiable render guard into ImageFlow local `product_package.json` after `/api/product-queue/add`, because ImageFlow's external Product Core fetch is the source of reference assets.
  - Public landing page conversion UI now shows real offer/price/stock/interest states and fan-compatibility guidance. It does not fake reviews or sold counts when Product Core has no real review/sold fields.
  - D1 tables: `landing_pages`, `landing_page_variants`, `landing_page_events`.
  - Browser Pixel and server CAPI use the same `event_id` for Meta dedup when `META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN` are configured.
  - Production test created and published slug `1-bo-cs-300w-k268-sales-fast-9d322a` from SKU `1_BO_CS_300W_K268`; D1 recorded 18 events, 1 lead, and 2 CAPI sent events.
  - Production test created and published slug `1-bo-cs-300w-k268-sales-fast-7ef131` from SKU `1_BO_CS_300W_K268`; ImageFlow job `1341f7bc-1b3e-418e-bc53-8e93c764201f` completed with 5 uploaded 4:5 R2 assets and the public page hero read back `b6a2eda3-76e0-4884-b053-da30ad80cc78`.
  - AI landing generator template catalog is deployed: TikTok Shop, Shopee Commerce, Facebook Ads, Livestream, Combo, Flash Sale, Trust, Story, Minimal, Bold, plus existing templates.
  - Each template now passes conversion angle, visual style, proof policy, and 5 slot-specific 4:5 frame specs to ImageFlow/CDP.
  - Conversion blocks such as discount, sold count, rating/reviews, countdown, testimonials, voucher, and gift are preserved for conversion but only render values from real Product Core/CRM/campaign data.
  - Production test created and published slug `1-bo-cs-300w-k268-tiktok-shop-05043c` from SKU `1_BO_CS_300W_K268`; ImageFlow job `e0f572a6-c393-4c2d-9bb6-10f1fee7a3ad` rendered 5 assets with template `tiktok_shop`, 5 image slots, and `templateBlueprint` in `promptJson`.
  - Visual QA approved 2 correct K268 assets and rejected 3 incorrect/over-claimed assets. Public page now uses only approved assets `70fcbad6-3a28-4804-8a66-1f4cd8d27b4d` and `f1c49ed3-eb07-42ec-97b6-bd09e17d29ca`.
- ImageFlow bridge initial module added:
  - UI route `/imageflow-bridge` creates image jobs from real synced products.
  - Mobile and tablet/PC are separate layouts, not one squeezed responsive table.
  - D1 tables: `imageflow_jobs`, `imageflow_assets`.
  - Local bridge script: `scripts/imageflow-bridge.mjs`.
  - CRM adapter script: `scripts/imageflow-crm-adapter.mjs`; it submits CRM product context to ImageFlow local `http://127.0.0.1:7096`, targets Facebook album `4:5` at `1080x1350`, waits for `final_facebook_feed_*.jpg`, and lets the bridge upload those assets back to CRM.
  - Adapter now ignores stale ImageFlow output files whose `mtime` is older than the current wait window, preventing old deterministic queue output from being uploaded as a new job result.
  - Bridge stores rendered images in R2 and mirrors metadata into `content_media` for Content Planner.
  - If ImageFlow local queue is busy, jobs move to `needs_user` with a clear retry reason instead of producing mock images.
  - Production route `/imageflow-bridge` verified with Chrome profile `fbshv-meta` on desktop 1366px, tablet 820px, and mobile 390px.
  - Mobile long local-path errors now wrap inside the job card; post-deploy verification shows no horizontal page overflow at 390px, 820px, or 1366px.
  - Production test job `a5c640a9-e12a-4797-ade9-e3f12db606ec` was created from SKU `1_BO_CS_300W_K268`; local bridge claimed it and staged `job.json` under ImageFlow work dir.
  - Production job `a5c640a9-e12a-4797-ade9-e3f12db606ec` completed with 5 R2 JPEG assets at `1080x1350`; asset index 0 was replaced via upsert after deploy and all 5 public assets now have distinct SHA-256 hashes.
  - Production test job `f094d59b-a2c9-43e0-8b63-e3c92b9f2ab2` confirmed ImageFlow `productContextJson` is built from Product Core detail by SKU and includes `images[]` plus `promptAssets`.
- UI shell now separates mobile from tablet/PC:
  - Mobile uses compact page headers, bottom navigation, and mobile-only dashboard work actions.
  - Tablet/PC uses the fixed left operator sidebar, grouped navigation, wider workspace headers, and desktop dashboard panels.
  - Shared cards, metric cards, badges, empty states, and app background were refreshed for a more professional operator console.

## New Integrations Added

- Installed `facebook-nodejs-business-sdk@24.0.1`.
- Local/Node test confirms the official SDK exposes Ads objects. Cloudflare Worker runtime uses the existing Graph API fetch adapter because the official Node SDK is not directly usable in Worker runtime.
- Added and enabled Meta Pixel + Conversions API endpoint:
  - `POST /api/meta/capi/events`
  - D1 table: `conversion_events`
  - Dedup key: unique `event_id`
  - Missing config is logged as `config_missing`, not faked as success.
  - After configuring Cloudflare secrets, production live-send returned `eventsReceived=1` and D1 logged `status=sent`.
- Added landing page builder inspired by GitHub landing-page references, implemented natively in FBSHV CRM:
  - `GET/POST /api/landing-pages`
  - `PATCH /api/landing-pages/:id`
  - `POST /api/landing-pages/events`
  - `GET /api/meta/pixel-config`
  - Public landing pages record PageView, ViewContent, Lead, and Contact.

## Current External Config

- ImageFlow bridge Worker secret is configured:
  - `IMAGEFLOW_BRIDGE_TOKEN`
- ImageFlow local server verified running on `http://127.0.0.1:7096`; ImageFlow produced Facebook feed assets at `1080x1350` and CRM uploaded them to R2/content media.
- Ecommerce runtime secrets were refreshed on Worker `fbshv-crm` from local valid source: `ECOMMERCE_API_BASE_URL`, `ECOMMERCE_API_KEY`, `ECOMMERCE_WEBHOOK_SECRET`, `MOCK_ECOMMERCE_API=false`.
- Pixel + CAPI is now enabled with Cloudflare Worker secrets:
  - `META_PIXEL_ID`: configured.
  - `META_CAPI_ACCESS_TOKEN`: configured from the valid encrypted Meta connection token already stored in CRM D1.
  - `META_TEST_EVENT_CODE`: optional, not configured.
- Verified by:
  - Graph API found Pixel `635875943626253` (`Pixel Shop Huy Van`) under real ad account access.
  - Direct Meta CAPI permission test returned `events_received=1`.
  - Production `POST /api/meta/capi/events` returned HTTP `200`.
  - D1 `conversion_events` logged `status=sent` with `response_json={"eventsReceived":1,"messages":[]}`.
- Facebook automation live-write secrets are enabled:
  - `AUTO_REPLY_MESSAGES_ENABLED=true`
  - `AUTO_REPLY_COMMENTS_ENABLED=true`
  - `AUTO_HIDE_PHONE_COMMENTS_ENABLED=true`
- Runtime Settings now reads those flags from Cloudflare Worker bindings and shows all three as `live-write đang bật`.

## Current Verification Notes

- Chrome visible profile used: `E:\codex-chrome-profiles\fbshv-meta`.
- Production routes verified this run:
  - `/dashboard`
  - `/products`
  - `/ads`
  - `/ads/accounts/act_507856080770596`
  - `/ads/accounts/act_750430830961447`
  - `/ads/accounts/act_759411594070976`
  - `/content-planner`
  - `/inbox`
  - `/settings`
  - `/landing-pages`
  - `/lp/1-bo-cs-300w-k268-sales-fast-9d322a`
  - `/lp/1-bo-cs-300w-k268-sales-fast-7ef131`
  - `/imageflow-bridge`
  - `POST /api/products/sync`
  - `GET /api/products/search?q=1_BO_CS_300W_K268`
  - `POST /api/products/:id/check-price`
  - `POST /api/products/:id/check-stock`
  - `POST /api/imageflow/jobs`
  - `POST /api/meta/capi/events`
- Production Product Core verification:
  - `/api/products/sync` synced 200 products and cached 200 into D1.
  - `/api/products?limit=50` returned 50/50 products with `images[]` and 50/50 products with `promptAssets`.
  - Search by SKU `1_BO_CS_300W_K268` still returned the product after hard reload/F5.
  - Check price returned `158000 VND`; check stock returned `availableStock=136`, `enoughStock=true`.
  - Source product description can be empty when Product Core source data is empty; CRM preserves the empty value instead of inventing text.
- Production landing page actions verified:
  - Created a draft landing page from synced product SKU `1_BO_CS_300W_K268`.
  - Published the landing page.
  - Opened public URL and confirmed CRM shell is not rendered on `/lp/...`.
  - Submitted lead test; UI returned Pixel/CAPI success message.
  - Refreshed public URL and confirmed the page persisted.
  - D1 remote confirmed `status=published`, `leads=1`, `capi_sent=2`.
  - After redesign deploy `b74936ee-576e-42e5-a027-36e3166e0949`, created and published landing page `1-bo-cs-300w-k268-sales-fast-7ef131` from the production UI with the ImageFlow toggle enabled.
  - Local bridge completed ImageFlow job `1341f7bc-1b3e-418e-bc53-8e93c764201f` and uploaded 5 R2 JPEG assets. Public page reload on mobile confirmed hero image source `/api/imageflow/assets/b6a2eda3-76e0-4884-b053-da30ad80cc78`.
  - After AI copy + mobile commerce deploy `c0f19549-536d-49c8-a591-a23b1256fe11`, production UI created and published slug `1-bo-cs-300w-k268-sales-fast-35f1ff` from SKU `1_BO_CS_300W_K268`; badge showed `Copy AI` at creation time.
  - Local bridge completed ImageFlow job `a7d94787-6d24-40bc-a89f-2e93f8ea37f4` and uploaded 5 R2 JPEG assets for slug `1-bo-cs-300w-k268-sales-fast-35f1ff`.
- Responsive checks this run:
  - `/dashboard`: mobile, tablet, desktop, no horizontal overflow; mobile and tablet/PC render different workspace layouts.
  - `/products`: mobile, tablet, desktop, no horizontal overflow; page header now uses separated mobile/tablet-PC layout.
  - `/content-planner`: mobile, tablet, desktop, no horizontal overflow.
  - `/settings`: mobile, tablet, desktop, no horizontal overflow after fixing tablet card columns.
  - `/ads`: mobile, tablet, desktop, no horizontal overflow.
  - `/lp/1-bo-cs-300w-k268-sales-fast-9d322a`: mobile 390x844, tablet 820x1180, desktop 1366x900, no horizontal overflow.
  - `/lp/1-bo-cs-300w-k268-sales-fast-7ef131`: mobile 390x844, tablet 820x1180, desktop 1366x900, no horizontal overflow; 5 ImageFlow images render; lead form and CTA visible.
  - `/lp/1-bo-cs-300w-k268-sales-fast-35f1ff`: mobile 390x844, tablet 820x1180, desktop 1366x900, no horizontal overflow after splitting mobile and tablet/PC layouts; ImageFlow assets render; the old wrong AI H1 was `Kiểm Soát Nguồn Điện 300W Mạnh Mẽ: An Toàn, Hiệu Quả Cho Mọi Dự Án`.
  - After refactor deploy `7f5d7762-a994-4bc4-b7b6-5df24ec9f7e3`, the same public landing page was rechecked at mobile/tablet/desktop and still had no horizontal overflow. Non-critical below-fold images now use lazy loading.
  - After frame-spec deploy `c107ff27-831f-4394-8aec-d160c5c2bd53`, production `POST /api/imageflow/jobs` created verification job `0a865403-0739-4524-8b15-175739f9a05d`; readback confirmed `promptJson.frameSpec.output={aspectRatio:"4:5",width:1080,height:1350,count:3}` and first slot role `album_cover`.
  - After deploy `3550cf27-5eca-4347-b131-9670b3103d74`, `/lp/1-bo-cs-300w-k268-sales-fast-35f1ff` was rechecked with visible Chrome profile `fbshv-meta`: mobile 390x844, tablet 820x1180, and desktop 1366x900 all had no horizontal overflow; visible hero image kept 4:5 ratio; CTA was visible.
  - Production `POST /api/imageflow/jobs` created verification job `8d96b483-f3b9-4faf-92b9-97f087d3c305` for SKU `1_MUIKHOAN_10MM_K265`; readback confirmed `images=7`, `promptAssets=7`, `variants=1`, `hasLandingCopy=true`, then the job was cancelled to avoid local render.
  - After deploy `7810f8e7-c1fd-4147-b266-63c41283a5e3`, D1 production row `35f1ff9b-e6cb-42d4-ab98-faed76a5a9c6` was updated so `/lp/1-bo-cs-300w-k268-sales-fast-35f1ff` now reads `CS 300W K268 - bộ điều khiển quạt đủ mạch, bảng nút và remote`. Visible Chrome profile `fbshv-meta` confirmed:
    - Mobile `390x844`: no horizontal overflow, H1 3 lines, hero image `320x400`, price/offer/stock visible.
    - Tablet `820x1180`: no horizontal overflow, H1 2 lines, hero image `280x350`, price/offer/stock visible.
    - Desktop `1366x900`: no horizontal overflow, H1 2 lines, hero image `300x375`, price/offer/stock visible.
    - Page includes fan-compatibility section `Các loại quạt cần kiểm trước khi lắp` and real-metric section `Đánh giá & lượt quan tâm`.
  - ImageFlow job `6fede57e-c6bd-4a90-9c39-10e772a04a0e` was rendered for the same page and uploaded 5 R2 assets, then was rejected and marked `failed` after visual QA because two generated frames changed the real K268 PCB/remote/button-panel identity. HTML readback confirmed the rejected asset IDs were no longer used by production.
  - After deploy `ca8f4da9-47e7-44d7-a36c-d9d18e9c2317`, the stricter source-photo render guard is live on Worker and in the local adapter script.
  - After deploy `4c84f434-34ae-4b16-92af-857fbe24b7fc`, `/landing-pages` was rechecked with visible Chrome profile `fbshv-meta`; template selection shows `Storyboard CDP: TikTok Shop`, all 5 ImageFlow/CDP 4:5 slots, and the real-data-only proof rule.
  - Public page `/lp/1-bo-cs-300w-k268-tiktok-shop-05043c` was created, published, and checked at mobile `390x844`, tablet `820x1180`, and desktop `1366x900`; all had no horizontal overflow, showed real price/discount/stock/CTA, and did not show fake sample sold/review values.
  - Production ImageFlow job `e0f572a6-c393-4c2d-9bb6-10f1fee7a3ad` was rendered by the local ImageFlow/CDP bridge and uploaded 5 assets. QA approved 2 and rejected 3. Next step is to improve source references/prompt path so future runs produce 5/5 acceptable frames.

## Do Not Commit

- `.env*`
- `profiles.local.json`
- `profiles.json`
- `tsconfig.tsbuildinfo`
- token/secret files
- backup SQL/zip files

## Open Follow-Up

- 2026-06-06 landing-page AI template catalog is production-verified and waiting for local ImageFlow render:
  - Feature index added at `docs/FEATURE-PROGRESS.md`.
  - Current handoff added at `docs/handoff/2026-06-06-landing-page-ui-imageflow.md` and linked from `docs/handoff/LATEST.md`.
  - `src/components/landing-pages/public/landing-page-commerce-top.tsx` has been adjusted so mobile, tablet, and desktop use separate hero breakpoints and larger fixed 4:5 image frames.
  - ImageFlow prompt/package context was tightened: product cache preserves variant images; ImageFlow job context merges Product Core SKU and id/SKU detail; landing jobs pass `hero`, `sections`, and `seo` copy; adapter keeps variants/landing copy and records `sourceImageCount`, `remoteImageCount`, `variantCount`, and `productPackagePath` in the manifest.
  - Local ImageFlow prepare proof: SKU `1_BO_CS_300W_K268` produced package `localCount=1`, `remoteCount=1`, `variantCount=1` because upstream currently exposes one image; SKU `1_MUIKHOAN_10MM_K265` produced package `localCount=7`, `remoteCount=7`, `descLen=3127`, `variantCount=1`.
  - Direct external Product Core production readback for SKU `1_BO_CS_300W_K268` returned `images=1`, `promptAssets=1`, `variants=0`, `descriptionLength=0`; this is the current source-data blocker for generating accurate install/compatibility images without product hallucination.
  - `npm run typecheck`, `npm run lint`, `node --check scripts/imageflow-crm-adapter.mjs`, `npm run size:check`, `npm run hygiene:check`, `npm run build:cloudflare`, and `npm run cloudflare:check` passed after the UI/context edit.
  - Deployed Worker version `4c84f434-34ae-4b16-92af-857fbe24b7fc` after verifying Cloudflare account `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
  - Production Chrome verification passed at 390x844, 820x1180, and 1366x900 for `/lp/1-bo-cs-300w-k268-tiktok-shop-05043c`.
  - ImageFlow job `e0f572a6-c393-4c2d-9bb6-10f1fee7a3ad` was rendered by the local watcher. It uploaded 5 images; 2 were approved and 3 were rejected after visual QA. Public page readback confirmed only approved imageflow asset IDs are used.
- `META_TEST_EVENT_CODE` is optional and not configured. Add it later only if Events Manager test-event diagnostics are needed.
- The CAPI token source is the current active encrypted Meta connection token. If the Facebook connection is rotated or expires, refresh Facebook connection and update `META_CAPI_ACCESS_TOKEN` accordingly.
- Landing Page currently has one active variant per page. The schema supports variants, but full A/B traffic splitting and AI copy generation UI are still future work.
- ImageFlow local bridge is production-verified for CRM upload. If a future ImageFlow local queue is busy, CRM jobs should stay `needs_user` with the sanitized queue reason and be retried after the local queue is idle.
- Latest FBSHV deploy: Cloudflare Worker version `4c84f434-34ae-4b16-92af-857fbe24b7fc`.
