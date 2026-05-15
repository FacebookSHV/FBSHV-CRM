export function createSharedSecrets(
  bytes?: (size: number) => Buffer
): {
  API_KEY_FOR_FACEBOOK_CRM: string;
  WEBHOOK_SECRET_FOR_FACEBOOK_CRM: string;
};

export function maskSecret(value: string): string;
