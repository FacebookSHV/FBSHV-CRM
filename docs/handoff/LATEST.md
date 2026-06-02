# FBSHV CRM - Handoff Log

Ngày cập nhật: 2026-06-02

## Mục tiêu đang xử lý

Tiếp tục hoàn thiện production thật cho FBSHV CRM, trọng tâm hiện tại:

- Products phải sync từ ecommerce API thật, lưu bền và còn sau F5.
- Content Planner phải dùng sản phẩm thật, edit/schedule/delete/publish có phản hồi rõ và lưu bền.
- AI Settings/AI Assistant phải test key rõ trạng thái, không in full key.
- Ads/Fanpage đã có nền tảng thật, tiếp tục không dùng mock/demo.

## Trạng thái trước lượt này

- Đã đọc `AGENTS.md`.
- Các docs bắt buộc trong `AGENTS.md` chưa có trong repo tại thời điểm kiểm:
  - `docs/PROJECT-CURRENT-STATE.md`
  - `docs/warehouse-core-map.md`
  - `docs/core-data-map.md`
- Worktree có sẵn thay đổi ngoài scope, chưa đụng:
  - `D FBSHV-CRM_clean_20260515_1928.zip`
  - `M tsconfig.tsbuildinfo`
- Commit đã có trước đó cho Ads/Fanpage: `9a5d518` (`fix: connect real facebook ads and fanpages`).
- Deployment đã có trước đó: `481cd32d-d66c-4a19-b75d-252c04c2788c`.

## Việc đã sửa trong lượt này

### Content Planner publish mode

Vấn đề phát hiện:

- Production UI hiển thị cố định `Dry-run khi chưa bật publish thật`.
- API publish thực tế có thể đang chạy publish thật khi `AUTO_PUBLISH_POSTS_ENABLED=true`.
- Sau khi edit/schedule/delete/publish, thông báo kết quả bị `loadPlanner()` ghi đè thành trạng thái chung.

File đã sửa:

- `src/lib/content-publishing.ts`
  - Thêm `isAutoPublishPostsEnabled()`.
  - `createPublishJobs()` dùng helper này để xác định `dryRun`.
- `src/app/api/content/posts/route.ts`
  - `GET /api/content/posts` trả thêm `publishSettings.autoPublishEnabled`.
- `src/components/facebook/content-planner-types.ts`
  - Thêm type `PublishSettings`.
- `src/components/facebook/content-planner-content.tsx`
  - UI đọc `publishSettings`.
  - Nếu publish thật đang bật, hiển thị `Publish thật đang bật`.
  - Khi bấm paper-plane và publish thật đang bật, hiện browser confirm trước khi gọi API Facebook.
  - Nếu hủy confirm, báo `Đã huỷ publish thật trước khi gọi Facebook API.`
  - Các action edit/schedule/delete/publish giữ lại thông báo kết quả sau khi reload danh sách.
  - Chặn tạo scheduled post nếu chưa chọn datetime.
- `tests/growth-modules.test.ts`
  - Thêm test `GET /api/content/posts` trả đúng publish setting.
  - Reset `AUTO_PUBLISH_POSTS_ENABLED=false` trong `beforeEach`.

### Products realtime price check

Vấn đề phát hiện khi test production:

- `/products` sync được 200 sản phẩm và cache đúng giá `158.000 ₫`.
- Nút `Kiểm giá` lại hiển thị `0 ₫`.
- API production `/api/ecommerce/products/sku/1_BO_CS_300W_K268/price` trả dữ liệu thật có `currentPrice: 158000`, không có field `price`.

File đã sửa:

- `src/lib/ecommerce/http-provider.ts`
  - Normalize `price ?? currentPrice ?? salePrice ?? originalPrice`.
  - Trả `{ sku, price, currency }` chuẩn cho UI.
- `tests/ecommerce-provider.test.ts`
  - Thêm test HTTP provider normalize `currentPrice` từ Web TMĐT thành `price`.

## Checks đã chạy và pass

- `npm run test -- tests/growth-modules.test.ts`
- `npm run test -- tests/ecommerce-provider.test.ts`
- `npm run test -- tests/ecommerce-provider.test.ts tests/ecommerce-price-normalization.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run size:check`
- `npm run hygiene:check`
- `npm run secrets:check`
- `npm run check:env`
- `npm run test`
- `npm run build`
- `git diff --check`
- Hook bridge:
  - `before-edit`
  - `after-edit`

## Deploy và production verification đã xong trong lượt này

- Cloudflare account verified: `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Worker: `fbshv-crm`.
- Deploy lần 1 cho Content Planner: `45acf794-3ad6-4fac-ad63-fd4beb0cc337`.
- Deploy lần 2 cho Products price normalization: `8d570c34-cb4b-4b2d-8b3d-f267425172ae`.
- Chrome visible profile đã dùng: `E:\codex-chrome-profiles\fbshv-meta`.

### Products production

- `/products` đã bấm `Đồng bộ`.
- Sync result: `Đã đồng bộ 200 sản phẩm từ Web TMĐT và upsert vào D1`.
- Sau F5 vẫn còn SKU `1_BO_CS_300W_K268` và `synced_count: 200`.
- Search theo SKU `1_BO_CS_300W_K268` hoạt động, chỉ còn sản phẩm khớp.
- `Kiểm tồn` trả `SKU 1_BO_CS_300W_K268 còn 136, đủ hàng: có`.
- `Kiểm giá` sau deploy lần 2 trả `158.000 ₫`, không còn `0 ₫`.

### Content Planner production

- `/content-planner` sau deploy hiển thị đúng `Publish thật đang bật`.
- Product picker dùng sản phẩm thật từ D1 cache.
- Đã tạo draft test bằng UI, F5 vẫn còn.
- Đã edit bằng modal, F5 vẫn còn title/caption/lịch mới.
- Đã chỉnh lịch bằng modal riêng, F5 vẫn còn `11:20:00 5/6/2026`.
- Paper-plane khi publish thật đang bật đã mở confirm browser; đã bấm hủy, UI báo không gọi Facebook API.
- Delete modal có câu `Bạn có chắc muốn xoá bài này không?`.
- Bấm `Huỷ` không xóa bài; bấm `Xác nhận xoá` mới xóa; F5 không thấy bài quay lại.

### Settings / AI production

- `/settings` hiển thị runtime thật:
  - Meta mode `real`, App ID `1296077039298909`.
  - Ecommerce mode `real`.
  - Cloudflare D1/R2 có binding.
  - Ads status `ready`, 3 ad account, write đang chặn.
  - Webhook verify token configured.
- UI `Test tất cả key` hiển thị masked key, không lộ full key:
  - `GEMINI_API_KEY_1` `AIzaSy...C9yA`: `valid`.
  - `GEMINI_API_KEY_2` `AIzaSy...b4wI`: `valid`.
  - `GEMINI_API_KEY_3` `AIzaSy...UvOk`: `permission_denied`.
- `/ai-assistant` dùng product picker thật và tạo nội dung bằng Gemini thật: `AI thật: gemini (GEMINI_API_KEY_1)`.

### CRM cleanup production

- Phát hiện dirty seed row trong D1: `customer-demo`, tên `Nguyễn Minh Anh`, phone `0900000000`, note `Khách hỏi camera mini`.
- Đã xóa đúng row này khỏi bảng `customers`.
- `/crm` sau F5 còn 2 khách thật, không còn dòng demo trên.

### Route smoke after deploy

- `/ads`: không crash, có 3 ad account thật, Ads write đang chặn.
- `/crm`: không crash, không còn demo customer.
- `/automation`: không crash, rule thật từ D1.
- `/page-audit`: không crash, có audit data thật từ Page.

## Production/API đã thao tác trước khi tạo log

- Đã mở Chrome visible profile `E:\codex-chrome-profiles\fbshv-meta`.
- Đã mở production `/content-planner`.
- Đã kiểm UI có sản phẩm thật từ D1/API cache, ví dụ SKU `1_BO_CS_300W_K268`.
- Đã tạo, edit, schedule, publish và delete một bài test qua API trước khi vá UI.
- Lưu ý quan trọng: publish API đã trả `published` cho 2 page khi production đang bật publish thật. Bài test sau đó đã bị xóa khỏi Content Planner DB, nhưng cần kiểm lại trên Facebook UI nếu muốn chắc chắn bài ngoài Facebook đã được gỡ.

## Việc cần làm tiếp ngay

1. Chạy `before-final`.
2. Kiểm `git status` và `git diff --cached --name-only`.
3. Stage đúng file code/test/docs, không stage `tsconfig.tsbuildinfo` hoặc file zip đã xóa ngoài scope.
4. Commit message dự kiến: `fix: complete real products planner ai ads actions`.
5. Push bằng SSH key profile `DuAn_FBSHV_CRM` nếu default SSH bị GitHub từ chối.

## Cấm kỵ khi tiếp quản

- Không in full API key/token/secret.
- Không stage/commit:
  - `.env*`
  - `profiles.local.json`
  - `profiles.json`
  - `tsconfig.tsbuildinfo`
  - backup SQL/zip/token/secret files.
- Không dùng Cloudflare account cũ `efe50fab1dd644088d681fb14a4838ae`.
- Không bấm confirm publish thật trên production nếu không chủ động muốn đăng bài Facebook thật.
