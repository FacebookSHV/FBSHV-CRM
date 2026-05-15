# CODEX FINAL REPORT FACEBOOK CRM

## 1. Tổng quan đã làm.

- Hoàn thiện luồng Facebook CRM real-mode cho OAuth, Page connect, Messenger, comment, webhook và inbox.
- Dọn secret trong repo, thay nội dung file token local bằng placeholder an toàn, cập nhật `.gitignore`, thêm secret scanner và env checker.
- Tạo Meta Developer App `Shop Huy Van CRM` với app id `1752876509417710`, lưu App Secret vào `.env.local` và set lên Cloudflare CRM, không ghi secret vào report/log.
- Tạo shared secret mới cho CRM và Web Quản Lý TMĐT, set đồng bộ:
  - CRM worker: `ECOMMERCE_API_KEY`, `ECOMMERCE_WEBHOOK_SECRET`.
  - TMĐT worker `huyvan-worker-api`: `API_KEY_FOR_FACEBOOK_CRM`, `WEBHOOK_SECRET_FOR_FACEBOOK_CRM`, `FACEBOOK_CRM_WEBHOOK_URL`.
- Tạo D1/R2 đúng trong Cloudflare account hiện tại, cập nhật `wrangler.toml`, apply migrations remote và deploy production.
- App hiện chạy real-mode: `MOCK_EXTERNAL_APIS=false`, `MOCK_ECOMMERCE_API=false`.

## 2. File đã thêm/sửa.

- Secret/env/scripts: `.gitignore`, `.env.example`, `package.json`, `scripts/check-env.mjs`, `scripts/check-secrets.mjs`, `scripts/check-cloudflare-project.mjs`, `scripts/set-cloudflare-secrets-from-env.mjs`, `scripts/set-github-secrets-from-env.mjs`, `scripts/import-secret-input.mjs`, `scripts/generate-ecommerce-shared-secrets.mjs`, `scripts/set-crm-cloudflare-secrets.mjs`.
- Cloudflare: `wrangler.toml`.
- DB: `src/db/schema/social.ts`, `drizzle/0001_facebook_real_flow.sql`, `drizzle/meta/_journal.json`.
- Facebook service: `src/lib/facebook/*`.
- Ecommerce flow: `src/lib/ecommerce/*`, `src/app/api/ecommerce/orders/from-facebook/route.ts`.
- API: `src/app/api/facebook/*`, `src/app/api/webhooks/facebook/route.ts`, `src/app/api/inbox/*`, `src/app/api/comments/route.ts`, `src/lib/api-response.ts`.
- UI: `src/app/fanpages/page.tsx`, `src/app/inbox/page.tsx`, `src/components/facebook/*`, `src/components/shell/app-shell.tsx`, `src/app/layout.tsx`.
- Tests/docs: `tests/facebook-flow.test.ts`, `tests/ecommerce-provider.test.ts`, `tests/env-and-safety.test.ts`, `docs/architecture.md`, `docs/facebook-crm-api.md`, `README.md`.
- Local-only files không commit: `.env.local`, `.env.secret-input.local`, `.env.generated.local`.

## 3. Database/migration đã thay đổi.

- Thêm migration `drizzle/0001_facebook_real_flow.sql`.
- Mở rộng social schema:
  - `facebook_connections`.
  - `pages` với token encrypted, token status, webhook status, picture, sync timestamps.
  - `conversations`, `messages`, `comments` với external ids, assignment, raw payload, duplicate-safe metadata.
  - `facebook_webhook_events` để lưu raw webhook, signature state, processed/error.
- Có unique index chống duplicate cho page/message/comment/webhook external ids.
- Remote D1 đã apply migrations: `fbshv_crm_db`, id `fbb7faa5-7dff-4165-ba3c-591adf5334e2`.

## 4. API routes đã thêm/sửa.

- `GET /api/facebook/connect`
- `GET /api/facebook/callback`
- `GET /api/facebook/pages`
- `POST /api/facebook/pages/[id]/subscribe`
- `POST /api/facebook/disconnect`
- `GET /api/webhooks/facebook`
- `POST /api/webhooks/facebook`
- `POST /api/facebook/messages/send`
- `POST /api/facebook/comments/reply`
- `POST /api/facebook/comments/hide`
- `GET /api/inbox/conversations`
- `GET /api/inbox/conversations/[id]/messages`
- `GET /api/comments`
- `POST /api/ecommerce/orders/from-facebook` đã đổi sang luồng lấy giá mới, check tồn, reserve bằng idempotency key, rồi mới create order.

## 5. UI đã thêm/sửa.

- `/fanpages`: trạng thái real/mock, nút Connect Facebook, danh sách page, token status, webhook subscription, synced_at, subscribe/disconnect.
- `/inbox`: conversation/message list, gửi reply, tạo đơn theo SKU/qty, comment list, reply/hide comment.
- Shell hiển thị đúng `Môi trường real` khi cả Facebook và ecommerce mock đều tắt.
- UI giữ mobile-first; desktop dùng sidebar và layout nhiều cột khi đủ rộng.

## 6. Luồng Facebook OAuth/webhook/chat/comment hoạt động như thế nào.

- `/api/facebook/connect` redirect sang Facebook OAuth với scope Page/Messenger/comment và ad account: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`, `pages_manage_engagement`, `business_management`, `ads_read`, `ads_management`.
- `/api/facebook/callback` đổi code lấy user token, lấy page/page token, encrypt token bằng `ENCRYPTION_KEY`, lưu D1.
- `/api/facebook/pages/[id]/subscribe` gọi Graph API subscribe page bằng page token.
- Facebook App webhook đã được set qua Graph API object `page` với fields `feed`, `messages`, `messaging_postbacks`.
- `/api/webhooks/facebook` verify `hub.verify_token`, verify `x-hub-signature-256` khi có chữ ký, lưu raw event, parse message/comment, upsert customer/conversation/message/comment, chống duplicate.
- Reply Messenger/comment/hide comment gọi Graph API bằng page access token; nếu thiếu token thật thì API trả lỗi rõ, không crash.

## 7. Secret nào cần user tự cấu hình trên Cloudflare/GitHub.

- Cloudflare CRM đã set: `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRM_APP_URL`, `APP_BASE_URL`, `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_GRAPH_API_VERSION`, `META_REDIRECT_URI`, `ECOMMERCE_API_BASE_URL`, `ECOMMERCE_API_KEY`, `ECOMMERCE_WEBHOOK_SECRET`, `MOCK_EXTERNAL_APIS`, `MOCK_ECOMMERCE_API`.
- Cloudflare TMĐT worker `huyvan-worker-api` đã set: `API_KEY_FOR_FACEBOOK_CRM`, `WEBHOOK_SECRET_FOR_FACEBOOK_CRM`, `FACEBOOK_CRM_WEBHOOK_URL`.
- GitHub Actions secrets chưa set vì `gh auth status` không sẵn sàng hoặc thiếu quyền trong repo hiện tại.
- Không có secret thật trong report. Cần rotate Cloudflare API token nếu token cũ từng nằm trong file local `GITHUB VÀ CLOUDFARE.txt`.

## 8. Test/lint/build nào đã chạy và kết quả, ghi rõ PASS/FAIL từng lệnh.

- PASS `npm install` không chạy lại vì `node_modules` đã có.
- PASS `npm run secrets:check`.
- PASS `npm run check:env`.
- PASS `npm run hygiene:check`.
- PASS `npm run size:check`.
- PASS `npm run lint`.
- PASS `npm run typecheck`.
- PASS `npm run test` với 5 test files, 23 tests.
- PASS `npm run build`.
- PASS `npm run build:cloudflare` với cảnh báo OpenNext trên Windows.
- PASS `npx wrangler --version`: `4.91.0`.
- PASS `npx wrangler whoami`: account `Nghiemchihuy@gmail.com's Account`, id `efe50fab1dd644088d681fb14a4838ae`.
- PASS `npx wrangler d1 info fbshv_crm_db`: D1 id `fbb7faa5-7dff-4165-ba3c-591adf5334e2`, APAC.
- PASS `npx wrangler r2 bucket list`: có `fbshv-crm-assets`.
- PASS `npx wrangler d1 migrations apply fbshv_crm_db --remote`.
- PASS `npm run secrets:set:cloudflare`.
- PASS Cloudflare Graph/API setup cho Facebook webhook subscription.
- PASS `npm run deploy`: deployed `https://fbshv-crm.nghiemchihuy.workers.dev`, version `42e56b97-e0d7-4ffb-9e20-52f0744e64f2`.
- PASS production verify:
  - `GET /api/webhooks/facebook` trả đúng challenge.
  - `GET /api/facebook/pages` trả `mode=real`, `pages=0`.
  - `/fanpages` và `/inbox` render production, hiển thị `Môi trường real`/`Facebook real`.
- PASS OAuth redirect verify: `/api/facebook/connect` redirect sang Facebook, scope có `ads_read`, `ads_management`, `business_management`, redirect URI production đúng.
- FAIL/SKIP `npm run secrets:set:github`: `gh CLI` chưa login hoặc thiếu quyền.
- FAIL/SKIP commit: thư mục `E:\FBSHV-CRM` hiện không phải git repository nên không có commit hash và không thể commit.

## 9. Phần nào đang mock do thiếu token thật.

- App runtime hiện không chạy mock: Facebook real và ecommerce real đều bật.
- Chưa có page connected trong D1, nên inbox/comment chưa có dữ liệu thật cho đến khi user bấm Connect Facebook và cấp quyền page/ad account.
- Không chạy destructive production write test với SKU thật. Luồng tạo đơn real đã có code và test an toàn, nhưng cần SKU test riêng nếu muốn test write end-to-end.

## 10. Việc user cần làm tiếp:

- Rotate Cloudflare API token nếu token cũ đã bị lộ.
- Set/giữ `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN` đã được cấu hình; không đưa các giá trị này vào file repo.
- Cấu hình Facebook App webhook URL đã set: `<CRM_APP_URL>/api/webhooks/facebook`.
- Set `ECOMMERCE_API_KEY` và `ECOMMERCE_WEBHOOK_SECRET` đúng với Web TMĐT: đã set đồng bộ bằng shared secret mới trên CRM và `huyvan-worker-api`.
- Deploy lại CRM nếu sau này đổi secret/code: hiện Codex đã deploy được production.
- Bấm Connect Facebook tại `https://fbshv-crm.nghiemchihuy.workers.dev/fanpages`, chọn page và ad account cần cấp quyền. App đang dev-mode nên tài khoản đăng nhập cần là admin/developer/tester và có quyền trên Business/ad account.
- Commit hash hiện tại: không có vì thư mục hiện không phải git repository.
- Commit message dự kiến khi repo git sẵn sàng: `feat: complete facebook crm integration flow`.
