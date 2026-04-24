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
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoom API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Crea una reunión instantánea en Zoom para la clase.
 * Por defecto usa el usuario definido en ZOOM_HOST_USER_EMAIL.
 */
export async function createZoomMeeting({ topic, agenda = '', duration = 60, startTime, password } = {}) {
  const hostEmail = process.env.ZOOM_HOST_USER_EMAIL;
  if (!hostEmail) throw new Error('ZOOM_HOST_USER_EMAIL no configurado');

  const body = {
    topic: topic || 'Clase en directo',
    type: startTime ? 2 : 1, // 1 = instantánea, 2 = programada
    agenda,
    duration,
    timezone: 'Europe/Madrid',
    settings: {
      join_before_host: false,
      waiting_room: true,
      approval_type: 2, // no registration
      mute_upon_entry: true,
      auto_recording: 'cloud',
      host_video: true,
      participant_video: false,
    },
  };
  if (startTime) body.start_time = startTime;
  if (password) body.password = password;

  return zoomFetch(`/users/${encodeURIComponent(hostEmail)}/meetings`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Obtiene las grabaciones en la nube de una reunión de Zoom.
 * Devuelve { recording_files: [...] } con urls de reproducción.
 */
export async function getZoomRecordings(meetingId) {
  if (!meetingId) throw new Error('meetingId requerido');
  try {
    const data = await zoomFetch(`/meetings/${meetingId}/recordings`);
    return data;
  } catch (err) {
    // Si no hay grabaciones aún, Zoom devuelve 404
    if (err.message.includes('404')) return { recording_files: [] };
    throw err;
  }
}

/**
 * Elimina una reunión.
 */
export async function deleteZoomMeeting(meetingId) {
  return zoomFetch(`/meetings/${meetingId}`, { method: 'DELETE' });
}