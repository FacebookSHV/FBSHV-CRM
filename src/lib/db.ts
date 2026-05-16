import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getD1Database() {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context.env as { DB?: D1Database }).DB;
  } catch {
    // NEO: Local dev/test không có binding D1 thì service dùng memory store an toàn.
    return undefined;
  }
}
