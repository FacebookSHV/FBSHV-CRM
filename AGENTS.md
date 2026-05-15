# AGENTS.md

Dự án này là **FBSHV CRM**.

## Nguyên tắc quan trọng

- Chỉ sửa repo FBSHV CRM.
- Không sửa repo Web Quản Lý TMĐT nếu user chưa cung cấp repo riêng.
- Web Quản Lý TMĐT là hệ thống ngoài, là source of truth cho Product, SKU, Inventory và Order.
- FBSHV CRM chỉ kết nối Web Quản Lý TMĐT qua API/webhook.
- Không tự quản lý tồn kho gốc trong FBSHV CRM.
- Không tự trừ tồn local nếu external API chưa phản hồi thành công.
- Không hard-code secret.
- Không commit `.env`, `.env.local`, `.env.generated.local`, token hoặc API key.
- Không in token/API key/secret ra log.
- Không chạy production write test nếu chưa có `SKU_TEST` riêng và `RUN_EXTERNAL_WRITE_TESTS=true`.

## Mapping secret giữa 2 website

Bên Web Quản Lý TMĐT:

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

Bên FBSHV CRM:

```env
ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
MOCK_ECOMMERCE_API="false"
```

Hai bên dùng chung giá trị key/secret nhưng tên biến khác nhau.

## Cloudflare

FBSHV CRM dùng Cloudflare riêng:

- Worker/app name: `fbshv-crm`
- D1 binding: `DB`
- D1 database name: `fbshv_crm_db`
- D1 database id: `218d0eab-7734-4fda-91b9-e3e2604e6c86`
- R2 binding: `BUCKET`
- R2 bucket name: `fbshv-crm-assets`

Không dùng wrangler config của CRM để set secret cho Web Quản Lý TMĐT.

---
name: fbshv-crm-codex-guardian
description: use this skill when working on the fbshv crm repo, codex prompts, cloudflare/open-next deployment, ecommerce product-sync integration, vietnamese anchor comments, project search hygiene, utf-8/font/mojibake checks, file-size limits, and mobile-first responsive ui reviews. trigger when the user asks to build, edit, review, search, maintain, or qa the fbshv crm project or wants codex instructions that must avoid mixing the separate ecommerce-management repo/cloudflare project.
---

# FBSHV CRM Codex Guardian

## Purpose

Use this skill to keep FBSHV CRM work maintainable, searchable, and safe. It encodes the project rules that must be repeated in Codex prompts and code reviews: two separate websites, no secret leaks, Product Sync only through the ecommerce API, Vietnamese anchor comments, UTF-8/font checks, file-size limits, and mobile-first UI.

## Non-negotiable project boundaries

1. Work only inside the FBSHV CRM repo unless the user explicitly provides the ecommerce-management repo and asks to edit it.
2. Treat Web Quan Ly TMDT as a separate GitHub and Cloudflare project. It is the source of truth for Product, SKU, Inventory, and Order.
3. FBSHV CRM may cache product/inventory data, but must not self-manage root inventory and must not subtract local stock unless the external ecommerce API confirms success.
4. Never hard-code or print secrets. Do not commit `.env`, `.env.local`, `.env.generated.local`, API keys, Cloudflare tokens, or webhook secrets.
5. Keep each source/docs/config file at or below 30 KB. Split files by feature, component, route, provider, schema domain, or doc section when needed.
6. Build UI mobile-first. Mobile uses cards/lists/drawer/bottom navigation; desktop can use fixed sidebar and tables.

## Required architecture reminders

### FBSHV CRM

- repo: `git@github.com:FacebookSHV/FBSHV-CRM.git`
- app/worker name: `fbshv-crm`
- d1 binding: `DB`
- d1 database name: `fbshv_crm_db`
- d1 database id: `218d0eab-7734-4fda-91b9-e3e2604e6c86`
- r2 binding: `BUCKET`
- r2 bucket: `fbshv-crm-assets`
- stack: next.js app router, typescript, tailwind, opennext cloudflare, d1, drizzle, r2, zod, recharts

### Ecommerce API mapping

For the ecommerce-management site:

```env
API_KEY_FOR_FACEBOOK_CRM=<shared_api_key>
WEBHOOK_SECRET_FOR_FACEBOOK_CRM=<shared_webhook_secret>
FACEBOOK_CRM_WEBHOOK_URL=<crm_production_url>/api/webhooks/ecommerce
```

For FBSHV CRM:

```env
ECOMMERCE_API_BASE_URL="https://huyvan-worker-api.nghiemchihuy.workers.dev"
ECOMMERCE_API_KEY=<shared_api_key>
ECOMMERCE_WEBHOOK_SECRET=<shared_webhook_secret>
MOCK_ECOMMERCE_API="true"
```

The shared key and shared webhook secret must match across both systems even though the variable names differ.

## Search and anchor comment convention

When editing code, add short Vietnamese anchor comments with accents near important boundaries so future search is easier. Do not over-comment obvious code.

Use this exact prefix:

```ts
// NEO: Đồng bộ sản phẩm từ Web Quản Lý TMĐT
// NEO: Kiểm tra tồn kho realtime trước khi tạo đơn
// NEO: Không tự trừ tồn local nếu API ngoài chưa xác nhận
// NEO: Xác thực webhook HMAC từ Web Quản Lý TMĐT
// NEO: UI mobile-first, bảng đổi thành card trên màn hình nhỏ
```

Suggested searchable anchors:

- `NEO: Product Sync`
- `NEO: Kiểm tra tồn kho`
- `NEO: Tạo đơn Facebook`
- `NEO: Webhook TMĐT`
- `NEO: Audit log`
- `NEO: Secret mapping`
- `NEO: Mobile-first`

Every new non-trivial module should include 1-3 anchors near integration seams, safety rules, or UI responsive pivots.

## UTF-8 and font hygiene workflow

After every meaningful edit to code/docs/prompts:

1. Verify files are saved as UTF-8.
2. Search for mojibake symptoms such as broken Vietnamese accents, replacement characters, or markers like `U+00C3`, `U+00C2`, and `U+FFFD`.
3. Check anchor comments still display Vietnamese accents correctly.
4. Run the bundled checker when a filesystem is available:

```bash
python /path/to/skill/scripts/check_project_hygiene.py /path/to/FBSHV-CRM
```

If the checker flags a font/encoding issue, fix the file before continuing.

## Codex prompt checklist

When writing a prompt for Codex, include these requirements:

- Only edit FBSHV CRM unless explicitly asked otherwise.
- Do not mix the separate ecommerce-management Cloudflare/repo with CRM.
- Use mock/fallback when secrets are missing.
- Never run production write tests unless `RUN_EXTERNAL_WRITE_TESTS=true`, `SKU_TEST` exists, and the SKU is a dedicated test SKU.
- Keep each file under 30 KB.
- Use Vietnamese anchor comments with accents.
- Run lint, typecheck, tests, size check, build, env check, and Cloudflare dry-run when possible.
- Report skipped production tests and missing secrets clearly in Vietnamese.

See `references/codex-output-template.md` for the preferred final report structure.

## Review workflow

For build/edit/review tasks:

1. Identify whether the task affects UI, Product Sync, webhook, secrets, database, or deployment.
2. Apply the non-negotiable boundaries above.
3. Require mobile-first UI for any frontend change.
4. Require file splitting if any file approaches 30 KB.
5. Require Vietnamese anchor comments at important seams.
6. Run or request these checks: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run size:check`, `npm run build`, `npm run check:env`, and `npx wrangler deploy --dry-run`.
7. Run `scripts/check_project_hygiene.py` to catch file-size, UTF-8, mojibake, and anchor-comment issues.
8. Report what passed, what was skipped, and what user must provide later.
