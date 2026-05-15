# TASK_CODEX_BUILD_FBSHV_CRM_ONE_SHOT.md

Bạn là Senior Full-stack Engineer, Cloudflare Engineer, Product Engineer, UI/UX Engineer và QA Engineer.

## Mục tiêu

Build MVP SaaS **FBSHV CRM** trong repo hiện tại, tạo luôn các tính năng khung, integration, test, build và kiểm tra một lần. Nếu thiếu secret/API key/SKU thật thì dùng mock/fallback an toàn, ghi rõ phần cần user bổ sung sau. Không hỏi lại, tự quyết định hợp lý và hoàn thành tối đa.

## Repo đang làm

Chỉ làm trong repo FBSHV CRM:

```txt
Repo: git@github.com:FacebookSHV/FBSHV-CRM.git
Project path Windows: E:\FBSHV-CRM
Git name: FacebookSHV
Git email: ngchihuy@gmail.com
SSH key: id_ed25519_fbshv
```

## Tách rõ 2 website

Có 2 website/GitHub/Cloudflare khác nhau:

### Website A - Web Quản Lý TMĐT

- Là hệ thống riêng đã có.
- Source of truth cho Product, SKU, Inventory, Order.
- Base API production: `https://huyvan-worker-api.nghiemchihuy.workers.dev`
- Không sửa repo này, không deploy repo này, không migrate D1 của repo này.
- Chỉ ghi hướng dẫn user tự set secret bên hệ thống này.

Secret bên Web Quản Lý TMĐT:

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

### Website B - FBSHV CRM

- Đây là repo đang làm.
- Chỉ cache sản phẩm/tồn kho, không tự quản lý tồn kho gốc.
- Gọi Web Quản Lý TMĐT qua API/webhook.

Secret bên FBSHV CRM:

```env
ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
MOCK_ECOMMERCE_API="true"
```

`ECOMMERCE_API_KEY` phải cùng giá trị với `API_KEY_FOR_FACEBOOK_CRM`.
`ECOMMERCE_WEBHOOK_SECRET` phải cùng giá trị với `WEBHOOK_SECRET_FOR_FACEBOOK_CRM`.

## Cloudflare CRM

```txt
App/Worker name: fbshv-crm
Deploy target: Cloudflare Workers + OpenNext for Cloudflare
Node version: 20
Package manager: npm
D1 binding: DB
D1 database name: fbshv_crm_db
D1 database id: 218d0eab-7734-4fda-91b9-e3e2604e6c86
R2 binding: BUCKET
R2 bucket: fbshv-crm-assets
```

Không hard-code Cloudflare token. Đọc `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_API_TOKEN` từ environment nếu cần. Không in secret ra log.

## Stack bắt buộc

- Next.js App Router
- TypeScript
- Tailwind CSS
- Cloudflare Workers hoặc Pages, ưu tiên Workers
- OpenNext for Cloudflare nếu dùng Next.js
- Cloudflare D1
- Drizzle ORM
- Cloudflare R2
- Zod validation
- Recharts
- Không dùng PostgreSQL
- Không dùng Prisma nếu không cần
- Không lưu upload/report/image vào local filesystem
- File storage dùng R2 adapter hoặc mock R2 local

## Quy tắc maintain file <= 30KB

Bắt buộc:
- Mỗi file source/docs/config mới hoặc sửa đáng kể không quá 30KB.
- Nếu một file có nguy cơ vượt 30KB, tách thành nhiều file nhỏ theo module.
- Không tạo component/page/API/schema khổng lồ.
- UI component tách theo thư mục `components/*`.
- Business logic tách vào `lib/*` hoặc `server/*`.
- DB schema có thể tách theo domain nếu cần.
- README dài thì tách thêm `docs/*.md`.
- Báo cáo cuối nêu file nào có kích thước gần giới hạn.

## UI/UX bắt buộc

- Mobile-first responsive.
- Tương thích mobile, tablet, laptop, desktop.
- Sidebar desktop cố định; mobile dùng drawer/bottom navigation hoặc collapsible menu.
- Header gọn, có workspace và user demo.
- Bảng trên mobile phải dùng card/list responsive, không ép tràn ngang.
- Form, filter, button, modal phải dễ dùng trên màn hình nhỏ.
- Tailwind utility rõ ràng.
- Giao diện tiếng Việt.
- Màu chủ đạo hiện đại, dễ nhìn.
- Có loading/empty/error state cơ bản.

## Module MVP cần có route/page

Tạo khung route hoạt động, có UI demo/seed/mock:

1. Tổng quan `/dashboard`
2. Fanpage `/fanpages`
3. Inbox/Comment `/inbox`
4. CRM `/crm`
5. Đơn hàng `/orders`
6. Sản phẩm đồng bộ `/products`
7. Chi tiết sản phẩm `/products/[id]`
8. Facebook Ads `/ads`
9. Automation `/automation`
10. AI Assistant `/ai-assistant`
11. Báo cáo `/reports`
12. Cài đặt `/settings`
13. Audit Log `/audit-logs`

Sidebar tiếng Việt:
- Tổng quan
- Fanpage
- Inbox/Comment
- CRM
- Đơn hàng
- Sản phẩm đồng bộ
- Facebook Ads
- Automation
- AI Assistant
- Báo cáo
- Cài đặt
- Audit Log

## Database schema ban đầu

Tạo Drizzle schema/migration cho D1. Nếu quá dài, tách file schema theo domain.

Bảng cần có:

- users
- workspaces
- workspace_members
- pages
- conversations
- messages
- comments
- customers
- customer_tags
- customer_interactions
- orders
- order_items
- product_cache
- inventory_cache
- external_order_references
- inventory_reservation_references
- product_sync_logs
- ecommerce_webhook_events
- ad_accounts
- campaigns
- ad_sets
- ads
- ad_metric_daily
- automation_rules
- automation_actions
- ai_generations
- reports
- audit_logs
- integrations
- webhook_events

Seed data demo tiếng Việt cho workspace, user, fanpage, khách hàng, hội thoại, đơn hàng, sản phẩm mock, ads metrics, automation, audit logs.

## Product Sync nguyên tắc

Không xây module quản lý sàn TMĐT. FBSHV CRM chỉ cache/read model.

Product cache phải hiển thị:
- Tên sản phẩm
- SKU
- Giá vốn
- Giá gốc
- Giá KM
- Giá hiện tại
- Tồn kho
- Tồn khả dụng
- Tồn giữ hàng
- Trạng thái
- Nút đồng bộ
- Nút kiểm tra giá SKU
- Nút kiểm tra tồn realtime

ProductCache fields tối thiểu:
- id
- workspaceId
- externalProductId
- sku
- name
- category
- costPrice
- originalPrice
- salePrice
- currentPrice
- discountAmount
- discountPercent
- currency
- imageUrl
- description
- status
- priceUpdatedAt
- syncedAt

InventoryCache fields tối thiểu:
- id
- workspaceId
- sku
- stock
- availableStock
- reservedStock
- lowStockThreshold
- syncedAt

Các bảng sync/ref/log:
- ExternalOrderReference
- InventoryReservationReference
- ProductSyncLog
- EcommerceWebhookEvent

## EcommerceManagementProvider

Tạo adapter/interface + mock provider + real HTTP provider:

- getProducts(params)
- getProductById(productId)
- getProductBySku(sku)
- getSkuPrice(sku)
- checkInventory(sku, quantity)
- reserveInventory(sku, quantity, metadata)
- cancelReservation(reservationId)
- createOrderFromFacebook(payload)
- getOrder(orderId)
- syncProducts()
- handleWebhookEvent(event)

Real provider:
- Base URL: `ECOMMERCE_API_BASE_URL`
- Auth: `Authorization: Bearer ECOMMERCE_API_KEY` hoặc `X-API-Key`
- Không đưa key vào query string
- Không log key
- Response chuẩn `success/data/error`

Mock provider:
- Có SKU `CRM_TEST_001`
- Tên: `Sản phẩm test CRM`
- Stock: `100`
- Price: `10000`
- Dùng khi `MOCK_ECOMMERCE_API=true` hoặc thiếu key.

## API routes nội bộ

Tạo route handlers:

- `GET /api/ecommerce/products`
- `POST /api/ecommerce/sync-products`
- `GET /api/ecommerce/products/[id]`
- `GET /api/ecommerce/products/sku/[sku]/price`
- `POST /api/ecommerce/inventory/check`
- `POST /api/ecommerce/inventory/reserve`
- `POST /api/ecommerce/inventory/reserve/[id]/cancel`
- `POST /api/ecommerce/orders/from-facebook`
- `POST /api/webhooks/ecommerce`

Dùng Zod validate input/output. Action quan trọng ghi audit log nếu có DB.

## Webhook ecommerce

Xử lý event:

- product.created
- product.updated
- product.price_updated
- product.inactive
- inventory.updated
- inventory.low_stock
- order.created
- order.status_changed
- order.cancelled
- order.completed
- order.returned

Verify HMAC:
- Header: `X-Webhook-Signature`
- Format: `sha256=<hmac_signature>`
- HMAC_SHA256(`ECOMMERCE_WEBHOOK_SECRET`, rawBody)
- Dùng timingSafeEqual
- Sai signature trả lỗi
- Log vào `ecommerce_webhook_events`

## Orders từ hội thoại

Tạo UI/API khung:
- Chọn khách hàng/hội thoại
- Chọn sản phẩm từ ProductCache
- Gọi checkInventory trước
- Nếu đủ hàng thì gọi reserveInventory hoặc createOrderFromFacebook
- Không tự trừ tồn local nếu external API chưa phản hồi thành công
- Nếu thiếu API thật thì dùng mock và ghi rõ trong UI/dev docs

## AI Assistant

Tạo khung UI:
- Chọn sản phẩm từ ProductCache
- Tạo caption ads, nội dung tư vấn, kịch bản inbox
- Nếu thiếu OPENAI_API_KEY thì dùng mock response tiếng Việt
- Không fail build vì thiếu OPENAI_API_KEY

## Facebook/Telegram/Zalo

Tạo integration settings UI + env placeholders.
Nếu thiếu token, dùng mock state, không fail build.

## Env

Tạo `.env.example`:

```env
APP_URL="http://localhost:3000"
APP_ENV="development"
AUTH_SECRET="replace_me"

OPENAI_API_KEY=""

META_APP_ID=""
META_APP_SECRET=""
META_ACCESS_TOKEN=""
META_VERIFY_TOKEN=""

TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

ZALO_APP_ID=""
ZALO_APP_SECRET=""
ZALO_OA_ACCESS_TOKEN=""

ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY="replace_with_API_KEY_FOR_FACEBOOK_CRM_from_ecommerce_site"
ECOMMERCE_WEBHOOK_SECRET="replace_with_WEBHOOK_SECRET_FOR_FACEBOOK_CRM_from_ecommerce_site"
MOCK_ECOMMERCE_API="true"
SKU_TEST="CRM_TEST_001"

MOCK_EXTERNAL_APIS="true"

CLOUDFLARE_ACCOUNT_ID="replace_me"
CLOUDFLARE_API_TOKEN="do_not_commit_real_token"
```

Cập nhật `.gitignore`:
- `.env`
- `.env.local`
- `.env.*.local`
- `.env.generated.local`

## Scripts cần có

Trong `package.json` đảm bảo có:

- dev
- build
- deploy
- lint
- typecheck
- test
- db:generate
- db:migrate
- db:seed
- secrets:generate
- secrets:set:crm
- check:env
- size:check

Tạo script:
- `scripts/generate-ecommerce-shared-secrets.mjs`
- `scripts/set-crm-cloudflare-secrets.mjs` hoặc `.sh`
- `scripts/check-env.mjs`
- `scripts/check-file-sizes.mjs`

`check-file-sizes` phải fail nếu file source/docs mới quá 30KB, bỏ qua node_modules, .next, .open-next, dist, build, .git, package-lock.json.

## Wrangler/OpenNext

Kiểm tra/tạo:
- `wrangler.toml` hoặc `wrangler.jsonc`
- OpenNext config nếu cần
- D1 binding DB
- R2 binding BUCKET
- `nodejs_compat` nếu cần
- deploy script dùng OpenNext Cloudflare phù hợp

Nếu R2 bucket chưa tồn tại, README ghi:
`npx wrangler r2 bucket create fbshv-crm-assets`

## Tests

Tạo test nhẹ nhưng có giá trị:

1. Env check local mock pass
2. Secret generator pass
3. Mock provider getProducts pass
4. getSkuPrice pass
5. checkInventory đủ hàng pass
6. checkInventory hết hàng pass
7. reserve/cancel mock pass
8. createOrderFromFacebook mock pass
9. webhook HMAC đúng pass
10. webhook HMAC sai reject
11. local inventory không tự trừ nếu external fail
12. production write test skip nếu thiếu SKU_TEST hoặc RUN_EXTERNAL_WRITE_TESTS không true
13. file size check pass

Nếu project chưa có test framework, dùng Vitest.

## Production safety

Không chạy write test thật trừ khi đủ tất cả:
- `MOCK_ECOMMERCE_API=false`
- `ECOMMERCE_API_KEY` có thật
- `ECOMMERCE_WEBHOOK_SECRET` có thật
- `SKU_TEST` có thật và là SKU test riêng
- `RUN_EXTERNAL_WRITE_TESTS=true`

Nếu không đủ, chỉ chạy mock/local/read-only safe tests.

## README và docs

Cập nhật README tiếng Việt:
- Cách chạy local
- Cách migrate/seed D1
- Cách tạo R2
- Cách deploy Cloudflare
- Cách set secret cho FBSHV CRM
- Cách set secret bên Web Quản Lý TMĐT, nhấn mạnh đó là project khác
- Cách tạo SKU test an toàn
- Cách chạy mock tests
- Cách bật production write tests an toàn
- Phần nào đang mock

Tạo/cập nhật `AGENTS.md`:
- Chỉ sửa FBSHV CRM
- Không sửa Web Quản Lý TMĐT
- Không hard-code secret
- File <=30KB
- Mobile-first
- Không tự trừ tồn local

## Chạy kiểm tra

Sau khi code xong, tự chạy và tự sửa lỗi đến khi pass tối đa:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run size:check
npm run build
npm run check:env
npm run db:generate
npm run db:migrate
npm run db:seed
npx wrangler deploy --dry-run
```

Nếu db migrate/seed không chạy được vì thiếu local D1 hoặc Cloudflare quyền, báo rõ và không fail toàn bộ nếu build/test chính pass.

## Commit

Nếu mọi thứ ổn, tạo commit với message:

```txt
feat: scaffold FBSHV CRM MVP with ecommerce sync
```

Không commit secret/local env.

## Báo cáo cuối bằng tiếng Việt

Báo cáo:

1. Đã tạo/sửa file nào
2. Cấu trúc project
3. UI mobile-first đã làm gì
4. File size <=30KB đã kiểm tra thế nào
5. DB schema/migration/seed đã tạo gì
6. Product Sync/API/webhook đã tạo gì
7. Secret mapping giữa 2 website
8. Cách chạy local
9. Cách set secret CRM
10. Cách set secret Web Quản Lý TMĐT, không chạy nhầm Cloudflare
11. Cách tạo SKU_TEST
12. Lệnh đã chạy và kết quả
13. Phần nào đang mock
14. Phần nào cần user bổ sung sau
15. Production write tests skip/chạy, lý do
16. Commit hash nếu đã commit

## Ràng buộc cuối

- Không hỏi lại nếu thiếu thông tin; dùng mock/fallback và ghi rõ.
- Không phá code hiện có.
- Không commit secret.
- Không in secret.
- Không trộn 2 Cloudflare project.
- Không sửa Web Quản Lý TMĐT.
- Không tạo/trừ tồn thật nếu chưa có SKU test riêng.
- Mỗi file source/docs/config phải <=30KB.
- UI phải mobile-first và responsive toàn bộ thiết bị.
