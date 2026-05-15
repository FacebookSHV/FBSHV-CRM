# Hướng dẫn dùng prompt tổng 1 lệnh

## Đặt file

Copy file này vào root repo FBSHV CRM:

```txt
E:\FBSHV-CRM\TASK_CODEX_BUILD_FBSHV_CRM_ONE_SHOT.md
```

## Chạy Codex

```bat
cd /d E:\FBSHV-CRM
codex "Đọc file TASK_CODEX_BUILD_FBSHV_CRM_ONE_SHOT.md và thực hiện toàn bộ. Chỉ sửa repo FBSHV CRM. Không sửa repo Web Quản Lý TMĐT. Nếu thiếu secret thì dùng mock/fallback và báo rõ."
```

## Lưu ý

- Prompt này là 1 lệnh tổng: build MVP, tạo tính năng khung, test, build, dry-run deploy.
- Mỗi file source/docs/config yêu cầu không quá 30KB.
- UI yêu cầu mobile-first responsive.
- Không chứa Cloudflare API token thật.
- Không chạy production write test nếu chưa có SKU test riêng.
