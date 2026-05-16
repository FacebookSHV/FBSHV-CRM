# AGENTS.md

Dự án này là **FBSHV CRM**.

## Nguyên tắc quan trọng

- Chỉ sửa repo FBSHV CRM.
- Không sửa repo Web Quản Lý TMĐT nếu user chưa cung cấp repo riêng.
- Web Quản Lý TMĐT là hệ thống ngoài, là source of truth cho Product, SKU, Inventory và Order.
- FBSHV CRM chỉ kết nối Web Quản Lý TMĐT qua API/webhook.
- Không tự quản lý tồn kho gốc trong FBSHV CRM.
- Không tự trừ tồn local nếu external API chưa phản hồi thành công.
- Không hard-code secret.
- Không commit `.env`, `.env.local`, `.env.generated.local`, token hoặc API key.
- Không in token/API key/secret ra log.
- Không chạy production write test nếu chưa có `SKU_TEST` riêng và `RUN_EXTERNAL_WRITE_TESTS=true`.

## Mapping secret giữa 2 website

Bên Web Quản Lý TMĐT:

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

Bên FBSHV CRM:

```env
ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
MOCK_ECOMMERCE_API="false"
```

Hai bên dùng chung giá trị key/secret nhưng tên biến khác nhau.

## Cloudflare

FBSHV CRM dùng Cloudflare riêng:

- Worker/app name: `fbshv-crm`
- D1 binding: `DB`
- D1 database name: `fbshv_crm_db`
- D1 database id: `218d0eab-7734-4fda-91b9-e3e2604e6c86`
- R2 binding: `BUCKET`
- R2 bucket name: `fbshv-crm-assets`

Không dùng wrangler config của CRM để set secret cho Web Quản Lý TMĐT.

---
name: fbshv-crm-codex-guardian
description: use this skill when working on the fbshv crm repo, codex prompts, cloudflare/open-next deployment, ecommerce product-sync integration, vietnamese anchor comments, project search hygiene, utf-8/font/mojibake checks, file-size limits, and mobile-first responsive ui reviews. trigger when the user asks to build, edit, review, search, maintain, or qa the fbshv crm project or wants codex instructions that must avoid mixing the separate ecommerce-management repo/cloudflare project.
---

# FBSHV CRM Codex Guardian

## Purpose

Use this skill to keep FBSHV CRM work maintainable, searchable, and safe. It encodes the project rules that must be repeated in Codex prompts and code reviews: two separate websites, no secret leaks, Product Sync only through the ecommerce API, Vietnamese anchor comments, UTF-8/font checks, file-size limits, and mobile-first UI.

## Non-negotiable project boundaries

1. Work only inside the FBSHV CRM repo unless the user explicitly provides the ecommerce-management repo and asks to edit it.
2. Treat Web Quan Ly TMDT as a separate GitHub and Cloudflare project. It is the source of truth for Product, SKU, Inventory, and Order.
3. FBSHV CRM may cache product/inventory data, but must not self-manage root inventory and must not subtract local stock unless the external ecommerce API confirms success.
4. Never hard-code or print secrets. Do not commit `.env`, `.env.local`, `.env.generated.local`, API keys, Cloudflare tokens, or webhook secrets.
5. Keep each source/docs/config file at or below 30 KB. Split files by feature, component, route, provider, schema domain, or doc section when needed.
6. Build UI mobile-first. Mobile uses cards/lists/drawer/bottom navigation; desktop can use fixed sidebar and tables.

## Required architecture reminders

### FBSHV CRM

- repo: `git@github.com:FacebookSHV/FBSHV-CRM.git`
- app/worker name: `fbshv-crm`
- d1 binding: `DB`
- d1 database name: `fbshv_crm_db`
- d1 database id: `218d0eab-7734-4fda-91b9-e3e2604e6c86`
- r2 binding: `BUCKET`
- r2 bucket: `fbshv-crm-assets`
- stack: next.js app router, typescript, tailwind, opennext cloudflare, d1, drizzle, r2, zod, recharts

### Ecommerce API mapping

For the ecommerce-management site:

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

For FBSHV CRM:

```env
ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
MOCK_ECOMMERCE_API="true"
```

The shared key and shared webhook secret must match across both systems even though the variable names differ.

## Search and anchor comment convention

When editing code, add short Vietnamese anchor comments with accents near important boundaries so future search is easier. Do not over-comment obvious code.

Use this exact prefix:

```ts
// NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT
// NEO: Kiểm tra tồn kho realtime trước khi tạo đơn
// NEO: Không tự trừ tồn local nếu API ngoài chưa xác nhận
// NEO: Xác thực webhook HMAC từ Web Quản Lý TMĐT
// NEO: UI mobile-first, bảng đổi thành card trên màn hình nhỏ
```

Suggested searchable anchors:

- `NEO: Product Sync`
- `NEO: Kiểm tra tồn kho`
- `NEO: Tạo đơn Facebook`
- `NEO: Webhook TMĐT`
- `NEO: Audit log`
- `NEO: Secret mapping`
- `NEO: Mobile-first`

Every new non-trivial module should include 1-3 anchors near integration seams, safety rules, or UI responsive pivots.

## UTF-8 and font hygiene workflow

After every meaningful edit to code/docs/prompts:

1. Verify files are saved as UTF-8.
2. Search for mojibake symptoms such as broken Vietnamese accents, replacement characters, or markers like `U+00C3`, `U+00C2`, and `U+FFFD`.
3. Check anchor comments still display Vietnamese accents correctly.
4. Run the bundled checker when a filesystem is available:

```bash
python /path/to/skill/scripts/check_project_hygiene.py /path/to/FBSHV-CRM
```

If the checker flags a font/encoding issue, fix the file before continuing.

## Codex prompt checklist

When writing a prompt for Codex, include these requirements:

- Only edit FBSHV CRM unless explicitly asked otherwise.
- Do not mix the separate ecommerce-management Cloudflare/repo with CRM.
- Use mock/fallback when secrets are missing.
- Never run production write tests unless `RUN_EXTERNAL_WRITE_TESTS=true`, `SKU_TEST` exists, and the SKU is a dedicated test SKU.
- Keep each file under 30 KB.
- Use Vietnamese anchor comments with accents.
- Run lint, typecheck, tests, size check, build, env check, and Cloudflare dry-run when possible.
- Report skipped production tests and missing secrets clearly in Vietnamese.

See `references/codex-output-template.md` for the preferred final report structure.

## Review workflow

For build/edit/review tasks:

1. Identify whether the task affects UI, Product Sync, webhook, secrets, database, or deployment.
2. Apply the non-negotiable boundaries above.
3. Require mobile-first UI for any frontend change.
4. Require file splitting if any file approaches 30 KB.
5. Require Vietnamese anchor comments at important seams.
6. Run or request these checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run size:check`, `npm run build`, `npm run check:env`, and `npx wrangler deploy --dry-run`.
7. Run `scripts/check_project_hygiene.py` to catch file-size, UTF-8, mojibake, and anchor-comment issues.
8. Report what passed, what was skipped, and what user must provide later.

## Codex Browser Profile / Chrome thao tác UI

Khi cần thao tác UI thật trên Meta/Facebook/Cloudflare/GitHub, Codex phải dùng **Chrome profile riêng** này thay vì profile mặc định:

```txt
E:\codex-chrome-profiles\fbshv-meta
```

Lệnh mở Chrome gợi ý trên Windows:

```powershell
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (!(Test-Path $chrome)) {
  $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}

Start-Process $chrome -ArgumentList @(
  '--user-data-dir=E:\codex-chrome-profiles\fbshv-meta',
  '--profile-directory=Default',
  '--no-first-run'
)
```

Quy tắc bắt buộc:

- Không dùng Chrome profile mặc định khi thao tác Meta/Facebook/Cloudflare/GitHub.
- Không xóa, reset, logout, clear cookies/cache của profile này.
- Không lưu thư mục Chrome profile này trong repo.
- Nếu profile không mở được hoặc chưa đăng nhập đúng tài khoản, dừng và báo:
  `NEED_USER_CHROME_PROFILE_ACCESS`.
- Khi thao tác Meta/Facebook, chỉ dùng tài khoản đã đăng nhập trong profile này.
- Không tự đổi tài khoản, không tự logout, không tự xóa app/page/business asset.

Các URL nên kiểm tra bằng profile này:

```txt
https://business.facebook.com/
https://developers.facebook.com/apps/
https://dash.cloudflare.com/
https://github.com/FacebookSHV/FBSHV-CRM
```

## Production / Account cố định

Production CRM:

```txt
https://fbshv-crm.ngchihuy.workers.dev
```

Cloudflare account bắt buộc:

```txt
3d1e8c3bd1f4f9ace7388e60dd11fbed
```

Cloudflare account cũ bị cấm dùng:

```txt
efe50fab1dd644088d681fb14a4838ae
```

Meta App ID bắt buộc:

```txt
1296077039298909
```

Domain đúng:

```txt
fbshv-crm.ngchihuy.workers.dev
```

Redirect URI đúng:

```txt
https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback
```

Trước khi deploy, Codex bắt buộc chạy:

```bash
npx wrangler whoami
```

Chỉ deploy nếu account là:

```txt
3d1e8c3bd1f4f9ace7388e60dd11fbed
```

Nếu account không đúng, dừng với:

```txt
BLOCKED_CLOUDFLARE_ACCOUNT_MISMATCH
```

Nếu token/login lỗi, dừng với:

```txt
BLOCKED_CLOUDFLARE_AUTH
```

## Cloudflare deploy hard gate - chống deploy nhầm account

Codex bắt buộc coi đây là điều kiện dừng cứng trước mọi lệnh deploy, secret put, D1 migration remote, R2 operation hoặc Cloudflare UI action.

Account được phép duy nhất:

```txt
3d1e8c3bd1f4f9ace7388e60dd11fbed
```

Account cũ tuyệt đối cấm dùng:

```txt
efe50fab1dd644088d681fb14a4838ae
```

Trước khi chạy bất kỳ lệnh Cloudflare ghi dữ liệu nào, Codex phải chạy và kiểm tra:

```bash
npx wrangler whoami
npx wrangler d1 list
npx wrangler r2 bucket list
npm run cloudflare:check
```

Chỉ được tiếp tục nếu output xác nhận đúng account:

```txt
3d1e8c3bd1f4f9ace7388e60dd11fbed
```

Nếu output có account cũ, không rõ account, token lỗi, rate limit, hoặc không parse được account id, Codex phải dừng ngay và báo một trong các mã:

```txt
BLOCKED_CLOUDFLARE_ACCOUNT_MISMATCH
BLOCKED_CLOUDFLARE_AUTH
NEED_USER_CLOUDFLARE_LOGIN
```

Các lệnh sau bị cấm nếu chưa pass hard gate:

```bash
npx wrangler deploy
npx wrangler secret put
npx wrangler d1 migrations apply --remote
npx wrangler d1 execute --remote
npx wrangler r2 bucket create
npx wrangler r2 object put
```

Nếu cần set biến môi trường trong PowerShell, chỉ set theo phiên hiện tại, không dùng `setx`:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "3d1e8c3bd1f4f9ace7388e60dd11fbed"
$env:CLOUDFLARE_API_TOKEN = "<token của account mới>"
npx wrangler whoami
```

Không bao giờ set `CLOUDFLARE_API_TOKEN` hoặc `CLOUDFLARE_ACCOUNT_ID` làm Worker runtime secret. Hai biến này chỉ dùng cho CLI local/CI.

Nếu thao tác bằng Cloudflare UI, URL phải thuộc account mới. Không thao tác ở account cũ. Nếu không xác minh được account trong UI, dừng với:

```txt
NEED_USER_CLOUDFLARE_UI_ACCOUNT_CONFIRM
```

Final report bắt buộc ghi rõ:

```txt
Cloudflare account verified: 3d1e8c3bd1f4f9ace7388e60dd11fbed
Worker: fbshv-crm
Deploy version: <version nếu có>
```

## Meta / Facebook OAuth rules

OAuth scopes nền tảng được phép dùng:

```txt
pages_show_list
pages_manage_metadata
pages_read_engagement
```

Chỉ thêm các scope sau khi task thật sự cần và phải báo user cần **Connect Facebook lại**:

```txt
pages_messaging
pages_manage_engagement
pages_manage_posts
```

Khi thêm scope mới, báo:

```txt
NEED_USER_RECONNECT_FACEBOOK
```

Không thêm các scope quảng cáo/business trong task thường:

```txt
business_management
ads_read
ads_management
```

Chỉ dùng các scope trên khi user yêu cầu riêng giai đoạn Ads và hiểu rằng có thể cần Meta review / Business permission.

## Trạng thái module cần real, không được báo DONE khi còn mock

Không báo DONE nếu production còn các lỗi/trạng thái sau:

- `/products` bị client-side exception.
- `/crm` còn text kiểu `Danh sách demo`, `Mock/fallback`, hoặc dữ liệu khách demo.
- `/automation` còn text kiểu `Danh sách demo`, `Mock/fallback`.
- `/ai-assistant` chỉ là placeholder nhưng không ghi rõ `AI chưa cấu hình`.
- `/content-planner` giả vờ AI trong khi chỉ dùng template fallback.
- Đồng bộ sản phẩm lỗi.
- Ecommerce API không trả `200` ở `/api/ecommerce/products?limit=5`.

Nếu thiếu key AI, báo rõ:

```txt
NEED_USER_AI_SECRET
```

Nếu thiếu hoặc lệch secret/key giữa CRM và Web Quản Lý TMĐT, báo rõ:

```txt
NEED_USER_ECOMMERCE_SECRET_MATCH
```

Nếu thiếu permission Meta khi gửi tin nhắn, reply/hide comment hoặc publish bài, báo rõ:

```txt
BLOCKED_META_PERMISSION_MISSING
```

## Production verification bắt buộc trước khi báo DONE

Trước khi báo DONE, Codex phải kiểm tra production thật:

```txt
/
/fanpages
/inbox
/products
/orders
/crm
/automation
/ai-assistant
/page-audit
/content-planner
/ads hoặc /facebook-ads
/privacy
/terms
/data-deletion
```

API bắt buộc kiểm:

```txt
/api/facebook/connect
/api/facebook/pages
/api/inbox/conversations
/api/comments
/api/ecommerce/products?limit=5
/api/page-audit
/api/content/posts
/api/content/calendar/suggestions
```

Facebook webhook verify phải trả HTTP 200 và body đúng challenge:

```txt
/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=<runtime_verify_token>&hub.challenge=test_ok
```

## Commit / Git hygiene bổ sung

Trước khi commit, Codex phải chạy:

```bash
git status --short
git diff --cached --name-only
```

Không stage/commit:

```txt
.env
.env.local
.env.generated.local
.env.secret-input.local
tsconfig.tsbuildinfo
profiles.json
backup_*.sql
*.backup
token files
secret files
```

Có thể commit migration schema trong:

```txt
drizzle/*.sql
drizzle/meta/_journal.json
```

nếu migration đó cần cho schema production.

## Prompt ngắn mặc định cho Codex

Khi user chỉ giao task ngắn, Codex vẫn phải đọc và tuân thủ file này. Prompt tối thiểu gợi ý:

```txt
Đọc AGENTS.md trước. Làm task hiện tại theo đúng hướng dẫn trong AGENTS.md. Nếu cần thao tác Meta/Facebook/Cloudflare/GitHub UI, dùng Chrome profile E:\codex-chrome-profiles\fbshv-meta. Không dùng profile mặc định. Không deploy nếu Cloudflare account không đúng 3d1e8c3bd1f4f9ace7388e60dd11fbed.
```
