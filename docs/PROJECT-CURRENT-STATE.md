# FBSHV CRM - Project Current State

Last updated: 2026-06-02

## Production

- Production URL: `https://fbshv-crm.ngchihuy.workers.dev`.
- Cloudflare account verified: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Worker: `fbshv-crm`.
- D1: `fbshv_crm_db`.
- R2: `fbshv-crm-assets`.
- Latest deploy verified in this run: `738f5529-bb20-49cc-8b76-a660ba132363`.

## Current Verified Capabilities

- Products sync from Web Quan Ly TMDT real API into CRM D1 cache; `/products` keeps synced data after F5 and search works on saved products.
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

## New Integrations Added

- Installed `facebook-nodejs-business-sdk@24.0.1`.
- Local/Node test confirms the official SDK exposes Ads objects. Cloudflare Worker runtime uses the existing Graph API fetch adapter because the official Node SDK is not directly usable in Worker runtime.
- Added and enabled Meta Pixel + Conversions API endpoint:
  - `POST /api/meta/capi/events`
  - D1 table: `conversion_events`
  - Dedup key: unique `event_id`
  - Missing config is logged as `config_missing`, not faked as success.
  - After configuring Cloudflare secrets, production live-send returned `eventsReceived=1` and D1 logged `status=sent`.

## Current External Config

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
  - `/ads`
  - `/ads/accounts/act_507856080770596`
  - `/ads/accounts/act_750430830961447`
  - `/ads/accounts/act_759411594070976`
  - `/content-planner`
  - `/inbox`
  - `/settings`
  - `POST /api/meta/capi/events`
- Responsive checks this run:
  - `/content-planner`: mobile, tablet, desktop, no horizontal overflow.
  - `/inbox`: mobile, tablet, desktop, no horizontal overflow.
  - `/settings`: mobile and desktop, no horizontal overflow.
  - `/ads/accounts/act_750430830961447`: desktop, no horizontal overflow across clicked tabs.

## Do Not Commit

- `.env*`
- `profiles.local.json`
- `profiles.json`
- `tsconfig.tsbuildinfo`
- token/secret files
- backup SQL/zip files

## Open Follow-Up

- `META_TEST_EVENT_CODE` is optional and not configured. Add it later only if Events Manager test-event diagnostics are needed.
- The CAPI token source is the current active encrypted Meta connection token. If the Facebook connection is rotated or expires, refresh Facebook connection and update `META_CAPI_ACCESS_TOKEN` accordingly.
