// Server-to-Server OAuth para Zoom.
// Requiere variables:
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
//   ZOOM_HOST_USER_EMAIL  → email del usuario de Zoom anfitrión (normalmente el owner de la academia)

let cachedToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedExpiry - 60_000) return cachedToken;

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Variables de Zoom no configuradas');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}` },
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Zoom auth falló: ${t}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  cachedExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function zoomFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(data.message || `Zoom API error ${res.status}`);
  }
  return data;
}
