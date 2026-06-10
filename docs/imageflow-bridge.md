# ImageFlow Bridge

## Mục tiêu

Cầu nối ImageFlow giữ phần render ảnh ở local nhưng cho CRM production tạo job, theo dõi trạng thái và nhận ảnh thật về R2. CRM không gọi trực tiếp Chrome local và không tạo ảnh demo.

Luồng chuẩn:

```txt
Content Planner / Cầu nối ảnh AI
→ D1 imageflow_jobs
→ script local scripts/imageflow-bridge.mjs polling production
→ scripts/imageflow-crm-adapter.mjs đẩy job vào ImageFlow local
→ ImageFlow local render ảnh 4:5
→ upload R2 qua API CRM
→ content_media + imageflow_assets
→ Content Planner dùng ảnh thật để đăng album Facebook
```

## Route và bảng

- UI: `/imageflow-bridge`
- API tạo/list job: `GET/POST /api/imageflow/jobs`
- API local claim job: `POST /api/imageflow/jobs/next`
- API local cập nhật job: `PATCH /api/imageflow/jobs/:id`
- API local upload ảnh: `POST /api/imageflow/jobs/:id/assets`
- Public asset URL: `GET /api/imageflow/assets/:id`
- D1 tables:
  - `imageflow_jobs`
  - `imageflow_assets`
  - `content_media`

## Biến local cho script

Không in token ra log. `IMAGEFLOW_BRIDGE_TOKEN` lấy từ local `.env.local` hoặc phiên shell hiện tại.

```powershell
$env:FBSHV_CRM_BASE_URL = "https://fbshv-crm.ngchihuy.workers.dev"
$env:IMAGEFLOW_BRIDGE_TOKEN = "<token đã set trong Cloudflare Worker secret>"
$env:IMAGEFLOW_WORK_DIR = "D:\codex_manager_v3.1\tools\imageflow\work\crm_bridge"
node .\scripts\imageflow-bridge.mjs --once
```

Mặc định bridge tự gọi `scripts/imageflow-crm-adapter.mjs`. Chỉ cần set `IMAGEFLOW_COMMAND` nếu muốn thay adapter bằng lệnh render khác.

> **Lưu ý `IMAGEFLOW_WORK_DIR`:** Đây là thư mục dùng chung giữa CRM bridge và ImageFlow local engine. Bridge đặt job file vào đây, adapter đọc từ đây để đẩy vào ImageFlow local. Không thay đổi path này mà không đồng bộ cả 2 phía.

## Tài liệu liên quan

File này chỉ mô tả CRM side. Khi làm task liên quan đến render engine, CDP automation, profile/runtime, hoặc pipeline local, phải đọc thêm docs của ImageFlow local engine tại:

```txt
D:\codex_manager_v3.1\tools\imageflow\docs
```

File quan trọng cần đọc:
- `AGENTS.md` — rules kiến trúc, cấu trúc file, runtime/account rules
- `GUI_PROVIDER_AUTOMATION_FLOW.md` — flow chuẩn product → image/video, provider runner map
- `FLOW_CDP_AUTOMATION_LAND_FLOW.md` — luồng CDP cho Google Flow video
- `PROJECT_SNAPSHOT.md` — trạng thái hiện tại của ImageFlow local

## Adapter CRM → ImageFlow local

`scripts/imageflow-crm-adapter.mjs` đọc `IMAGEFLOW_JOB_FILE`, chuyển product context của CRM thành product queue của ImageFlow, dùng cấu hình:

- `target_format=facebook_album`
- `aspect_ratio=4:5`
- `output_size=1080x1350`
- `fallback_transform=pad_or_smart_crop`

Adapter gọi ImageFlow local tại `IMAGEFLOW_LOCAL_BASE_URL`, mặc định:

```txt
http://127.0.0.1:7096
```

Nếu ImageFlow đang render sản phẩm khác, adapter dừng với lỗi rõ để tránh phá queue đang chạy. Khi queue rảnh, adapter thêm đúng SKU vào queue, chạy CDP queue nếu chưa chạy, chờ `final_facebook_feed_*.jpg`, rồi ghi `manifest.json` vào output để bridge upload asset về CRM.

## Chế độ nhẹ máy

Bridge xử lý tuần tự một job. Vòng polling không claim job mới khi job trước chưa kết thúc.

Bridge có cơ chế giảm tải:

- job `running` quá `locked_until` sẽ được auto-recovery về `queued` trong lần claim tiếp theo;
- khi không có job, polling backoff dần đến tối đa 120 giây;
- adapter local có timeout cứng mặc định 10 phút qua `IMAGEFLOW_ADAPTER_TIMEOUT_MS`;
- nếu Chrome/CDP/profile treo, bridge không giữ `tickRunning` vô hạn và không upload ảnh cũ.

Adapter mặc định chỉ chọn:

- một profile tạo prompt;
- một profile render;
- không fanout đồng thời toàn bộ profile pool.

Có thể thay giới hạn bằng biến local, nhưng không nên tăng khi pool CDP chưa được kiểm tra:

```txt
IMAGEFLOW_CRM_MAX_PROMPT_PROFILES=1
IMAGEFLOW_CRM_MAX_RENDER_PROFILES=1
```

Trước khi thêm job hoặc mở browser, adapter kiểm tra trạng thái local. Nếu queue hoặc CDP runner đang bận, CRM chuyển job sang `needs_user`; không retry mở thêm profile trong cùng lượt.

## Secret production

Worker cần secret:

```txt
IMAGEFLOW_BRIDGE_TOKEN
```

Secret này chỉ dùng để script local upload ảnh và cập nhật trạng thái. Không dùng cho trình duyệt người dùng cuối.

## UI responsive

Màn `/imageflow-bridge` tách 2 giao diện:

- Mobile: card flow, nút lớn, timeline job, không ép table vào màn nhỏ.
- Tablet/PC: metric row, bảng job, panel quy trình và form tạo job bên phải.

## Trạng thái

- `queued`: CRM đã tạo job, chờ local kéo về.
- `running`: local đã claim job.
- `needs_user`: local đã staging job nhưng cần cấu hình hoặc cần thao tác ImageFlow thủ công.
- `completed`: ảnh đã upload về R2/CRM.
- `failed`: lỗi render hoặc upload thật, đã sanitize.
- `cancelled`: job đã hủy nội bộ.
