import { randomBytes } from "node:crypto";

export function createSharedSecrets(bytes = randomBytes) {
  return {
    API_KEY_FOR_FACEBOOK_CRM: `fbcrm_${bytes(24).toString("hex")}`,
    WEBHOOK_SECRET_FOR_FACEBOOK_CRM: `whsec_${bytes(32).toString("hex")}`
  };
}

export function maskSecret(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
