# Báo cáo cuối Facebook CRM

## 1. Trạng thái

- Kết quả: `DONE_WITH_NEED_USER_META_UI_ACTION`.
- Code, migration, build, deploy Cloudflare và test production đã chạy xong trên Worker `fbshv-crm`.
- Phần còn cần user kiểm trong Meta Developer UI: browser automation bị chuyển về trang login Meta for Developers, nên không tự chỉnh App settings/Webhook fields trong UI Meta được.
- Commit nền trước thay đổi: `0898b62` trên nhánh `main`.

## 2. Repo, Cloudflare, deploy

- Repo/remote: `git@github.com:FacebookSHV/FBSHV-CRM.git`.
- Cloudflare account đã dùng: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Không dùng account cũ `efe50fab1dd644088d681fb14a4838ae`.
- Worker: `fbshv-crm`.
- Production URL: `https://fbshv-crm.ngchihuy.workers.dev`.
- D1: `fbshv_crm_db`, database id `218d0eab-7734-4fda-91b9-e3e2604e6c86`.
- R2: `fbshv-crm-assets`.
- Deploy production: PASS, version `d8c54753-ec43-4bc2-961a-a6435aabbc0e`.

## 3. OAuth và Meta

- OAuth App ID: `1296077039298909`.
- Redirect URI: `https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback`.
- Scope sau cùng:
  - `pages_show_list`
  - `pages_manage_metadata`
  - `pages_read_engagement`
  - `pages_messaging`
  - `pages_manage_engagement`
  - `pages_manage_posts`
- OAuth production verified: không còn app cũ, domain cũ, `business_management`, `ads_read`, `ads_management`.
- Cần reconnect Facebook: `NEED_USER_RECONNECT_FACEBOOK` để cấp lại token Page theo scope mới, đặc biệt `pages_manage_posts` cho publish sau này.

## 4. Fanpage và webhook

- `Shop Gia Dụng Huy Vân`: token `valid`, webhook bật.
- `Shop Huy Vân`: token `valid`, webhook bật.
- `Hủ Tíu Mì Hủ Hủ Mì - 好好味华人粉面`: token `valid`, webhook bật.
- Dòng demo `fb_page_demo`: không còn trong D1.
- Webhook verify production: PASS, HTTP 200 và body `test_ok`.

## 5. Automation Facebook

- Auto reply message: code production đã bật bằng Worker secret `AUTO_REPLY_MESSAGES_ENABLED=true`.
- Auto reply comment: code production đã bật bằng Worker secret `AUTO_REPLY_COMMENTS_ENABLED=true`.
- Auto hide comment có số điện thoại: code production đã bật bằng Worker secret `AUTO_HIDE_PHONE_COMMENTS_ENABLED=true`.
- Chống trùng: dùng bảng `facebook_automation_actions` với unique dedupe key.
- Thiếu quyền Meta sẽ trả lỗi `BLOCKED_META_PERMISSION_MISSING` thay vì crash.
- Test thực tế đã hide một comment thật có số điện thoại qua API production; D1 xác nhận comment đã `hidden=1`.
- Không bơm fake webhook production để tránh tạo dữ liệu khách/comment giả trong D1.

## 6. Page Audit

- API:
  - `GET /api/page-audit`
  - `POST /api/page-audit/run`
  - `GET /api/page-audit/[pageId]/latest`
- UI: `/page-audit`.
- Production UI đã bấm `Chạy audit` thành công.
- Điểm mới nhất:
  - `Shop Gia Dụng Huy Vân`: 90/100
  - `Shop Huy Vân`: 86/100
  - `Hủ Tíu Mì Hủ Hủ Mì - 好好味华人粉面`: 90/100

## 7. Content Planner và lịch đăng

- API:
  - `GET /api/content/posts`
  - `POST /api/content/posts/generate`
  - `POST /api/content/posts`
  - `PATCH /api/content/posts/[id]`
  - `POST /api/content/posts/[id]/schedule`
  - `POST /api/content/posts/[id]/cancel`
  - `GET /api/content/calendar/suggestions`
- UI: `/content-planner`.
- Production UI đã bấm `Tạo ý tưởng` và `Lên lịch ngày mai`.
- D1 hiện có 1 bài trạng thái `scheduled`.
- Auto publish thật đang tắt: `AUTO_PUBLISH_POSTS_ENABLED=false`.
- Publish thật cần token có `pages_manage_posts`; nếu thiếu sẽ trả `BLOCKED_META_PERMISSION_MISSING pages_manage_posts`.

## 8. Ads account

- UI `/ads` chuyển thành readiness/read-only placeholder.
- Không thêm scope ads vào OAuth.
- Không chạy hoặc chỉnh sửa quảng cáo thật.
- Ads thật giai đoạn sau cần `NEED_META_ADS_REVIEW_OR_BUSINESS_PERMISSION` cho `business_management`, `ads_read`, `ads_management`.

## 9. Ecommerce

- Provider vẫn dùng luồng `/api/external/*`.
- `GET /api/ecommerce/products?limit=5`: PASS, HTTP 200.
- CRM không tự trừ tồn local; luồng tạo đơn vẫn đi qua ecommerce provider.

## 10. Database/migration

- Đã thêm và apply remote migration `0002_growth_automation_content.sql`.
- Bảng mới:
  - `facebook_automation_actions`
  - `page_audits`
  - `page_audit_runs`
  - `page_audit_findings`
  - `content_ideas`
  - `content_posts`
  - `content_calendar`
- D1 remote `d1_migrations` đã ghi `0002_growth_automation_content.sql`.
- `.gitignore` giữ chặn SQL chung nhưng mở ngoại lệ `drizzle/*.sql` để migration schema được commit.

## 11. File đã thêm/sửa

- `.gitignore`
- `drizzle/0000_known_human_fly.sql`
- `drizzle/0001_facebook_real_flow.sql`
- `drizzle/0002_growth_automation_content.sql`
- `drizzle/meta/_journal.json`
- `src/app/ads/page.tsx`
- `src/app/api/content/**`
- `src/app/api/page-audit/**`
- `src/app/api/webhooks/facebook/route.ts`
- `src/app/content-planner/page.tsx`
- `src/app/page-audit/page.tsx`
- `src/components/facebook/content-planner-content.tsx`
- `src/components/facebook/page-audit-content.tsx`
- `src/components/shell/nav-items.ts`
- `src/db/schema/automation.ts`
- `src/db/schema/content.ts`
- `src/db/schema/page-audit.ts`
- `src/db/schema/index.ts`
- `src/lib/api-response.ts`
- `src/lib/content-planner.ts`
- `src/lib/db.ts`
- `src/lib/facebook/automation.ts`
- `src/lib/facebook/oauth.ts`
- `src/lib/facebook/operations.ts`
- `src/lib/facebook/permissions.ts`
- `src/lib/facebook/publishing.ts`
- `src/lib/page-audit.ts`
- `tests/facebook-flow.test.ts`
- `tests/growth-modules.test.ts`

## 12. Lệnh đã chạy

- PASS `git status --short`
- PASS `git remote -v`
- PASS `git fetch origin main`
- PASS `npx wrangler whoami`
- PASS `npx wrangler d1 list`
- PASS `npx wrangler r2 bucket list`
- PASS `npm run cloudflare:check`
- PASS `npx wrangler d1 migrations apply fbshv_crm_db --remote`
- PASS `npm run secrets:check`
- PASS `npm run check:env`
- PASS `npm run hygiene:check`
- PASS `npm run size:check`
- PASS `npm run lint`
- PASS `npm run typecheck`
- PASS `npm run test`
- PASS `npm run build`
- PASS `npm run build:cloudflare`
- PASS `npx wrangler deploy --keep-vars`
- PASS production API/UI smoke test cho `/fanpages`, `/inbox`, `/products`, `/privacy`, `/terms`, `/data-deletion`, `/api/facebook/pages`, `/api/inbox/conversations`, `/api/comments`, `/api/ecommerce/products?limit=5`, `/api/page-audit`, `/api/content/posts`, `/api/content/calendar/suggestions`.
- PASS browser UI production cho `/fanpages`, `/inbox`, `/products`, `/page-audit`, `/content-planner`, `/ads`.

## 13. User cần làm tiếp

- `NEED_USER_META_UI_ACTION`: mở Meta Developer app `1296077039298909` và kiểm:
  - App Domains: `fbshv-crm.ngchihuy.workers.dev`
  - Privacy Policy URL: `https://fbshv-crm.ngchihuy.workers.dev/privacy`
  - Terms URL: `https://fbshv-crm.ngchihuy.workers.dev/terms`
  - Data deletion URL/callback theo cấu hình app hiện tại.
  - Website Site URL: `https://fbshv-crm.ngchihuy.workers.dev/`
  - Valid OAuth Redirect URI: `https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback`
  - Webhook callback: `https://fbshv-crm.ngchihuy.workers.dev/api/webhooks/facebook`
  - Webhook fields Page: `messages`, `messaging_postbacks`, `feed`
- `NEED_USER_RECONNECT_FACEBOOK`: bấm Connect Facebook lại để token Page nhận scope mới.
- Nếu Cloudflare token từng bị lộ, revoke token cũ và tạo token mới.
