import { writeFileSync } from "node:fs";
import { createSharedSecrets, maskSecret } from "./lib/secrets.mjs";

const secrets = createSharedSecrets();
const content = [
  "# File local bị .gitignore, không commit.",
  `API_KEY_FOR_FACEBOOK_CRM=${secrets.API_KEY_FOR_FACEBOOK_CRM}`,
  `WEBHOOK_SECRET_FOR_FACEBOOK_CRM=${secrets.WEBHOOK_SECRET_FOR_FACEBOOK_CRM}`,
  `ECOMMERCE_API_KEY=${secrets.API_KEY_FOR_FACEBOOK_CRM}`,
  `ECOMMERCE_WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET_FOR_FACEBOOK_CRM}`,
  ""
].join("\n");

writeFileSync(".env.generated.local", content, { encoding: "utf8", mode: 0o600 });
console.log("Đã tạo .env.generated.local với secret mới.");
console.log(`API key: ${maskSecret(secrets.API_KEY_FOR_FACEBOOK_CRM)}`);
console.log(`Webhook secret: ${maskSecret(secrets.WEBHOOK_SECRET_FOR_FACEBOOK_CRM)}`);
