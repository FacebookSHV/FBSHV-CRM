# FBSHV CRM — SNAPSHOT
<!--
  FILE NÀY LÀ NGUỒN SỰ THẬT DUY NHẤT.
  Codex/AI PHẢI cập nhật file này sau mỗi task. Xem "Snapshot Protocol" trong AGENTS.md.
  Không tạo file handoff mới trừ khi task > 2 ngày và cần doc riêng.
-->

**Snapshot version:** `2026-06-13`
**Trạng thái:** `core_integration_sprint1_production_verified | ecommerce_signed_webhook_readback_pass | commerce_live_write_gated | content_planner_ai_auto_publish_verified | pool_scheduler_local_needs_user`
**Production URL:** `https://fbshv-crm.ngchihuy.workers.dev`
**Latest deploy:** `c1218e9a-8ee4-4153-9ba3-0d167571a668` (Auto planner alias/caption guard fix; production run created 2 scheduled posts, local ImageFlow currently needs user)
**Cloudflare account:** `3d1e8c3bd1f4f9ace7388e60dd11fbed` ← KHÔNG ĐỔI
**Worker name:** `fbshv-crm`
**D1:** `fbshv_crm_db` · `218d0eab-7734-4fda-91b9-e3e2604e6c86`
**R2:** `fbshv-crm-assets`
**Meta App ID:** `1296077039298909`
**Redirect URI:** `https://fbshv-crm.ngchihuy.workers.dev/api/facebook/callback`

---

## 1. Feature Status

| Feature | Status | Ghi chú ngắn |
|---|---|---|
| Facebook OAuth + Pages | ✅ PRODUCTION | 3 pages, token valid, webhook on |
| Inbox / Messenger | ✅ PRODUCTION | Product picker real • UI workspace light/beige refresh local verified 2026-06-11 |
| Comment management | ✅ PRODUCTION | Reply, hide/unhide |
| Automation (auto reply + hide phone) | ✅ PRODUCTION LIVE | 3 flags đang bật |
| Product Sync từ Web TMĐT | ✅ PRODUCTION | Search SKU/name, persists F5 |
| Orders CRM | ✅ PRODUCTION | Qua ecommerce provider, không tự trừ tồn |
| Page Audit | ✅ PRODUCTION | Scores: 90 / 86 / 90 |
| Content Planner | ✅ PRODUCTION · AI ACTIONS + AUTO PUBLISH VERIFIED | Một màn hình cho sản phẩm, AI soạn bài, tạo ảnh AI qua Pool Scheduler, lịch đăng, tự động 4 bài/ngày, lộ trình Fanpage 30 ngày; xoá từng bài hoặc dọn trống chỉ tác động CRM |
| AI Settings (Gemini 1-5) | ✅ PRODUCTION | Key 1,2 valid · Key 3 permission_denied |
| AI Assistant | ✅ PRODUCTION | Gemini real, fallback template khi key lỗi |
| Facebook Ads (3 accounts) | ✅ PRODUCTION · live-write PAUSED | Không tự ACTIVE • UI workspace light/beige refresh local verified 2026-06-11 |
| Pixel + CAPI | ✅ PRODUCTION | Pixel `635875943626253`, dedup event_id |
| Landing Pages (13 templates) | ✅ PRODUCTION | AI copy, mobile-first, real data only |
| ImageFlow Bridge | ✅ BACKGROUND TRANSPORT ONLY | Không còn menu/màn vận hành riêng; route cũ redirect về Content Planner; bridge chỉ poll CRM và kiểm Pool Scheduler `/api/pool/status` trước khi claim job |
| Core Integration Guard | ✅ PRODUCTION SMOKE PASS | Runtime guard, health API/UI, External Core timeout/retry/circuit breaker; `/api/settings/runtime/health` HTTP 200 |
| Integration Events/Jobs | ✅ PRODUCTION VERIFIED | Migration `0009` remote applied, atomic claim, cron mỗi phút, recovery/max retry, retry/cancel same-origin, operator UI no overflow mobile/tablet/desktop |
| Facebook/Web TMĐT Webhooks | ✅ SIGNED WEBHOOK READBACK PASS | Web TMĐT signed `product.updated` event accepted, queued, cron processed `sync_product_to_crm` to `completed` |
| Facebook Commerce Core | ✅ DEPLOYED · WRITE TEST GATED | Check giá/tồn, reserve, tạo Order Core, chỉ persist local sau external OK; chưa chạy write test vì cần `RUN_EXTERNAL_WRITE_TESTS=true` + SKU test riêng |
| Auto Publish Posts | ✅ PRODUCTION ON | `AUTO_PUBLISH_POSTS_ENABLED=true`; publish job chỉ đăng khi ảnh đã sẵn sàng |
| A/B Landing Variants | 🔧 SCHEMA ONLY | Chưa có traffic split UI |
| CRM Khách hàng | 📋 PLANNED | — |
| Ads Intelligence Dashboard | 📋 PLANNED | Cần Meta App Review |

---

## 2. Cấu trúc file chính

```
FBSHV-CRM/
├── AGENTS.md                            ← ĐỌC TRƯỚC KHI LÀM BẤT CỨ THỨ GÌ
├── src/
│   ├── app/
│   │   ├── (shell)/                     # Layout CRM có sidebar/nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── fanpages/page.tsx
│   │   │   ├── inbox/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── crm/page.tsx
│   │   │   ├── automation/page.tsx
│   │   │   ├── ai-assistant/page.tsx
│   │   │   ├── page-audit/page.tsx
│   │   │   ├── content-planner/page.tsx
│   │   │   ├── landing-pages/page.tsx
│   │   │   ├── imageflow-bridge/page.tsx
│   │   │   ├── ads/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── lp/[slug]/                   # Public landing page (không shell)
│   │   ├── api/
│   │   │   ├── facebook/                # OAuth, pages, callback, disconnect
│   │   │   ├── webhooks/facebook/       # Verify + events
│   │   │   ├── inbox/                   # Conversations, messages
│   │   │   ├── comments/                # List + actions
│   │   │   ├── ecommerce/               # Sync từ Web TMĐT
│   │   │   ├── orders/
│   │   │   ├── content/                 # Posts, generate, calendar
│   │   │   ├── page-audit/
│   │   │   ├── landing-pages/
│   │   │   ├── imageflow/               # Jobs, assets, upload bridge
│   │   │   ├── ads/                     # Meta Ads API
│   │   │   ├── meta/capi/events/        # Server-side CAPI
│   │   │   └── settings/runtime/
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── data-deletion/page.tsx
│   ├── components/
│   │   ├── facebook/                    # Inbox, automation, page-audit, content-planner
│   │   ├── landing-pages/public/        # Commerce top, sections, proof UI
│   │   ├── imageflow/
│   │   ├── settings/
│   │   └── shell/nav-items.ts
│   ├── db/schema/
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── automation.ts
│   │   ├── content.ts
│   │   ├── page-audit.ts
│   │   └── index.ts
│   └── lib/
│       ├── ecommerce/                   # interface, mock, http provider, cache.ts
│       ├── facebook/                    # env, token-crypto, client, webhook, store,
│       │                                # operations, automation, permissions, publishing,
│       │                                # oauth, ads
│       ├── landing-pages/               # templates.ts, store.ts, types.ts,
│       │                                # template-catalog.ts, real-proof.ts
│       ├── imageflow/store.ts
│       ├── meta/                        # Pixel + CAPI helpers
│       ├── content-planner.ts
│       ├── page-audit.ts
│       ├── content-publishing.ts
│       ├── api-response.ts
│       └── db.ts
├── drizzle/
│   ├── 0000_known_human_fly.sql         # Core schema
│   ├── 0001_facebook_real_flow.sql      # Facebook connections, pages mở rộng
│   ├── 0002_growth_automation_content.sql # Automation, audit, content, imageflow, landing
│   └── meta/_journal.json
├── scripts/
│   ├── imageflow-bridge.mjs             # Local polling script
│   └── imageflow-crm-adapter.mjs        # CRM → ImageFlow local adapter
├── tests/
│   ├── facebook-flow.test.ts
│   ├── growth-modules.test.ts
│   └── landing-page-ai-generator.test.ts
└── docs/
    ├── SNAPSHOT.md                      ← FILE NÀY (nguồn sự thật duy nhất)
    ├── architecture.md                  # System boundaries, ít thay đổi
    ├── imageflow-bridge.md              # CRM ↔ ImageFlow local: job flow, API, tables, secret
    ├── facebook-crm-api.md              # API reference
    ├── facebook-crm-openapi.json
    ├── facebook-crm-postman-collection.json
    └── archive/                         # Lịch sử cũ, AI không cần đọc
        ├── PROJECT-CURRENT-STATE.md
        ├── FEATURE-PROGRESS.md
        ├── LATEST.md
        └── CODEX_FINAL_REPORT_FACEBOOK_CRM.md
```

---

## 3. D1 Tables (fbshv_crm_db)

| Bảng | Migration | Mục đích |
|---|---|---|
| `pages` | 0001 | Facebook pages, token encrypted |
| `facebook_connections` | 0001 | User token encrypted |
| `conversations` | 0001 | Hội thoại Messenger |
| `messages` | 0001 | Tin nhắn |
| `comments` | 0001 | Comments Facebook |
| `facebook_webhook_events` | 0001 | Raw webhook, dedup |
| `products` | 0000 | Cache sản phẩm từ Web TMĐT |
| `product_sync_logs` | 0000 | Log đồng bộ |
| `orders` | 0000 | Read-model đơn CRM sau khi Order Core xác nhận |
| `order_items` | 0000 | Item trong đơn |
| `order_external_mapping` | 0000 | Mapping sang đơn ngoài |
| `facebook_automation_actions` | 0002 | Dedup action automation |
| `page_audits` | 0002 | Kết quả audit |
| `page_audit_runs` | 0002 | Lần chạy audit |
| `page_audit_findings` | 0002 | Chi tiết finding |
| `content_ideas` | 0002 | Ý tưởng nội dung AI |
| `content_posts` | 0002 | Bài viết (draft/scheduled/published) |
| `content_calendar` | 0002 | Lịch đăng |
| `content_media` | 0002 | Ảnh gắn với bài đăng (từ ImageFlow/R2) |
| `imageflow_jobs` | 0002 | Job render ảnh AI |
| `imageflow_assets` | 0002 | Ảnh đã upload R2, có trạng thái QA |
| `landing_pages` | 0002 | Landing page CRUD |
| `landing_page_variants` | 0002 | A/B variants (schema ready, UI chưa có) |
| `landing_page_events` | 0002 | Pixel/CAPI events |
| `conversion_events` | 0002 | CAPI gửi đến Meta |
| `ads_drafts` | 0002 | Draft quảng cáo nội bộ |
| `integration_events` | 0009 | Raw event từ Core/Facebook, dedup external event id |
| `integration_jobs` | 0009 | Job backbone với source_event_id, idempotency_key, max_retry_count |
| `core_action_audit_logs` | 0009 | Audit action cross-core, không ghi secret |

> Core Integration V2 Sprint 1 đã deploy production sau Cloudflare hard gate. Migration `0009` đã apply remote vào `fbshv_crm_db`; production smoke pass cho health API, jobs API, products API và UI `/settings/integration-jobs`. Signed Web TMĐT webhook `product.updated` đã được production nhận, enqueue và cron xử lý `completed`.

> `content_media` vs `imageflow_assets`: `imageflow_assets` lưu raw output từ ImageFlow kèm QA status (needs_review/approved/rejected). `content_media` là bản đã được chọn để gắn vào bài đăng cụ thể — một asset có thể được dùng ở nhiều content_media rows.

---

## 4. Secrets (Cloudflare Worker)

> Chỉ liệt kê tên + trạng thái. Không ghi giá trị.

| Secret | Trạng thái |
|---|---|
| `AUTH_SECRET` | ✅ |
| `ENCRYPTION_KEY` | ✅ |
| `META_APP_ID` | ✅ = `1296077039298909` |
| `META_APP_SECRET` | ✅ |
| `META_VERIFY_TOKEN` | ✅ |
| `CRM_APP_URL` | ✅ |
| `ECOMMERCE_API_KEY` | ✅ khớp Web TMĐT |
| `ECOMMERCE_WEBHOOK_SECRET` | ✅ khớp Web TMĐT |
| `GEMINI_API_KEY_1` | ✅ valid |
| `GEMINI_API_KEY_2` | ✅ valid |
| `GEMINI_API_KEY_3` | ⚠️ permission_denied |
| `META_PIXEL_ID` | ✅ = `635875943626253` |
| `META_CAPI_ACCESS_TOKEN` | ✅ từ encrypted Meta connection token |
| `AUTO_REPLY_MESSAGES_ENABLED` | ✅ true |
| `AUTO_REPLY_COMMENTS_ENABLED` | ✅ true |
| `AUTO_HIDE_PHONE_COMMENTS_ENABLED` | ✅ true |
| `AUTO_PUBLISH_POSTS_ENABLED` | ✅ true |
| `CONTENT_AUTOMATION_UI_ENABLED` | ✅ true |
| `IMAGEFLOW_BRIDGE_TOKEN` | ✅ chỉ cho local script |
| `MOCK_EXTERNAL_APIS` | ✅ false |
| `MOCK_ECOMMERCE_API` | ✅ false |
| `META_TEST_EVENT_CODE` | ❌ chưa set — optional |

---

## 5. ImageFlow Bridge — Trạng thái

**Local:** `http://127.0.0.1:7096` · **Pipeline:** `facebook_ads`

| Placement | Format | Size | Status |
|---|---|---|---|
| Feed | `facebook_feed` | `1080×1350` 4:5 | ✅ Verified, claim guard active |
| Banner | `facebook_banner` | `820×312` | ✅ Route ready |
| Story/Reels | `facebook_story` | `1080×1920` 9:16 | ✅ Route ready |
| Logo/Avatar | `facebook_logo` | `170×170` 1:1 | ✅ Route ready |
| Landing page | `landing_page` | `1080×1350` 4:5 | ✅ Verified |

**Claim Guard:** CRM truyền `allowedClaims` + `forbiddenClaims` vào `product_package.json`. Adapter xóa stale output trước mỗi job.

**Safe local mode:** bridge không poll chồng khi job trước chưa xong. Adapter mặc định giới hạn một prompt profile và một render profile; queue/CDP đang bận thì job chuyển `needs_user`, không mở thêm profile. Bridge mặc định chạy single-run; chỉ poll nền khi gọi `--watch` hoặc `IMAGEFLOW_BRIDGE_MODE=watch`.

**No Explorer polling:** adapter không gọi `/api/product-queue/open-output-folder`; sau khi start queue, adapter chỉ đọc `/api/product-queue` và quét output từ `product_package_path`.

**Asset QA gate:** Ảnh mới → `needs_review`. Public landing chỉ dùng `approved`.

**Latest verified guard test:** `3d179b34` · SKU `162114_COMBO_2_LO_YUHAO_268G` · safe mode opened one prompt profile (`4`) and one render profile (`2`); ChatGPT prompt profile failed, asset count stayed `0`, so CRM did not upload stale output.

**Rủi ro còn lại:** ChatGPT profile pool có profiles failed. Nếu job liên tiếp fail → reset/login CDP profiles trước khi debug CRM payload.

---

### 2026-06-13 - Auto planner alias/caption guard production run

- Deploy `c1218e9a-8ee4-4153-9ba3-0d167571a668` sua dung scope CRM: `Shop Gia Dung Huy Van` duoc map vao slot cu `Kho Gia Dung Huy Van`, va caption AI bi cat giua cau se tu roi ve caption an toan.
- Production automation run ngay `2026-06-13` da tao 2 bai lich toi:
  - `99bf6840-c041-4bae-b26d-7959e285bff3` cho `Shop Huy Van`, SKU `162114_COMBO_2_LO_YUHAO_268G`, lich `2026-06-13T12:45:00.000Z`, image job `dda79dcf-3c35-4655-8780-e9dabb99df4b`.
  - `cdebc713-0ed7-4881-80c1-4fe2af0ac9e0` cho `Shop Gia Dung Huy Van`, SKU `K238_2VAO2RA`, lich `2026-06-13T13:30:00.000Z`, image job `e21c7c7b-df98-4fc5-bbc0-44717455e746`.
- Readback `/api/content/posts`: 2 bai o trang thai `scheduled`, caption hoan chinh, khong con bai rac tu luot smoke cu.
- Bridge watcher CRM da duoc bat lai bang `scripts/imageflow-bridge.mjs --watch`; Pool Scheduler local `http://127.0.0.1:7096` co phan hoi, nhung local ImageFlow tra loi `Khong tao duoc current_multi_prompt_batch.json` va `CDP queue dang chay`.
- Hai image job dang o `needs_user`; chua co `imageflow_assets`, vi vay publish gate van giu job o lich/cho media va khong dang bai chu khi thieu anh.
- Verification code sau patch: `npm test` 79/79 pass, `npm run lint`, `npm run typecheck`, `npm run size:check`, `npm run hygiene:check`, `npm run build`.

### 2026-06-13 — Pool Scheduler CRM-only cleanup

- Chỉ sửa CRM, không chỉnh ImageFlow local source.
- Content Planner là entry vận hành duy nhất cho bài viết + ảnh AI; route `/imageflow-bridge` cũ redirect về `/content-planner`.
- `POST /api/content/posts` tự gọi `ensureImageflowJobForPost` khi bài chưa có media, idempotent theo `postId`; job `failed/cancelled` được requeue thay vì tạo trùng.
- `createPublishJobs({ waitForMedia: true })` không đăng text-only khi chưa có media; job chuyển `scheduled` với `WAITING_IMAGEFLOW_ASSETS`.
- `scripts/imageflow-crm-adapter.mjs` không đọc `pipeline_config.json`, không truyền `prompt_profile_ids`/`render_profile_ids`, và kiểm `/api/pool/status` trước khi start queue.
- `scripts/imageflow-bridge.mjs` kiểm Pool Scheduler trước khi claim job production để tránh khóa job khi local chưa sẵn sàng.
- Test/build pass: `npm test`, `npm run lint`, `npm run typecheck`, `npm run size:check`, `npm run build`, `npm run build:cloudflare`, `node --check scripts/imageflow-*.mjs`.
- Local browser verify `/content-planner`: mobile `390x844`, tablet `820x1180`, desktop `1366x900`; không tràn ngang, không còn menu bridge, không còn nút tạo ảnh thủ công, vẫn có nút làm mới ảnh.
- Production deploy `02a04285-23ee-4586-9d21-be22c5d1273b` đã pass Cloudflare account gate `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Production browser verify `/content-planner`: mobile `390x844`, tablet `820x1180`, desktop `1366x900`; không tràn ngang, không còn menu bridge, không còn nút tạo ảnh thủ công, vẫn có nút làm mới ảnh.
- Route cũ `/imageflow-bridge` production tự chuyển về `/content-planner`.
- Production API read-only verify: `/api/content/posts`, `/api/imageflow/jobs?limit=1`, `/api/content/calendar/suggestions?days=1` đều HTTP 200.
- Ở lượt Pool Scheduler trước chưa chạy smoke write vì route delete chưa dọn `imageflow_jobs`; phần cleanup bên dưới đã bổ sung dọn đồng bộ.

### 2026-06-13 — Content Planner delete + production cleanup

- Thêm nút `Xoá khỏi CRM` cho từng bài và `Dọn trống planner` cho toàn bộ danh sách.
- Modal bulk bắt buộc tick xác nhận, hiển thị progress và ghi rõ bài thật trên Facebook không bị xoá.
- Route DELETE dùng `scope=crm`; không gọi Meta API và cho phép dọn record ở mọi trạng thái.
- Cleanup dọn đồng bộ `content_posts`, targets, publish jobs/logs, media R2, `imageflow_jobs` và `imageflow_assets` liên quan.
- Production đã xoá sạch 31/31 record; toàn bộ DELETE trả HTTP 200.
- API `/api/content/posts` readback còn 0 bài.
- D1 readback: `content_posts`, `content_post_targets`, `content_publish_jobs`, `content_publish_logs`, `content_media`, ImageFlow jobs/assets gắn post đều bằng 0.
- Browser production pass mobile `390x844`, tablet `820x1180`, desktop `1366x900`; không tràn ngang, empty state đúng, nút bulk disabled khi count = 0.

### 2026-06-11 — Archived local bridge/UI notes

- Chi tiết các lượt local-only 2026-06-11 đã được giữ trong git history; snapshot hiện chỉ giữ trạng thái production/current để không vượt giới hạn 30KB.

### 2026-06-11 — CRM/Automation/Fanpage/Audit UI local update

- `CRM`, `Automation`, `Fanpage`, `Page Audit` đã chuyển sang cùng hệ palette sáng/beige và spacing/card đồng bộ với `Content Planner`.
- Đã sửa thêm text UI bị lỗi font ở các màn vừa patch để tránh tiếp tục lan mojibake lên prompt/runtime verify.
- Batch này mới verify local, chưa deploy production.

### 2026-06-11 — Landing Pages production 1102 fix

- Đã giảm payload SSR và response quản trị `/landing-pages` sang summary nhẹ, bỏ preload product list ở server để tránh Worker exceeded resource limits.
- Build pass, deploy production pass với Cloudflare account `3d1e8c3bd1f4f9ace7388e60dd11fbed`.
- Verify production `https://fbshv-crm.ngchihuy.workers.dev/landing-pages` trả `200` và mở được trong browser thật; ảnh lưu ở `work/debug/ui-verify/landing-pages-production-2026-06-11.png`.

## 6. Open Issues

### 🔴 Blockers

| ID | Vấn đề | Hướng xử lý |
|---|---|---|
| B1 | SKU `1_BO_CS_300W_K268` chỉ có 1 ảnh trong Product Core | Thêm ảnh thật vào Web TMĐT trước, CRM không tự thêm được |
| B2 | ChatGPT profile pool có profiles failed | Reset/login CDP profiles trong local ImageFlow |
| B3 | Render profile `6` không có CDP port mapping | Map port hoặc xóa profile `6` khỏi active pool |
| B4 | `NEED_USER_META_UI_ACTION` chưa xác nhận | User mở `developers.facebook.com` → App `1296077039298909` → kiểm App Domains, Webhook fields |
| B5 | `NEED_USER_RECONNECT_FACEBOOK` | Bấm Connect Facebook lại để token nhận scope `pages_manage_posts` |
| B6 | ChatGPT prompt profile `4` fail khi chạy YUHAO | Reset/login profile `4` trong ImageFlow local rồi tạo lại job; CRM guard đã giữ asset=0, không upload ảnh cũ |
| B7 | Nếu local ImageFlow `127.0.0.1:7096` không tự lên sau reboot thì supervisor watcher sẽ chờ vô hạn | Kiểm `ImageFlow Local Stack.lnk` và local stack launcher nếu máy đổi startup policy |

### 🟡 Next Sprint

| ID | Việc | File liên quan |
|---|---|---|
| N0 | Facebook signed webhook live event readback khi có event thật an toàn từ Meta | `src/app/api/webhooks/facebook/route.ts` |
| N0B | Mở rộng concrete handlers Chat Core/CAPI/Ads draft sau khi dependency/permission gate pass | `src/lib/integration/processor.ts` |
| N1 | Pre-upload claim QA (OCR text trên ảnh render) | `scripts/imageflow-crm-adapter.mjs` |
| N2 | Improve ImageFlow landing → 5/5 frames approved (hiện 2/5) | Prompt path + thêm ảnh Product Core |
| N3 | A/B traffic split UI cho landing page variants | `src/lib/landing-pages/store.ts` + UI mới |
| N5 | RUNBOOK.md — xử lý khi production down | Tạo `docs/RUNBOOK.md` |
| N6 | Doc rotate `ENCRYPTION_KEY` an toàn | Thêm vào `docs/architecture.md` |

---

## 7. Roadmap mở rộng

### Phase 3 — CRM nâng cao (2–4 tuần)
- **CRM Khách hàng:** `customers` table mới, tag tự động (VIP/Mới/Hủy), lịch sử mua
- **Kanban đơn hàng:** kéo thả trạng thái, `orders_crm` đã có
- **Quick reply templates:** mẫu trả lời nhanh cho inbox/comment

### Phase 4 — Content AI nâng cao (2–3 tuần)
- **Content calendar visual:** lịch tháng drag-drop, schema đã có
- **Multi-image album post:** đăng album nhiều ảnh từ ImageFlow assets
- **Auto publish cron:** production on; tiếp tục bổ sung lịch tháng drag-drop nếu cần
- **Hashtag AI suggester:** Gemini + product context

### Phase 5 — Ads Intelligence (3–4 tuần, cần Meta Review)
- **Ads performance dashboard:** insights 3 accounts, recharts
- **ROAS calculator:** doanh thu CRM + chi phí ads
- **CAPI `purchase` event:** khi đơn hoàn thành → gửi CAPI
- **Retargeting audience sync:** `business_management` scope

### Phase 6 — Multi-channel (4–6 tuần)
- **Zalo OA integration**
- **TikTok Shop sync**
- **Email marketing** (Resend/SendGrid)
- **SMS automation** (VNPT SMS)

---

## 8. Deploy History (5 gần nhất)

| Version | Ngày | Nội dung chính |
|---|---|---|
| `c1218e9a` | 2026-06-13 | Auto planner map dung page `Shop Gia Dung Huy Van`, chan caption AI bi cut giua cau; production run tao 2 bai scheduled + 2 image jobs, local ImageFlow dang `needs_user` |
| `5e3dbc67` | 2026-06-13 | Content Planner một màn hình: AI soạn bài, tạo ảnh AI qua Pool Scheduler, panel tự động đăng 4 bài/ngày, lộ trình Fanpage; bật `AUTO_PUBLISH_POSTS_ENABLED=true`, production desktop/tablet/mobile pass |
| `e357c2b5` | 2026-06-13 | Content Planner có xoá từng bài + dọn trống CRM-only; production xoá sạch 31 record, API/D1/UI responsive readback đều pass |
| `02a04285` | 2026-06-13 | Pool Scheduler CRM-only production verified: Content Planner tự xếp job ảnh theo `postId`, bridge chỉ transport nền, adapter không tự chọn profile; Cloudflare gate pass, UI/API production pass |
| `no-deploy` | 2026-06-11 | Ghi rule cứng `không chạy chồng nhiều job trên cùng profile` vào CRM/ImageFlow AGENTS + snapshot |
| `no-deploy` | 2026-06-11 | Ổn định autostart cho `ImageFlow Bridge` watcher: thêm supervisor, wiring startup launcher, verify process/log thật |
| `no-deploy` | 2026-06-11 | Resume luồng `ImageFlow Bridge`: gỡ stale local queue, clear remote lock, xác nhận job `queued -> running`, bật lại watcher nền |
| `no-deploy` | 2026-06-11 | Reset dữ liệu `ImageFlow Bridge` trên production D1 + local `work/crm_bridge`; verify API jobs rỗng |
| `no-deploy` | 2026-06-11 | UI refresh đồng bộ cho `Inbox/Comment` và `Facebook Ads`; verify local desktop/tablet/mobile bằng Chrome headful + CDP |
| `57ac0f0d` | 2026-06-10 | Patch External Core timeout/retry, deploy lại, signed Web TMĐT webhook `product.updated` readback completed |
| `eeefa6e2` | 2026-06-10 | Deploy Core Integration V2 Sprint 1: migration `0009` remote, cron mỗi phút, health/jobs UI/API smoke pass production |
| `no-deploy` | 2026-06-10 | Sprint 1 local complete + Commerce Core: jobs/health UI, quick-ack TMĐT, order contract/read-model/status processor |
| `no-deploy` | 2026-06-10 | Core Integration Phase 2 schema/store: integration events/jobs/audit, event dedup, job idempotency, atomic claim SQL |
| `no-deploy` | 2026-06-10 | Core Integration Phase 1: runtime guard, runtime health API, External Core timeout/retry/circuit breaker |
| `no-deploy` | 2026-06-10 | ImageFlow bridge single-run mặc định; lockedUntil 35 phút; adapter không poll `open-output-folder` |
| `d4d06023` | 2026-06-10 | ImageFlow bridge recovery/backoff/adapter-timeout; watcher restarted with empty-streak backoff |
| `232a03d6` | 2026-06-09 | ImageFlow bridge safe mode: sequential polling, single-profile limits, atomic job claim |
| `no-deploy` | 2026-06-09 | Consolidate snapshot protocol; old status docs moved to `docs/archive/` |
| `4c84f434` | 2026-06-06 | AI template catalog, landing page TikTok/Shopee/Facebook |
| `ca8f4da9` | 2026-06-06 | Stricter source-photo render guard |
| `c8b1b502` | 2026-06-07 | Facebook Ads ImageFlow lane fix, claim sanitizer |

---

## 9. Checklist giao cho AI mới

AI nhận task mới PHẢI xác nhận đủ 4 điều trước khi bắt tay:

```
☐ Đã đọc AGENTS.md
☐ Cloudflare account = 3d1e8c3bd1f4f9ace7388e60dd11fbed
☐ Không edit repo Web TMĐT
☐ npx wrangler whoami pass trước khi deploy
```

**Thứ tự đọc docs:**
1. `AGENTS.md` — rules bất biến
2. `docs/SNAPSHOT.md` — file này
3. `docs/architecture.md` — nếu task liên quan boundaries/DB/webhook
4. `docs/imageflow-bridge.md` — nếu task liên quan ImageFlow (CRM side)
5. `D:\codex_manager_v3.1\tools\imageflow\docs` — nếu task liên quan ImageFlow local engine (đọc `AGENTS.md`, `GUI_PROVIDER_AUTOMATION_FLOW.md`, `FLOW_CDP_AUTOMATION_LAND_FLOW.md`)
6. `docs/facebook-crm-api.md` — nếu task liên quan ecommerce API hoặc Facebook endpoints
