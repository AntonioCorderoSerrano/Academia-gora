import { NextResponse } from 'next/server';
import { zoomFetch } from '@/lib/zoom';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Verificar token de Firebase
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { claseId, topic, start_time, duration } = await req.json();
    if (!claseId) return NextResponse.json({ error: 'Falta claseId' }, { status: 400 });

    // Verificar que el usuario es maestro de esta clase (o admin)
    const [claseSnap, userSnap] = await Promise.all([
      adminDb.ref(`clases/${claseId}`).once('value'),
      adminDb.ref(`usuarios/${uid}`).once('value'),
    ]);
    const clase = claseSnap.val();
    const usuario = userSnap.val();
    if (!clase) return NextResponse.json({ error: 'Clase no existe' }, { status: 404 });
    if (clase.maestroId !== uid && usuario?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const hostEmail = process.env.ZOOM_HOST_USER_EMAIL || 'me';

    const body = {
      topic: topic || clase.nombre,
      type: start_time ? 2 : 1, // 1=instantánea, 2=programada
      duration: duration || 60,
      timezone: 'Europe/Madrid',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'cloud', // grabar en la nube
      },
    };
    if (start_time) body.start_time = start_time;

    const meeting = await zoomFetch(`/users/${encodeURIComponent(hostEmail)}/meetings`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Guardamos solo lo necesario en RTDB (nunca el start_url es secreto para otros)
    const stored = {
      id: meeting.id,
      topic: meeting.topic,
      join_url: meeting.join_url,
      start_url: meeting.start_url,
      start_time: meeting.start_time || null,
      duration: meeting.duration || duration || 60,
      createdAt: Date.now(),
      createdBy: uid,
    };
    await adminDb.ref(`clases/${claseId}/zoomMeeting`).set(stored);

    return NextResponse.json({ meeting: stored });
  } catch (err) {
    console.error('zoom create-meeting:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
