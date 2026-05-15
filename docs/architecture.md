# Kiến trúc FBSHV CRM

## Ranh giới hệ thống

FBSHV CRM và Web Quản Lý TMĐT là hai website, hai repo và hai Cloudflare project khác nhau. CRM chỉ gọi API/webhook của Web Quản Lý TMĐT, không tự quản lý tồn kho gốc.

## Core data

- `src/db/schema/products.ts`: cache sản phẩm, tồn kho, log sync và webhook ecommerce.
- `src/db/schema/orders.ts`: đơn CRM, order item và mapping sang đơn ngoài.
- `src/lib/ecommerce/*`: interface provider, mock provider và HTTP provider.
- `src/lib/webhooks/ecommerce.ts`: ký và xác thực HMAC webhook.

## Quy tắc tồn kho

// NEO: Không tự trừ tồn local nếu API ngoài chưa xác nhận

CRM có thể hiển thị cache tồn kho, nhưng khi tạo đơn phải gọi `checkInventory`, `reserveInventory` hoặc `createOrderFromFacebook` qua ecommerce provider. Chỉ khi external API trả thành công mới được ghi reference/audit tương ứng.

## UI

// NEO: UI mobile-first, bảng đổi thành card trên màn hình nhỏ

Mobile dùng card/list và bottom nav. Desktop dùng sidebar cố định và bảng khi đủ không gian.

## Facebook real flow

// NEO: Webhook Facebook chỉ xử lý real-mode khi chữ ký hợp lệ

Các module Facebook nằm trong `src/lib/facebook/*`:

- `env.ts`: đọc cấu hình `META_*`, `CRM_APP_URL`, `ENCRYPTION_KEY` và fail-fast khi real-mode thiếu secret.
- `token-crypto.ts`: mã hóa user/page access token bằng `ENCRYPTION_KEY`.
- `client.ts`: Meta Graph client thật và mock client tách riêng.
- `webhook.ts`: verify challenge, verify `x-hub-signature-256`, parse Messenger/comment event.
- `store.ts`: dùng D1 binding `DB` khi chạy Cloudflare; local/mock mới dùng memory store.
- `operations.ts`: OAuth callback, subscribe page, webhook upsert, gửi tin nhắn, trả lời/ẩn comment.

OAuth scope đang xin cho CRM gồm Page, Messenger, comment và ad account: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`, `pages_manage_engagement`, `business_management`, `ads_read`, `ads_management`. Các quyền quảng cáo cần user là admin/tester của app trong dev-mode hoặc được Meta duyệt khi đưa app ra public.

Real-mode đặt:

```env
MOCK_EXTERNAL_APIS=false
MOCK_ECOMMERCE_API=false
```

Nếu thiếu `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `CRM_APP_URL`, `ENCRYPTION_KEY`, `ECOMMERCE_API_KEY`, `ECOMMERCE_WEBHOOK_SECRET` hoặc D1 binding `DB`, API phải trả/block rõ bằng `BLOCKED_BY_MISSING_SECRET` hoặc `BLOCKED_BY_MISSING_BINDING`, không fallback mock.

## Database social

Migration `drizzle/0001_facebook_real_flow.sql` thêm:

- `facebook_connections`: lưu user token đã mã hóa.
- Mở rộng `pages`: page token đã mã hóa, token status, webhook subscription, picture, timestamps.
- Mở rộng `conversations`, `messages`, `comments`: external ids, assignment, raw payload, duplicate-safe indexes.
- `facebook_webhook_events`: lưu raw webhook, trạng thái chữ ký, processed/error để chống duplicate.
