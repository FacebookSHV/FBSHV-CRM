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

## Cập nhật Ads live-write production - 2026-06-02

### Code và deploy

- Đã thêm OAuth Ads scope `ads_management` cho intent Ads và đã reconnect Facebook bằng Chrome visible profile `E:\codex-chrome-profiles\fbshv-meta`.
- D1 connection mới có đủ scope:
  - `pages_show_list`
  - `pages_manage_metadata`
  - `pages_read_engagement`
  - `pages_messaging`
  - `pages_manage_engagement`
  - `pages_manage_posts`
  - `business_management`
  - `ads_read`
  - `ads_management`
- Đã bật secret runtime `AD_WRITE_ACTIONS_ENABLED=true` trên Worker `fbshv-crm` sau khi hard gate Cloudflare đúng account `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Deploy bản Ads live-write mới nhất: `5a32c4c9-5e50-47ef-97c3-d234859c216a`.

### Ads production verification

- Đã mở `/ads` trên production bằng Chrome visible profile thật.
- `/ads` hiển thị đúng `Write đang bật`, copy nêu rõ ghi thật cần xác nhận riêng và object mới tạo ở trạng thái tạm dừng.
- `/ads` vẫn hiển thị 3 ad account thật:
  - `act_507856080770596`
  - `act_750430830961447`
  - `act_759411594070976`
- Đã mở detail từng account bằng route `/ads/accounts/:accountId`; các tab `Campaigns`, `Ad Sets`, `Ads`, `Insights`, `Create Ad / Draft` đều click được.

### Live-write thật đã chạy

- Account live-write sample: `act_750430830961447`.
- Nút `Tạo thật tạm dừng` đã mở confirm trước khi gọi Meta Marketing API.
- Sau khi Meta trả lỗi bắt buộc `is_adset_budget_sharing_enabled`, code đã thêm tham số này và deploy lại.
- Live-write thành công, không phải dry-run:
  - `ad_actions_log.id`: `4e345426-0cac-4751-9dee-1e391694cda4`
  - `action_type`: `ads_live_create_paused`
  - `dry_run`: `0`
  - `status`: `success`
  - Campaign: `120248500979870206` - `PAUSED`
  - Ad set: `120248500980650206` - `PAUSED`
  - Ad: `120248500983870206` - `PAUSED`
  - Creative: `2804748379908272`
- Production UI sau deploy hiển thị lại:
  - Campaign row `120248500979870206 | Boost post draft | PAUSED | OUTCOME_TRAFFIC`.
  - Ad set row `120248500980650206 | Boost post draft - Nhóm quảng cáo | PAUSED | LINK_CLICKS | budget 100000`.
  - Ad row `120248500983870206 | Boost post draft - Quảng cáo | PAUSED`.

## Cập nhật Meta SDK, CAPI và UI vận hành - 2026-06-02

### Code và deploy

- Đã cài `facebook-nodejs-business-sdk@24.0.1`.
- Đã thêm status adapter `src/lib/facebook/business-sdk.ts`.
- Đã thêm Meta Pixel + CAPI server endpoint:
  - `POST /api/meta/capi/events`
  - bảng D1 `conversion_events`
  - migration `drizzle/0006_meta_capi_events.sql`
  - dedup bằng `event_id`
  - hash email/phone bằng SHA-256 trước khi gửi Meta
  - lỗi thiếu config được log `config_missing`, không fake success.
- Đã cập nhật Settings runtime để hiển thị:
  - SDK Meta chính thức đã cài.
  - Worker dùng Graph API trực tiếp do SDK Node không chạy trực tiếp trong Cloudflare Worker.
  - Pixel + CAPI đang thiếu Pixel/token nếu chưa set secret.
  - AI provider ưu tiên hiển thị `gemini` khi có key valid trong Settings DB.
- Đã làm lại UI vận hành người dùng cuối:
  - `/ads`: summary dễ đọc, card account clickable, bỏ hiển thị scope kỹ thuật.
  - `/ads/accounts/:accountId`: tab tiếng Việt, dữ liệu Meta thật, form tạo quảng cáo dễ hiểu hơn.
  - `/content-planner`: summary draft/scheduled/published/page, label trạng thái tiếng Việt.
  - `/inbox`: thêm summary CSKH và product picker thật khi tạo đơn.
  - `/settings`: thêm status SDK/CAPI/social UX.
- Latest deploy: `738f5529-bb20-49cc-8b76-a660ba132363`.

### Checks đã chạy và pass

- `npm run secrets:check`
- `npm run check:env`
- `npm run hygiene:check`
- `npm run size:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run build:cloudflare`
- `npm run cloudflare:check`
- D1 migration remote `0006_meta_capi_events.sql` đã apply vào `fbshv_crm_db`.

### Production verification bằng Chrome visible profile

- Chrome profile đã dùng: `E:\codex-chrome-profiles\fbshv-meta`.
- `/ads`:
  - 3 account thật đều click được:
    - `act_507856080770596`
    - `act_750430830961447`
    - `act_759411594070976`
  - Không còn card scope kỹ thuật.
- `/ads/accounts/act_750430830961447`:
  - Click tab `Chiến dịch`: tải 2 dòng Meta thật.
  - Click tab `Nhóm quảng cáo`: tải 2 dòng Meta thật.
  - Click tab `Mẫu quảng cáo`: tải 2 dòng Meta thật.
  - Click tab `Báo cáo`: trả empty state thật trong khoảng hiện tại.
  - Click tab `Tạo quảng cáo`: có Fanpage, mục tiêu, lịch chạy, product picker thật, nút draft.
- `/content-planner`:
  - Mobile/tablet/desktop không tràn ngang.
  - Product picker hiện SKU thật từ D1 cache, ví dụ `1_BO_CS_300W_K268`.
- `/inbox`:
  - Mobile/tablet/desktop không tràn ngang.
  - Có product picker thật, không còn default SKU hard-coded.
- `/settings`:
  - Mobile/desktop không tràn ngang.
  - AI provider hiển thị `gemini`.
  - Gemini keys chỉ masked:
    - `GEMINI_API_KEY_1`: `AIzaSy...C9yA`, `valid`.
    - `GEMINI_API_KEY_2`: `AIzaSy...b4wI`, `valid`.
    - `GEMINI_API_KEY_3`: `AIzaSy...UvOk`, `permission_denied`.
  - Pixel + CAPI hiển thị cần cấu hình Pixel/token.
- `POST /api/meta/capi/events`:
  - Production trả `400` với code `META_CAPI_CONFIG_MISSING`.
  - D1 `conversion_events` ghi `status=config_missing`, lỗi sanitize `Thiếu Pixel ID hoặc CAPI access token.`

### Pixel + CAPI đã cấu hình tiếp sau khi user yêu cầu làm nốt

- Sau khi kiểm `.env.local`, `profiles.local.json` và `wrangler secret list`, ban đầu chưa có `META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN`.
- Đã dùng encrypted Meta connection token trong D1, giải mã local bằng `ENCRYPTION_KEY` mà không in token ra output.
- Đã gọi Graph API `/adspixels` cho 3 ad account thật:
  - `act_507856080770596`: truy cập được, không có pixel trả về.
  - `act_750430830961447`: Meta trả `403`, owner chưa grant `ads_management` hoặc `ads_read` cho pixel query.
  - `act_759411594070976`: trả Pixel thật `635875943626253` - `Pixel Shop Huy Vân`.
- Đã test trực tiếp Meta CAPI bằng token hiện có:
  - Pixel `635875943626253`.
  - Kết quả `events_received=1`.
- Đã set Cloudflare Worker secrets trên account đúng `3d1e8c3bd1f4f9ace7388e60dd11fbed`:
  - `META_PIXEL_ID`
  - `META_CAPI_ACCESS_TOKEN`
  - Không in giá trị token.
- Production `/api/settings/runtime` hiện trả:
  - `conversions.configured=true`
  - `pixelConfigured=true`
  - `accessTokenConfigured=true`
  - `mode=ready`
- Production `POST /api/meta/capi/events` đã trả HTTP `200`:
  - `status=sent`
  - `eventsReceived=1`
- D1 `conversion_events` đã ghi:
  - `event_name=PageView`
  - `status=sent`
  - `response_json={"eventsReceived":1,"messages":[]}`

### Lưu ý còn lại

- `META_TEST_EVENT_CODE` chưa cấu hình, chỉ cần nếu muốn xem event trong tab Test Events của Meta Events Manager.
- `META_CAPI_ACCESS_TOKEN` đang lấy từ token kết nối Meta active đã mã hóa trong CRM D1. Nếu reconnect/rotate Facebook token sau này, cần cập nhật lại secret này.

## Cập nhật automation live-write - 2026-06-02

- User yêu cầu xử lý tiếp tới khi live-write.
- Đã kiểm scopes active trong D1:
  - `pages_messaging`
  - `pages_manage_engagement`
  - `pages_manage_posts`
  - `business_management`
  - `ads_read`
  - `ads_management`
- Đã bật Cloudflare Worker secrets trên account đúng `3d1e8c3bd1f4f9ace7388e60dd11fbed`:
  - `AUTO_REPLY_MESSAGES_ENABLED=true`
  - `AUTO_REPLY_COMMENTS_ENABLED=true`
  - `AUTO_HIDE_PHONE_COMMENTS_ENABLED=true`
- Phát hiện bug: `src/lib/facebook/automation.ts` chỉ đọc `process.env`, nên Cloudflare secrets mới vẫn hiện `false` trong runtime.
- Đã sửa:
  - `getFacebookAutomationConfigAsync()` đọc từng automation key từ `getCloudflareContext({ async: true }).env`.
  - `runFacebookAutomation()` dùng async config để webhook thật thấy đúng flag.
  - `/settings` runtime thêm `automation`.
  - Settings UI thêm card `Tự động Facebook`.
- Deploy mới nhất: `f8886f2a-6e08-44bb-b3ad-5319abb5dd71`.
- Production `/api/settings/runtime` sau deploy:
  - `messageReplyEnabled=true`
  - `commentReplyEnabled=true`
  - `phoneHideEnabled=true`
- Chrome visible profile đã mở `/settings`, mobile/desktop không tràn ngang, UI hiển thị:
  - `Auto reply Messenger: live-write đang bật`
  - `Auto reply comment: live-write đang bật`
  - `Tự ẩn số điện thoại: live-write đang bật`

Lưu ý: không gửi tin nhắn/ẩn bình luận thủ công vào khách thật trong lượt này. Từ thời điểm flag bật, các automation sẽ ghi thật khi Facebook webhook thật đến.

### Draft nội bộ và product picker

- Product picker trong form Ads đã lấy sản phẩm thật từ D1:
  - SKU `1_BO_CS_300W_K268`
  - Giá `158.000 ₫`
  - Tồn `136`
- Đã click chọn sản phẩm, UI đổi sang `Sản phẩm: 1_BO_CS_300W_K268`.
- Đã tạo draft nội bộ an toàn qua UI production:
  - Draft id `104de4bf-8e95-4b3e-962d-0a2d29c3a25e`
  - `ad_account_id`: `act_750430830961447`
  - `status`: `draft`
  - `productSku`: `1_BO_CS_300W_K268`

### Trạng thái còn lưu ý

- Insights trả 0 dòng ở một số account/range; đây là kết quả API thực, không render mock.
- Ad live-write mới đang `PAUSED`, `effective_status` có thể chờ Meta review khi kiểm sâu trong Ads Manager. Không tự bật ACTIVE nếu user chưa xác nhận rõ.
- Không tạo thêm live-write trùng sau deploy cuối; chỉ xác nhận object PAUSED đã tồn tại và tạo thêm draft nội bộ.
