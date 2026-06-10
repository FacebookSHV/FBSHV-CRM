# Core Integration Patch Plan

Nguồn chi tiết: `docs/CORE-INTEGRATION-MAP-PATCH-PLAN-V2.md`. File này là bản triển khai ngắn để tránh mơ hồ khi agent tiếp quản.

## Sprint 1 — Safety Backbone

1. Runtime guard
   - `src/lib/core-flow/runtime-guards.ts`
   - Chặn mock production, thiếu secret, thiếu D1/R2 binding.
   - Route health: `/api/settings/runtime/health`.

2. External Core client
   - `src/lib/core-flow/external-core-client.ts`
   - Timeout 3.5s, retry 1 lần, circuit breaker, lỗi chuẩn `CORE_UNAVAILABLE`.

3. Integration events/jobs/audit
   - Đã thêm `integration_events`, `integration_jobs`, `core_action_audit_logs`.
   - Đã có store helper và job claim atomic bằng `UPDATE ... RETURNING`.
   - Đã có cron processor mỗi phút, recovery job hết khóa, max retry, retry/cancel cùng-origin.
   - Đã có UI `/settings/integration-jobs`.

4. Facebook webhook hardening
   - Request path: verify signature, save raw, dedup, enqueue, return 200.
   - Async path: normalize message/comment, trigger automation, mark processed.
   - Đã có test quick-ack trước khi processor ghi message/comment.

## Sprint 2 — Commerce Core

- Product picker đang dùng External Product API, giữ đủ ảnh/promptAssets/variants.
- `createFacebookOrderThroughCore` gọi giá, inventory, reservation và Order Core theo thứ tự.
- Chỉ ghi `orders`, `order_items`, external mapping và reservation mapping sau external OK.
- External fail không ghi local và hủy reservation best-effort.
- Webhook TMĐT đã đổi đúng chiều: verify HMAC, save raw, enqueue, quick-ack.
- Job `sync_order_status_to_crm` cập nhật CRM read-model sau cron.

## Sprint 3 — Chat + ImageFlow

- Chat Worker bridge có HMAC shared secret.
- AI inbox `suggest_only`.
- ImageFlow dependency gate phải pass trước khi mở thêm integration.
- Content/Landing/Ads chỉ dùng ImageFlow asset đã approved.

## Sprint 4 — Growth Layer

- Pixel/CAPI dedup `event_id`.
- Ads draft từ product/landing/approved asset/caption.
- Live-write có confirm, readback verify và audit log.

## Trạng thái hiện tại

- Phase 0 docs đã có bản canonical ngắn.
- Phase 1 runtime guard + health API + external core client đã được thêm.
- Sprint 1 đã hoàn tất ở local: schema/store, atomic claim, cron processor, recovery/max retry, health UI, jobs UI, Facebook webhook async.
- Sprint 2 lõi đã hoàn tất ở local: Order Core contract, read-model persistence, webhook order status.
- Còn mở trước production: migrate `0009`, deploy đúng Cloudflare account, smoke webhook/jobs/order bằng SKU test riêng, kiểm UI mobile/tablet/desktop.
