// Notes wall storage for Touch Me Not.
// Uses an Upstash Redis database connected to this Vercel project
// (Vercel dashboard → Storage → Upstash for Redis → Connect to project).
// No packages needed: it talks to Redis over its REST API.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'touch-me-not:notes';
const MAX_NOTES = 500;

async function redis(command) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'storage_not_connected' });

  try {
    if (req.method === 'GET') {
      const rows = await redis(['LRANGE', KEY, '0', String(MAX_NOTES - 1)]);
      // the delete key never leaves the server
      const notes = rows
        .map((s) => { try { const { secret, ...pub } = JSON.parse(s); return pub; } catch { return null; } })
        .filter(Boolean);
      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

      // delete: only with the key the posting device kept
      if (body?.action === 'delete') {
        const id = String(body.id ?? ''), secret = String(body.secret ?? '');
        if (!id || !secret) return res.status(400).json({ error: 'missing_key' });
        const rows = await redis(['LRANGE', KEY, '0', String(MAX_NOTES - 1)]);
        const row = rows.find((s) => { try { const n = JSON.parse(s); return n.id === id && n.secret === secret; } catch { return false; } });
        if (!row) return res.status(404).json({ error: 'not_found' });
        await redis(['LREM', KEY, '1', row]);
        return res.status(200).json({ deleted: id });
      }
      const text = String(body?.text ?? '').trim().slice(0, 280);
      if (!text) return res.status(400).json({ error: 'empty_note' });
      const note = {
        id: globalThis.crypto.randomUUID(),
        name: clean(body?.name, 40) || 'Someone',
        text,
        rating: clean(body?.rating, 20),
        time: Number.isFinite(Number(body?.time)) ? Math.max(0, Math.round(Number(body.time))) : null,
        at: Date.now(),
        secret: String(body?.secret ?? '').slice(0, 80),
      };
      await redis(['LPUSH', KEY, JSON.stringify(note)]);
      await redis(['LTRIM', KEY, '0', String(MAX_NOTES - 1)]);
      const { secret, ...pub } = note;
      return res.status(201).json({ note: pub });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch {
    return res.status(500).json({ error: 'storage_error' });
  }
}
