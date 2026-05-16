# Báo cáo sửa OAuth và Cloudflare FBSHV CRM

## File đã sửa

- `src/lib/facebook/oauth.ts`: giảm OAuth scopes còn tối thiểu.
- `src/lib/facebook/env.ts`: fallback URL an toàn về domain production đúng.
- `scripts/check-env.mjs`: cập nhật warning fallback URL.
- `scripts/check-cloudflare-project.mjs`: kiểm tra đúng Cloudflare account mới, D1 và R2 trước deploy.
- `tests/facebook-flow.test.ts`: cập nhật test scope tối thiểu.
- `docs/architecture.md`, `docs/facebook-crm-api.md`: cập nhật mô tả OAuth scope hiện tại.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/data-deletion/page.tsx`: legal pages dạng static `page.tsx`.

## OAuth URL trước/sau

- Trước: OAuth URL đang dùng Meta app/domain cũ và scope vượt mức cần thiết.
- Sau: OAuth URL local verified có:
  - `client_id=1296077039298909`
  - `redirect_uri=https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback`
  - `scope=pages_show_list,pages_manage_metadata,pages_read_engagement`
- Sau: OAuth URL verified không còn app id cũ, domain CRM cũ, hoặc các scope nâng cao chưa được duyệt.

## Cloudflare account đã dùng

- Account bắt buộc trong checker: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- `wrangler.toml` hiện trỏ:
  - Worker `fbshv-crm`
  - D1 `fbshv_crm_db`, id `218d0eab-7734-4fda-91b9-e3e2604e6c86`
  - R2 `fbshv-crm-assets`
- Deploy bị chặn vì Wrangler CLI hiện báo token không hợp lệ, chưa xác nhận được account mới.

## Lệnh build/deploy/test đã chạy và kết quả

- PASS `git status --short`
- PASS `git remote -v`: origin là `git@github.com:FacebookSHV/FBSHV-CRM.git`
- PASS repo scan: không còn chuỗi app id/domain/account cũ hoặc scope cấm trong repo được quét.
- PASS legal page check: chỉ còn static `page.tsx` cho `/privacy`, `/terms`, `/data-deletion`.
- PASS `npm run secrets:check`
- PASS `npm run check:env` với env override domain/app mới.
- PASS `npm run hygiene:check`
- PASS `npm run size:check`
- PASS `npm run lint`
- PASS `npm run typecheck`
- PASS `npm run test`: 5 files, 23 tests.
- FAIL `npm run cloudflare:check`: `BLOCKED_CLOUDFLARE_AUTH` do Wrangler token không hợp lệ.
- PASS clean `npm run build` sau khi xóa `.next` và `.open-next`.
- PASS `npm run build:cloudflare`, `.open-next/worker.js` được tạo.
- SKIP deploy: không chạy vì chưa xác nhận được Cloudflare account mới.
- PASS local server post-build:
  - `/privacy` trả 200
  - `/terms` trả 200
  - `/data-deletion` trả 200
  - `/api/facebook/connect` trả redirect đúng app/domain/scope tối thiểu.
- PASS live legal URL check trên domain production đúng:
  - `/privacy` trả 200
  - `/terms` trả 200
  - `/data-deletion` trả 200
- FAIL live `/api/facebook/connect`: app id và redirect URI đã đúng, nhưng scope production vẫn còn scope nâng cao. Nguyên nhân: build local đã đúng nhưng chưa deploy được sang Cloudflare account mới vì `BLOCKED_CLOUDFLARE_AUTH`.

## BLOCKED và bước user cần làm tiếp

- `BLOCKED_CLOUDFLARE_AUTH`: token Wrangler hiện tại không hợp lệ nên Codex không deploy.
- Cần tạo hoặc export Cloudflare API token thuộc account mới, có quyền Workers/D1/R2 cho `fbshv-crm`.
- Trong Cloudflare UI của Worker `fbshv-crm` > Settings > Variables and Secrets, set hoặc kiểm tra:
  - `META_APP_ID=1296077039298909`
  - `APP_URL=https://fbshv-crm.ngchihuy.workers.dev`
  - `CRM_APP_URL=https://fbshv-crm.ngchihuy.workers.dev`
  - `APP_BASE_URL=https://fbshv-crm.ngchihuy.workers.dev`
  - `META_REDIRECT_URI=https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback`
- Không set `CLOUDFLARE_ACCOUNT_ID` hoặc `CLOUDFLARE_API_TOKEN` làm Worker runtime secrets.
- Sau khi token Cloudflare từng bị lộ hoặc dùng sai account, nên revoke token cũ và tạo token mới.
