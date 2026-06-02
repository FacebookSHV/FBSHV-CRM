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

## New Integrations Added

- Installed `facebook-nodejs-business-sdk@24.0.1`.
- Local/Node test confirms the official SDK exposes Ads objects. Cloudflare Worker runtime uses the existing Graph API fetch adapter because the official Node SDK is not directly usable in Worker runtime.
- Added Meta Pixel + Conversions API endpoint:
  - `POST /api/meta/capi/events`
  - D1 table: `conversion_events`
  - Dedup key: unique `event_id`
  - Missing config is logged as `config_missing`, not faked as success.

## Current Blockers / Missing External Config

- Pixel + CAPI is implemented but not fully enabled because Worker secrets are missing:
  - `META_PIXEL_ID`
  - `META_CAPI_ACCESS_TOKEN`
  - optional `META_TEST_EVENT_CODE`
- Verified by:
  - `wrangler secret list` on the correct Cloudflare account.
  - Production `POST /api/meta/capi/events` returning `META_CAPI_CONFIG_MISSING`.
  - D1 `conversion_events` logging `status=config_missing`.
  - Chrome visible profile opening Meta Business Suite and attempting Events Manager; Events Manager direct link/Business Suite link did not expose a usable Pixel/CAPI token flow.

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

- To enable live Pixel + CAPI, provide or create valid `META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN`, then set them as Cloudflare Worker secrets for `fbshv-crm` on account `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
