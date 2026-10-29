// One Cloudflare Worker: serves the page, proxies /chat to Z.ai, and syncs chats at /sync.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/chat' && request.method === 'POST') return chat(request);
    if (pathname === '/sync') return sync(request, env);
    return env.ASSETS.fetch(request);
  },
};

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function chat(request) {
  const up = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: request.headers.get('Authorization') || '' },
    body: await request.text(),
  });
  return new Response(up.body, {
    status: up.status,
    headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Each person's chats are stored under a hash of their API key, so only someone with the key can read them.
async function sync(request, env) {
  if (!env.CHATS) return json({ error: 'KV binding CHATS is missing' }, 501);
  const key = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (key.length < 20) return json({ error: 'Missing API key' }, 401);
  const id = 'u:' + (await sha256(key));
  if (request.method === 'GET') {
    const v = await env.CHATS.get(id);
    return new Response(v || '{"chats":[],"del":{}}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  if (request.method === 'PUT') {
    const body = await request.text();
    if (body.length > 5_000_000) return json({ error: 'Too large' }, 413);
    try {
      if (!Array.isArray(JSON.parse(body).chats)) throw 0;
    } catch {
      return json({ error: 'Bad data' }, 400);
    }
    await env.CHATS.put(id, body);
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}
