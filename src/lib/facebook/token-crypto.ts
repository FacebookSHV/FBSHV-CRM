const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveAesKey(encryptionKey: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string, encryptionKey?: string) {
  if (!encryptionKey) {
    throw new Error("BLOCKED_BY_MISSING_SECRET: ENCRYPTION_KEY");
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(encryptionKey);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(token));
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptToken(encryptedToken: string, encryptionKey?: string) {
  if (!encryptionKey) {
    throw new Error("BLOCKED_BY_MISSING_SECRET: ENCRYPTION_KEY");
  }

  const [version, ivValue, encryptedValue] = encryptedToken.split(":");
  if (version !== "v1" || !ivValue || !encryptedValue) {
    throw new Error("Token Facebook đã mã hóa không đúng định dạng.");
  }

  const key = await deriveAesKey(encryptionKey);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivValue) },
    key,
    base64ToBytes(encryptedValue)
  );
  return decoder.decode(decrypted);
}

export function createMockEncryptedToken(label: string) {
  // NEO: Token mock không dùng để gọi Meta thật và không chứa secret production.
  return `mock:${label}`;
}
