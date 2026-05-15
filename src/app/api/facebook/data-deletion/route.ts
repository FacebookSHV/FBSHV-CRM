export const runtime = "nodejs";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  return jsonResponse({
    status: "ok",
    message: "Facebook user data deletion callback is available.",
    url: "https://fbshv-crm.ngchihuy.workers.dev/data-deletion",
  });
}

export async function POST() {
  const confirmationCode = `fbshv_delete_${Date.now()}`;

  return jsonResponse({
    url: "https://fbshv-crm.ngchihuy.workers.dev/data-deletion",
    confirmation_code: confirmationCode,
  });
}
