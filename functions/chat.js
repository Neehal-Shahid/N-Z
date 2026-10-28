// Cloudflare Pages Function -> served at /chat
export async function onRequestPost({ request }) {
  const up = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': request.headers.get('Authorization') || '' },
    body: await request.text(),
  });
  return new Response(up.body, {
    status: up.status,
    headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
  });
}
