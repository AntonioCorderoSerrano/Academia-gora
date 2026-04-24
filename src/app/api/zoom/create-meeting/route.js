import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createZoomMeeting } from '@/lib/zoom';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const { claseId, topic } = await req.json();
    if (!claseId) return NextResponse.json({ error: 'Falta claseId' }, { status: 400 });

    const [uSnap, cSnap] = await Promise.all([
      adminDb.ref(`usuarios/${decoded.uid}`).once('value'),
      adminDb.ref(`clases/${claseId}`).once('value'),
    ]);
    const user = uSnap.val();
    const clase = cSnap.val();
    if (!clase) return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    const puede = user?.role === 'admin' || clase.maestroId === decoded.uid;
    if (!puede) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const meeting = await createZoomMeeting({ topic: topic || clase.nombre });
    await adminDb.ref(`clases/${claseId}/zoomMeeting`).set({
      id: meeting.id,
      join_url: meeting.join_url,
      start_url: meeting.start_url,
      password: meeting.password || null,
      createdAt: Date.now(),
    });

    return NextResponse.json({ meeting });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
