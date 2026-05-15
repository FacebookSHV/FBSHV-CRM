const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, rawBody: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export async function signWebhookBody(secret: string, rawBody: string) {
  return `sha256=${await hmacSha256(secret, rawBody)}`;
}

export async function verifyEcommerceWebhookSignature(
  secret: string,
  rawBody: string,
  headerValue: string | null
) {
  if (!secret || !headerValue?.startsWith("sha256=")) return false;
  const expected = await signWebhookBody(secret, rawBody);
  // NEO: Xác thực webhook HMAC từ Web Quản Lý TMĐT
  return constantTimeEqual(expected, headerValue);
}
