// Vercel Edge Function -> served at /api/chat (vercel.json maps /chat to it)
export const config = { runtime: 'edge' };
export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
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
