# CORE-INTEGRATION-MAP + PATCH PLAN V2
## Facebook CRM × ShopHuyVan Core × ImageFlow × Chat Worker × Python/Zalo Helpers

**Version:** V2 — đã vá các gap production-critical trước implement
**Mục tiêu:** Biến Facebook CRM thành **Facebook Growth Console** trong hệ sinh thái ShopHuyVan, nhưng vẫn giữ đúng ownership dữ liệu, guard-first, không chạy mock production, không tự trừ tồn, không tự active ads.

---

# 0. Những thay đổi quan trọng so với V1

V2 vá 9 gap kỹ thuật trước khi implement:

```txt
1. D1 job claim phải atomic bằng UPDATE ... RETURNING
2. Cloudflare Workers không chạy long-running process: phải dùng Cron Trigger hoặc Queue
3. Phase 6 ImageFlow bị chặn cho tới khi đóng các issue gateway/storyboard/fanout
4. Facebook webhook phải verify/save raw/return 200 nhanh, xử lý nặng qua job
5. integration_jobs thêm idempotency_key + max_retry_count
6. integration_jobs liên kết source_event_id với integration_events
7. Chat Worker cross-account auth phải có shared secret + rotation plan
8. External Core call phải có timeout/retry/circuit breaker
9. GEMINI_API_KEY_3 permission_denied phải thành ticket riêng
```

Ngoài ra, Phase 4 webhook hardening được kéo lên chạy song song với Phase 2 vì hệ thống đang live production.

---

# 1. Core Integration Map

## 1.1. Ownership dữ liệu

| Nhóm dữ liệu | Owner ghi chính | Facebook CRM được làm gì | Không được làm |
|---|---|---|---|
| Product / SKU / ảnh gốc | Web TMĐT / Product Core | Đọc qua External API, cache read-model | Không sửa sản phẩm gốc |
| Tồn kho / giá vốn | Web TMĐT / Warehouse Core | Gọi check/reserve/create order | Không tự trừ tồn, không tự tính giá vốn |
| Đơn hàng | Web TMĐT / Order Core | Tạo yêu cầu đơn Facebook, lưu mapping CRM | Không ghi đơn gốc nếu Core chưa xác nhận |
| Tài chính / lợi nhuận / ROAS | Web TMĐT / Finance Core | Đọc read-model để hiển thị/ra quyết định | Không tự tính nghiệp vụ tài chính |
| Facebook page/token/webhook | Facebook CRM | Ghi chính | Không để tool khác ghi trực tiếp |
| Inbox/comment Facebook | Facebook CRM + Chat Core read-model | Nhận webhook, xử lý, đồng bộ Chat Core | Không bỏ qua verify chữ ký |
| Chat đa kênh | Chat Worker / Chat Core | Facebook là một channel | Không auto-send khi chưa đủ guard |
| Ảnh/video AI | ImageFlow local + CRM R2 asset | Tạo job, nhận asset, QA | Không gọi Chrome local trực tiếp |
| Landing page Facebook | Facebook CRM | Ghi chính | Không dùng ảnh chưa approved |
| Ads draft/decision | Ads Core + Facebook CRM | Tạo draft, preview, confirm, log | Không tự ACTIVE khi chưa đủ quyền/guard |
| Zalo/Shopee/TikTok no-API helper | Python/Zalo local | Chỉ là runner đẩy về Core | Không ghi thẳng vào CRM |

---

# 2. Luồng tổng thể đích

```txt
Marketplace / API / Import / Browser helper / Zalo local
        ↓
ShopHuyVan Core
(Product / Order / Warehouse / Finance / ADS / Chat)
        ↓ API + Webhook + HMAC
Facebook CRM
(Facebook Inbox / Comment / Content / Landing / Pixel / Ads Draft)
        ↓ Job Queue
ImageFlow Local / AI Gateway / CDP Providers
        ↓ Upload R2 + QA
Content Planner / Landing / Ads Creative
```

---

# 3. Production-critical decisions

## 3.1. Job processor mechanism — chọn phương án mặc định

**Khuyến nghị mặc định cho V2:** dùng **Cloudflare Scheduled Worker / Cron Trigger** để claim `integration_jobs` mỗi phút.

Lý do:

```txt
- Dễ triển khai hơn Cloudflare Queues
- Giữ được bảng integration_jobs để UI operator xem/retry/cancel
- Phù hợp các job nhẹ: sync status, process event, send CAPI, update read-model
- Các job nặng như ImageFlow vẫn do local bridge claim riêng
```

Trong `wrangler.toml`:

```toml
[triggers]
crons = ["*/1 * * * *"]
```

Entry handler:

```ts
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processIntegrationJobs(env, {
      maxJobs: 10,
      maxRuntimeMs: 25000
    }));
  }
}
```

**Không được assume Worker là long-running process.** Mọi job phải chạy trong request/cron lifecycle ngắn.

### Khi nào chuyển sang Cloudflare Queues?

Chỉ cân nhắc Cloudflare Queues khi:

```txt
- Job volume lớn
- Cần backpressure native
- Cần retry native theo queue
- Không cần UI table làm source xử lý chính
```

Nếu dùng Queues sau này thì `integration_jobs` vẫn có thể giữ làm read-model/audit, nhưng queue mới là transport chính.

---

## 3.2. D1 atomic claim rule

D1 không có row-level locking kiểu PostgreSQL. Vì vậy **không được** claim job bằng 2 bước:

```txt
SELECT queued job
→ UPDATE status=running
```

Vì 2 Worker instance có thể đọc cùng một job.

Bắt buộc dùng một statement atomic:

```sql
UPDATE integration_jobs
SET
  status = 'running',
  locked_until = datetime('now', '+2 minutes'),
  updated_at = datetime('now')
WHERE id = (
  SELECT id
  FROM integration_jobs
  WHERE status = 'queued'
    AND (locked_until IS NULL OR locked_until < datetime('now'))
    AND retry_count < max_retry_count
  ORDER BY created_at ASC
  LIMIT 1
)
RETURNING *;
```

Chỉ process nếu `RETURNING` có row.

Nếu không có row:

```txt
- Không làm gì
- Cron kết thúc nhẹ
```

### Recovery job running bị treo

```sql
UPDATE integration_jobs
SET
  status = 'queued',
  locked_until = NULL,
  retry_count = retry_count + 1,
  updated_at = datetime('now')
WHERE status = 'running'
  AND locked_until < datetime('now')
  AND retry_count < max_retry_count;
```

Nếu quá retry:

```sql
UPDATE integration_jobs
SET
  status = 'failed',
  error_message = 'MAX_RETRY_EXCEEDED',
  updated_at = datetime('now')
WHERE status IN ('queued', 'running')
  AND retry_count >= max_retry_count;
```

---

## 3.3. Facebook webhook quick-ack rule

Facebook webhook handler phải tách 2 phần:

```txt
Part A — request path nhanh:
1. Verify signature
2. Save raw event
3. Dedup event id
4. Enqueue processing job
5. Return HTTP 200 ngay

Part B — async/cron processing:
1. Normalize event
2. Write message/comment
3. Trigger automation
4. Sync Chat Core
5. Update processed status
```

Không được làm việc nặng trước khi trả HTTP 200.

Mẫu flow:

```ts
export async function handleFacebookWebhook(request, env) {
  const rawBody = await request.text();

  const signatureOk = verifyFacebookSignature(rawBody, request.headers, env);
  if (!signatureOk) {
    await saveWebhookEvent({ rawBody, signatureValid: false, status: "rejected" });
    return new Response("invalid signature", { status: 403 });
  }

  const event = await saveWebhookEvent({
    rawBody,
    signatureValid: true,
    status: "verified"
  });

  await enqueueIntegrationJob({
    jobType: "process_facebook_webhook_event",
    sourceEventId: event.id,
    idempotencyKey: event.external_event_id,
    payload: { eventId: event.id }
  });

  return new Response("ok", { status: 200 });
}
```

---

# 4. Database schema V2

## 4.1. `integration_events`

```sql
CREATE TABLE integration_events (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  target_system TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  processed_status TEXT NOT NULL DEFAULT 'received',
  payload_json TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE UNIQUE INDEX idx_integration_events_source_external
ON integration_events(source_system, external_event_id);

CREATE INDEX idx_integration_events_status
ON integration_events(processed_status, created_at);
```

Status:

```txt
received
verified
queued
processed
skipped_duplicate
failed
rejected
```

---

## 4.2. `integration_jobs`

V2 bổ sung:

```txt
- source_event_id
- idempotency_key
- max_retry_count
```

Schema:

```sql
CREATE TABLE integration_jobs (
  id TEXT PRIMARY KEY,
  source_event_id TEXT,
  job_type TEXT NOT NULL,
  source_system TEXT NOT NULL,
  target_system TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  locked_until TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retry_count INTEGER NOT NULL DEFAULT 3,
  payload_json TEXT NOT NULL,
  result_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (source_event_id) REFERENCES integration_events(id)
);

CREATE INDEX idx_integration_jobs_status_type
ON integration_jobs(status, job_type, created_at);

CREATE INDEX idx_integration_jobs_source_event
ON integration_jobs(source_event_id);

CREATE UNIQUE INDEX idx_integration_jobs_idempotency
ON integration_jobs(job_type, idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

Status:

```txt
queued
running
needs_user
completed
failed
cancelled
```

Job types:

```txt
process_facebook_webhook_event
sync_product_to_crm
sync_order_status_to_crm
create_facebook_order
generate_facebook_content
render_imageflow_asset
publish_facebook_post
send_capi_event
create_ads_draft
sync_chat_core_context
```

---

## 4.3. `core_action_audit_logs`

```sql
CREATE TABLE core_action_audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  target_system TEXT NOT NULL,
  idempotency_key TEXT,
  request_json TEXT,
  response_json TEXT,
  result_status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_core_action_idempotency
ON core_action_audit_logs(idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

---

# 5. Event → Job linkage

## 5.1. Quy tắc

Mỗi external event khi cần xử lý async phải tạo job có `source_event_id`.

```txt
integration_events.id
        ↓
integration_jobs.source_event_id
        ↓
job processor
        ↓
update integration_events.processed_status
```

## 5.2. Ví dụ order.status_changed

```txt
Webhook từ Web TMĐT:
event_type = order.status_changed
external_event_id = wh_abc_123

CRM:
1. verify HMAC
2. save integration_events
3. enqueue job sync_order_status_to_crm
   - source_event_id = event.id
   - idempotency_key = external_event_id
4. return 200
5. cron claim job
6. update orders_crm read-model
7. mark event processed
```

## 5.3. Ví dụ Facebook webhook

```txt
Facebook webhook:
event_type = facebook.webhook

CRM:
1. verify x-hub-signature-256
2. save raw event
3. enqueue process_facebook_webhook_event
4. return 200
5. cron claim job
6. normalize thành message/comment
7. trigger automation nếu phù hợp
8. mark event processed
```

---

# 6. Circuit breaker cho Web TMĐT Core

## 6.1. Tại sao cần

Nếu `huyvan-worker-api` timeout/down, CRM không được treo toàn bộ request. Order creation/product search phải fail nhanh, hiển thị `core_unavailable` cho operator.

## 6.2. External Core client rule

Tạo:

```txt
src/lib/core-flow/external-core-client.ts
```

Config mặc định:

```txt
timeoutMs = 3500
retry = 1
retryDelayMs = 300
circuitBreakerWindowMs = 60000
failureThreshold = 5
cooldownMs = 120000
```

Behavior:

```txt
- Mỗi call timeout 3.5s
- Retry 1 lần với lỗi network/timeout/5xx
- Không retry 4xx
- Nếu fail >= 5 lần trong 60s → circuit open
- Trong circuit open → trả CORE_UNAVAILABLE ngay
- Sau cooldown → half-open thử 1 request
```

Response chuẩn:

```json
{
  "ok": false,
  "code": "CORE_UNAVAILABLE",
  "message": "Web TMĐT Core đang không phản hồi. Vui lòng thử lại sau hoặc xử lý thủ công.",
  "retryable": true
}
```

---

# 7. Cross-account Chat Worker auth

Chat Worker và CRM có thể nằm ở Cloudflare account khác nhau. Không được gọi nội bộ không xác thực.

## 7.1. Shared secret

Thêm secret ở cả 2 bên:

```txt
CHAT_CORE_BRIDGE_SECRET
```

Header:

```txt
X-SHV-Bridge-Timestamp: ISO timestamp
X-SHV-Bridge-Signature: HMAC-SHA256(method + path + timestamp + rawBody, CHAT_CORE_BRIDGE_SECRET)
```

Chống replay:

```txt
- Reject timestamp lệch quá 5 phút
- Signature compare constant-time
```

## 7.2. Rotation plan

Dùng 2 secret trong giai đoạn rotate:

```txt
CHAT_CORE_BRIDGE_SECRET_CURRENT
CHAT_CORE_BRIDGE_SECRET_NEXT
```

Verify chấp nhận current hoặc next. Khi tất cả worker đã deploy xong thì promote NEXT thành CURRENT.

## 7.3. Endpoint đề xuất

CRM gọi Chat Worker:

```txt
POST /api/bridge/facebook/conversations/upsert
POST /api/bridge/facebook/messages/upsert
POST /api/bridge/ai/suggest
POST /api/bridge/learning/approved-message
GET  /api/bridge/health
```

---

# 8. ImageFlow dependency gate

Phase 6 **không được bắt đầu** cho tới khi các issue sau được đóng ở ImageFlow local:

```txt
BLOCKER-IMG-001:
PROJECT_SNAPSHOT Issue #9
local_ai_gateway_routes.py:363 KeyError do JSON sample trong system prompt chưa escape {}

BLOCKER-IMG-002:
PROJECT_SNAPSHOT Issue #10
Storyboard output phải có _schema = gateway_storyboard_v1 + Product Lock schema

BLOCKER-IMG-003:
PROJECT_SNAPSHOT Issue #11
Fanout Gateway không được nhận raw prompts[]; chỉ nhận Prompt Manifest validated
```

Definition of Ready cho Phase 6:

```txt
☐ Storyboard endpoint không crash
☐ Output có _schema = gateway_storyboard_v1
☐ Product Lock tồn tại
☐ Storyboard đúng 10 prompts
☐ Distribution đúng 4 lifestyle / 3 packshot / 3 lifeboard
☐ Mỗi prompt có PRESERVE EXACTLY
☐ Fanout reject raw prompts[]
☐ Fanout chỉ nhận Prompt Manifest path
☐ 1 real SKU pass storyboard → manifest → fanout dry-run
```

Nếu chưa pass, CRM chỉ được giữ ImageFlow Bridge hiện tại, không mở thêm integration mới.

---

# 9. Gemini key ticket

Hiện có `GEMINI_API_KEY_3 permission_denied`.

Tạo ticket:

```txt
AI-KEY-003
Title: Fix hoặc disable GEMINI_API_KEY_3 permission_denied
Priority: Medium
Owner: AI Gateway / CRM Settings
```

Hướng xử lý:

```txt
1. Kiểm tra key thuộc đúng project/API
2. Kiểm tra Gemini API enabled
3. Kiểm tra billing/quota/permission
4. Nếu không fix ngay:
   - mark disabled
   - không đưa vào rotation
   - UI hiển thị permission_denied
5. Nếu Keys 1+2 rate limit:
   - fallback template
   - không báo AI real nếu fallback
```

---

# 10. Core contract modules

## 10.1. Runtime guard

```txt
src/lib/core-flow/runtime-guards.ts
```

Check:

```txt
- MOCK_EXTERNAL_APIS=false
- MOCK_ECOMMERCE_API=false
- META_APP_ID
- META_APP_SECRET
- META_VERIFY_TOKEN
- CRM_APP_URL
- ENCRYPTION_KEY
- ECOMMERCE_API_KEY
- ECOMMERCE_WEBHOOK_SECRET
- DB binding
- R2 binding
- CHAT_CORE_BRIDGE_SECRET nếu bật Chat Core bridge
```

Error:

```txt
BLOCKED_BY_MISSING_SECRET
BLOCKED_BY_MISSING_BINDING
BLOCKED_BY_MOCK_IN_PRODUCTION
```

---

## 10.2. Order core contract

```txt
src/lib/core-flow/order-core-contract.ts
```

Luồng:

```txt
validate input
→ externalCore.checkInventory()
→ externalCore.createOrderFromFacebook()
→ write orders_crm
→ write order_external_mapping
→ audit log
```

Cấm:

```txt
- Không tạo đơn completed khi external API fail
- Không tự trừ tồn local
- Không lấy cache tồn làm nguồn quyết định cuối
```

---

## 10.3. Facebook event pipeline

```txt
src/lib/core-flow/facebook-event-pipeline.ts
```

Luồng quick-ack:

```txt
verify
→ save raw
→ enqueue job
→ return 200
```

Luồng async:

```txt
claim job
→ normalize
→ write conversations/messages/comments
→ trigger automation
→ mark processed
```

---

## 10.4. Chat AI contract

```txt
src/lib/core-flow/chat-ai-contract.ts
```

Rule:

```txt
- suggest_only mặc định
- không đưa cost/raw payload vào prompt
- không auto-send nếu thiếu readiness
- chỉ học từ message nhân viên đã gửi thành công
```

---

## 10.5. ImageFlow asset gate

```txt
src/lib/core-flow/imageflow-asset-gate.ts
```

Rule:

```txt
- CRM chỉ tạo imageflow_jobs
- Local bridge claim job
- Không upload stale output
- Asset mới = needs_review
- Public landing/post/ads chỉ dùng approved asset
```

---

## 10.6. Ads live-write gate

```txt
src/lib/core-flow/ads-live-write-gate.ts
```

Luồng:

```txt
draft
→ preview
→ admin confirm
→ live-write
→ readback verify
→ ads_action_logs
```

Cấm:

```txt
- Không tự ACTIVE campaign
- Không live-write nếu thiếu capability
- Không báo success nếu chưa readback
```

---

# 11. Roadmap V2

## Sprint 1 — Safety Backbone + Webhook Hardening
**Mục tiêu:** Chống mất event, chống duplicate, chống mock production, có job backbone.

### Phase 0 — Docs + boundary lock

```txt
0.1. Tạo docs/CORE-INTEGRATION-MAP.md
0.2. Tạo docs/CORE-INTEGRATION-PATCH-PLAN.md
0.3. Cập nhật SNAPSHOT.md
0.4. Chốt:
     - CRM không quản kho gốc
     - CRM không tự trừ tồn
     - ImageFlow chỉ qua job queue
     - Chat AI suggest_only
     - Ads không tự active
0.5. Thêm ImageFlow dependency gate
```

### Phase 1 — Runtime guard + Health Check

```txt
1.1. runtime-guards.ts
1.2. external-core-client.ts với timeout/retry/circuit breaker
1.3. /api/settings/runtime/health
1.4. UI /settings/health-check
1.5. Gemini key status hiển thị rõ
```

### Phase 2 — Events + Jobs Backbone

```txt
2.1. Migration integration_events V2
2.2. Migration integration_jobs V2
2.3. Migration core_action_audit_logs
2.4. Atomic claim UPDATE ... RETURNING
2.5. Cron trigger */1
2.6. processIntegrationJobs()
2.7. Retry/recovery/max_retry
2.8. UI /settings/integration-jobs
```

### Phase 2B — Facebook Webhook Hardening chạy song song

```txt
2B.1. Handler verify/save raw/enqueue/return 200
2B.2. Async job normalize message/comment
2B.3. Dedup external event
2B.4. Status tracking
2B.5. Retry failed event
```

Done Sprint 1:

```txt
- Webhook không mất event nếu xử lý sau bị lỗi
- D1 không claim trùng job
- Production không chạy mock
- Operator nhìn được health/jobs/errors
```

---

## Sprint 2 — Facebook Commerce Core

```txt
3.1. Product picker chuẩn từ External Product API
3.2. Product detail có images/promptAssets
3.3. Order form gọi checkInventory
3.4. createOrderFromFacebook qua Web TMĐT Core
3.5. Chỉ ghi orders_crm sau external OK
3.6. order_external_mapping
3.7. Webhook order.status_changed cập nhật CRM
3.8. Audit đầy đủ
```

Done:

```txt
- Không có đơn Facebook thành công giả
- Không tự trừ tồn
- Core down thì báo CORE_UNAVAILABLE nhanh
```

---

## Sprint 3 — Chat + Content + ImageFlow

Điều kiện vào Sprint 3 ImageFlow:

```txt
- BLOCKER-IMG-001 closed
- BLOCKER-IMG-002 closed
- BLOCKER-IMG-003 closed
```

Task Chat:

```txt
4.1. Facebook conversation map sang Chat Core
4.2. Cross-account HMAC bridge
4.3. AI suggest_only
4.4. Evidence/risk labels
4.5. Approved learning only
```

Task ImageFlow:

```txt
4.6. imageflow_jobs payload chuẩn
4.7. Local bridge claim
4.8. Asset upload R2
4.9. Asset QA needs_review/approved/rejected
4.10. Content Planner chỉ dùng approved asset
```

Done:

```txt
- Facebook Inbox có AI gợi ý, không tự gửi
- ImageFlow không upload ảnh cũ
- Public content không dùng asset chưa approved
```

---

## Sprint 4 — Growth Layer

```txt
5.1. Landing dùng Product Core + approved assets
5.2. Pixel/CAPI event_id dedup
5.3. Ads draft từ product/landing/asset/caption
5.4. Ads preview
5.5. Admin confirm
5.6. Live-write
5.7. Readback verify
5.8. ads_action_logs
5.9. Kill switch automation
```

Done:

```txt
- Ads không tự active
- Tracking không duplicate
- Có log và readback
```

---

# 12. Test plan V2

## 12.1. Unit tests

```txt
- verifyHmacSignature()
- verifyChatBridgeSignature()
- dedupEvent()
- assertProductionReady()
- claimNextIntegrationJob_atomic()
- recoverLockedJobs()
- maxRetryExceeded()
- externalCoreClient timeout/retry/circuit breaker
- createFacebookOrder external fail
- createFacebookOrder external success
- imageflow dependency gate
- ads live-write gate
```

## 12.2. Integration tests

```txt
- Facebook webhook valid signature → save event → enqueue → return 200
- Facebook webhook invalid signature → 403 + rejected event
- Duplicate webhook → no duplicate message/job
- Cron claim same queued job from two parallel calls → only one gets row
- Web TMĐT webhook order.status_changed → integration_event → job → orders_crm update
- Product picker search → real product
- Order create → external API called before CRM write
- Core down → CORE_UNAVAILABLE within timeout
- Chat Worker bridge bad signature → blocked
- ImageFlow blocked if gateway issues not closed
```

## 12.3. Production smoke

```txt
- /api/settings/runtime/health
- /api/settings/integration-jobs
- /api/facebook/pages
- /api/webhooks/facebook verify challenge
- /api/external/products search
- /api/imageflow/jobs
- /api/landing-pages
- /api/meta/capi/events test event
- /api/ads draft preview
- Chat Worker /api/bridge/health with signature
```

---

# 13. Deployment checklist

Trước deploy:

```txt
☐ Đã đọc AGENTS.md
☐ Đúng Cloudflare account CRM
☐ Không edit repo Web TMĐT nếu task chỉ thuộc CRM
☐ npx wrangler whoami pass
☐ Migration đã test local
☐ Atomic claim test pass
☐ Cron trigger configured nếu có job processor
☐ Secret không bị in log
☐ Không commit .env/token
☐ UI pass mobile/tablet/desktop
☐ API smoke pass
```

Sau deploy:

```txt
☐ Ghi deploy version
☐ Verify production endpoint
☐ Test webhook/challenge
☐ Test product search
☐ Test create order dry-run/sandbox
☐ Test integration job claim
☐ Test duplicate webhook
☐ Test Health Check
☐ Cập nhật SNAPSHOT.md
```

---

# 14. Prompt giao cho AI/dev làm tiếp

```txt
Bạn là agent triển khai FBSHV CRM. Hãy đọc:
1. AGENTS.md
2. docs/SNAPSHOT.md
3. docs/architecture.md
4. docs/imageflow-bridge.md
5. docs/CORE-INTEGRATION-MAP.md
6. docs/CORE-INTEGRATION-PATCH-PLAN.md

Yêu cầu bắt buộc:
- Không edit repo Web TMĐT nếu task chỉ thuộc CRM.
- Facebook CRM không được tự quản tồn kho gốc.
- Mọi tạo đơn phải qua Web TMĐT External API.
- ImageFlow chỉ qua job queue, không gọi Chrome local trực tiếp.
- AI CSKH mặc định suggest_only.
- Ads không tự ACTIVE.
- Webhook phải verify/save raw/enqueue/return 200 nhanh.
- integration_jobs phải claim atomic bằng UPDATE ... RETURNING.
- Job processor phải chạy qua Cron Trigger hoặc Cloudflare Queue, không assume Worker long-running.
- Mọi write thật phải có preview → admin confirm → live-write → readback verify → log.

Bắt đầu từ Sprint 1:
1. runtime guard
2. external core client timeout/retry/circuit breaker
3. integration_events/jobs/audit schema V2
4. atomic claim
5. cron processor
6. Facebook webhook quick-ack hardening
7. health check UI

Trước deploy phải chạy wrangler whoami, test API, test atomic claim, test duplicate webhook, cập nhật SNAPSHOT.md.
```
