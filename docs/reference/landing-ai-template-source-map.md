# Landing AI Template Source Map

Last updated: 2026-06-06

## Source Files Reviewed

- `C:\Users\Admin\Downloads\ecommerce_landing_tiktok_shopee.html`
- `C:\Users\Admin\Downloads\landing_page_template_builder.html`
- `C:\Users\Admin\Downloads\landing-page-ai-generator-blueprint.md`

## What Was Integrated

The supplied files were adapted into the existing FBSHV CRM landing-page system, not copied as a second standalone app.

Implemented in CRM:

- Template catalog: `src/lib/landing-pages/template-catalog.ts`
- Template selection UI: `src/components/landing-pages/landing-pages-content.tsx`
- ImageFlow/CDP template payload: `src/lib/landing-pages/store.ts`
- Local ImageFlow package enrichment: `scripts/imageflow-crm-adapter.mjs`
- Public conversion proof from real data: `src/lib/landing-pages/real-proof.ts`
- Public proof UI: `src/components/landing-pages/public/landing-conversion-proof.tsx`

## Template Mapping

| Source concept | CRM template id | Notes |
|---|---|---|
| TikTok Shop style | `tiktok_shop` | Fast hook, video/proof style, real deal data only. |
| Shopee style | `shopee_shop` | Price, voucher, rating, sold count, shipping style from real fields only. |
| Facebook Ads style | `facebook_ads` | Pain hook, proof, lead form, Pixel/CAPI path. |
| Livestream Deal | `livestream_deal` | Countdown only if campaign end time exists. |
| Combo tiết kiệm | `combo_saver` | Combo/upsell, savings only from real price data. |
| Flash Sale | `flash_sale` | Urgency layout, no fake timer. |
| Trust Builder | `trust_builder` | Reviews/testimonials only from Product Core/CRM real payload. |
| Brand Story | `brand_story` | Story-driven page for higher-trust sales. |
| Minimal Clean | `minimal_clean` | Premium clean page with large product imagery. |
| Bold Impact | `bold_impact` | High-contrast conversion page. |

Existing CRM templates kept:

- `sales_fast`
- `video_guide`
- `compare`

## Image Slots Passed To ImageFlow/CDP

All templates currently use Facebook/landing 4:5 output for stable feed and landing hero usage:

- Output: `1080x1350`
- Ratio: `4:5`
- Slots: `hero`, `problem_solution`, `feature_proof`, `installation`, `offer_proof`

Each job includes:

- `templateId`
- `templateBlueprint`
- `frameSpec`
- `landingCopy`
- `creativeBrief`
- Product Core images, promptAssets, variants, raw payload
- Guard: use real source images as product identity source of truth

## Conversion Proof Rule

The following blocks are conversion-critical and should be kept:

- Discount
- Sold count
- Rating/review count
- Countdown
- Testimonials
- Voucher/gift/campaign offer

However, CRM must only render values when there is a real source:

- Product Core raw payload
- CRM landing metrics
- Real campaign configuration

Do not hard-code sample values like `9.3k sold`, `12.847 viewers`, fake names, fake reviews, fake timers, or fake vouchers.

## Tests

- `tests/landing-page-ai-generator.test.ts`

This verifies template ids, ImageFlow frame specs, real proof extraction, and no proof synthesis when the source has no proof fields.
