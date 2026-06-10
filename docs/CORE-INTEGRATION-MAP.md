# Core Integration Map

Facebook CRM là Facebook Growth Console của ShopHuyVan. CRM chỉ vận hành Facebook, landing, Pixel/CAPI, Ads draft và ImageFlow jobs; dữ liệu gốc vẫn thuộc Web TMĐT/Core.

## Ownership

| Dữ liệu | Owner ghi chính | CRM được làm | CRM không được làm |
|---|---|---|---|
| Product/SKU/ảnh gốc | Web TMĐT Product Core | Đọc External API, cache read-model | Sửa sản phẩm gốc |
| Tồn kho/giá vốn | Warehouse/Finance Core | Check/reserve/create order qua API | Tự trừ tồn hoặc tự tính giá vốn |
| Đơn hàng | Order Core | Tạo yêu cầu đơn Facebook, lưu mapping | Ghi đơn thành công nếu Core chưa xác nhận |
| Facebook page/token/webhook | Facebook CRM | Ghi chính | Để tool khác ghi trực tiếp |
| Inbox/comment | Facebook CRM + Chat Core | Nhận webhook, đồng bộ Chat Core | Bỏ qua verify chữ ký |
| Ảnh/video AI | ImageFlow local + CRM R2 | Tạo job, nhận asset, QA | Gọi Chrome local trực tiếp |
| Landing/Ads/CAPI | Facebook CRM | Draft, tracking, preview, log | Tự ACTIVE ads hoặc dùng asset chưa approved |

## Flow chuẩn

```txt
Marketplace / API / Import / Browser helper
→ ShopHuyVan Core
→ Facebook CRM qua API/Webhook/HMAC
→ ImageFlow local qua job queue
→ R2 asset + QA
→ Content Planner / Landing / Ads Draft
```

## Guard cứng

- Production không được chạy mock/fallback giả.
- Mọi order Facebook phải gọi Web TMĐT Core trước khi ghi thành công.
- Webhook phải verify, save raw, enqueue job và trả 200 nhanh.
- Integration job phải claim atomic, không assume Worker chạy dài.
- Chat AI mặc định `suggest_only`.
- Ads live-write phải preview, admin confirm, write, readback, log; không tự ACTIVE.
- ImageFlow chỉ qua `imageflow_jobs`; asset mới phải qua QA trước khi dùng public.
