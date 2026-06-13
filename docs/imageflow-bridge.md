# ImageFlow Pool Scheduler From CRM

## Mục tiêu

CRM chỉ giữ phần điều phối và lưu kết quả. Người vận hành làm việc trong **Content Planner**; CRM không còn màn hình vận hành cầu nối ảnh riêng.

Luồng chuẩn:

```txt
Content Planner
→ D1 imageflow_jobs / imageflow_assets / content_media
→ scripts/imageflow-bridge.mjs polling CRM production
→ scripts/imageflow-crm-adapter.mjs kiểm Pool Scheduler local
→ ImageFlow Pool Scheduler tại http://127.0.0.1:7096 tự cấp account/profile
→ ImageFlow local render ảnh thật
→ bridge upload ảnh về R2/CRM
→ Content Planner / publish job dùng ảnh đã upload
```

CRM không sửa runtime, profile, account pool hoặc source ImageFlow local. Mọi cấp phát account/profile thuộc Pool Scheduler đang chạy ở ImageFlow.

## Entry Point

- Operator UI duy nhất: `/content-planner`
- Route cũ `/imageflow-bridge` chỉ redirect về `/content-planner`
- Không tạo job thủ công từ picker ảnh; khi lưu/lên lịch bài chưa có media, `POST /api/content/posts` tự gọi `ensureImageflowJobForPost`
- Một `postId` chỉ có một job ảnh đang hoạt động; job `failed/cancelled` được requeue thay vì tạo trùng
- Publish-now có `waitForMedia=true`; nếu chưa có media, CRM tạo publish job `scheduled` với lỗi `WAITING_IMAGEFLOW_ASSETS`, không đăng bài chữ

## API CRM

- `GET/POST /api/imageflow/jobs`
- `POST /api/imageflow/jobs/next`
- `PATCH /api/imageflow/jobs/:id`
- `POST /api/imageflow/jobs/:id/assets`
- `GET /api/imageflow/assets/:id`

## Local Bridge

`scripts/imageflow-bridge.mjs` là transport nền. Trước khi claim job từ CRM production, script bắt buộc kiểm:

```txt
GET http://127.0.0.1:7096/api/pool/status
```

Nếu Pool Scheduler chưa sẵn sàng, bridge chỉ log lỗi và không claim job mới từ CRM. Điều này tránh khóa job production khi local runtime chưa chạy.

Chạy một lượt:

```powershell
$env:FBSHV_CRM_BASE_URL = "https://fbshv-crm.ngchihuy.workers.dev"
$env:IMAGEFLOW_BRIDGE_TOKEN = "<secret local>"
$env:IMAGEFLOW_WORK_DIR = "D:\codex_manager_v3.1\tools\imageflow\work\crm_bridge"
node .\scripts\imageflow-bridge.mjs --once
```

Chạy watch:

```powershell
node .\scripts\imageflow-bridge.mjs --watch
```

Không in token ra log. `IMAGEFLOW_BRIDGE_TOKEN` chỉ lấy từ local env/shell, không commit.

## Adapter CRM

`scripts/imageflow-crm-adapter.mjs`:

- đọc `IMAGEFLOW_JOB_FILE`
- build product package từ dữ liệu CRM/Product cache
- gọi `/api/pool/status` trước khi start
- add queue item vào ImageFlow local
- gọi `/api/product-queue/start` với `automation_mode="cdp"`, `queue_ids`, `target_count`
- không đọc `pipeline_config.json`
- không truyền `prompt_profile_ids` hoặc `render_profile_ids`
- không tự chọn provider/profile

Pool Scheduler chịu trách nhiệm cấp account/profile và quản lý trạng thái account bận/rảnh.

## Trạng thái

- `queued`: CRM đã tạo job, chờ bridge local kéo về
- `running`: bridge local đã claim job
- `needs_user`: local cần thao tác hoặc cấu hình thêm
- `completed`: ảnh đã upload về R2/CRM
- `failed`: lỗi render/upload thật, đã sanitize
- `cancelled`: job đã hủy nội bộ

## Điều kiện Hoàn Thành

Một lượt sửa ImageFlow CRM-side chỉ được báo xong khi đã kiểm:

- API tạo bài tự tạo/reuse job theo `postId`
- adapter không còn đọc/truyền profile ID
- bridge kiểm `/api/pool/status` trước khi claim job
- Content Planner không còn nút tạo ảnh thủ công riêng
- publish-now không đăng text-only khi đang chờ ảnh
- docs `docs/SNAPSHOT.md` được cập nhật
