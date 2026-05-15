# FBSHV CRM

MVP CRM Facebook cho Shop Huy Vân, xây bằng Next.js App Router, TypeScript, Tailwind, D1, Drizzle, R2 và OpenNext Cloudflare.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000/dashboard`. Khi thiếu secret thật, app dùng mock/fallback an toàn.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm run test
npm run size:check
npm run hygiene:check
npm run build
npm run build:cloudflare
npm run check:env
```

File source/docs/config phải nhỏ hơn hoặc bằng 30KB. Lệnh `hygiene:check` kiểm thêm UTF-8 và dấu hiệu lỗi font tiếng Việt.

## D1 và seed

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:migrate` và `db:seed` dùng D1 local qua Wrangler. Schema nguồn nằm trong `src/db/schema/*`, tách theo domain để dễ maintain.

## R2

Tạo bucket nếu chưa có:

```bash
npx wrangler r2 bucket create fbshv-crm-assets
```

FBSHV CRM không lưu upload/report/image vào filesystem local trong runtime.

## Deploy Cloudflare

```bash
npm run build
npm run build:cloudflare
npx wrangler deploy --dry-run
npm run deploy
```

Worker/app name: `fbshv-crm`. D1 binding là `DB`, R2 binding là `BUCKET`.

## Secret cho FBSHV CRM

Tạo key dùng chung:

```bash
npm run secrets:generate
```

Script tạo `.env.generated.local` bị gitignore và chỉ in bản mask. Set secret cho CRM:

```bash
$env:ECOMMERCE_API_KEY="..."
$env:ECOMMERCE_WEBHOOK_SECRET="..."
$env:AUTH_SECRET="..."
npm run secrets:set:crm
```

Không commit `.env`, `.env.local`, `.env.generated.local`, token hoặc API key.

## Facebook real-mode

Tạo `.env.local` từ `.env.example` hoặc dùng file khung đang có, sau đó thay toàn bộ `BLOCKED_SECRET_MISSING_*` bằng giá trị thật:

```env
MOCK_EXTERNAL_APIS=false
MOCK_ECOMMERCE_API=false
META_APP_ID=""
META_APP_SECRET=""
META_VERIFY_TOKEN=""
META_REDIRECT_URI="<CRM_APP_URL>/api/facebook/callback"
ENCRYPTION_KEY=""
```

Nếu real-mode thiếu secret hoặc thiếu D1 binding `DB`, API sẽ block rõ thay vì fallback mock.

## Secret bên Web Quản Lý TMĐT

Đây là project khác, không dùng Wrangler config của CRM để set secret cho hệ thống đó.

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

Trong CRM, hai giá trị tương ứng là:

```env
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
```

## Product Sync

FBSHV CRM chỉ cache/read model sản phẩm, SKU, giá và tồn kho. Web Quản Lý TMĐT vẫn là source of truth cho Product, SKU, Inventory và Order.

API nội bộ đã có:

- `GET /api/ecommerce/products`
- `POST /api/ecommerce/sync-products`
- `GET /api/ecommerce/products/[id]`
- `GET /api/ecommerce/products/sku/[sku]/price`
- `POST /api/ecommerce/inventory/check`
- `POST /api/ecommerce/inventory/reserve`
- `POST /api/ecommerce/inventory/reserve/[id]/cancel`
- `POST /api/ecommerce/orders/from-facebook`
- `POST /api/webhooks/ecommerce`

## SKU test an toàn

Dùng SKU riêng như `CRM_TEST_001`. Chỉ bật production write test khi đủ tất cả điều kiện:

```env
MOCK_ECOMMERCE_API=false
ECOMMERCE_API_KEY=<real_key>
ECOMMERCE_WEBHOOK_SECRET=<real_secret>
SKU_TEST=CRM_TEST_001
RUN_EXTERNAL_WRITE_TESTS=true
```

Nếu thiếu bất kỳ điều kiện nào, chỉ chạy mock/local/read-only safe tests.

## Phần đang mock

- Facebook token/page/inbox/comment.
- Telegram và Zalo integration.
- OpenAI response khi thiếu `OPENAI_API_KEY`.
- Ecommerce provider khi `MOCK_ECOMMERCE_API=true` hoặc thiếu key.
