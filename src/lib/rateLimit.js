// Rate limiter simple en memoria. Para producción con varias instancias
// usa Redis (Upstash) en su lugar.
const hits = new Map();

export function rateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const rec = hits.get(key) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + windowMs;
  }
  rec.count += 1;
  hits.set(key, rec);
  if (rec.count > max) {
    return {
      ok: false,
      retryAfter: Math.ceil((rec.reset - now) / 1000),
    };
  }
  return { ok: true, remaining: max - rec.count };
}

// Limpieza periódica
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits.entries()) {
      if (now > v.reset + 60_000) hits.delete(k);
    }
  }, 60_000).unref?.();
}

// Extrae IP segura desde headers
export function getClientIP(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
