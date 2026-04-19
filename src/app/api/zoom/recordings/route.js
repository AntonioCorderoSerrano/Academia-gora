import { NextResponse } from 'next/server';
import { zoomFetch } from '@/lib/zoom';
import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });
    await adminAuth.verifyIdToken(token); // exige sesión válida

    const url = new URL(req.url);
    const meetingId = url.searchParams.get('meetingId');
    if (!meetingId) return NextResponse.json({ error: 'Falta meetingId' }, { status: 400 });

    // Nota: Zoom indexa grabaciones por UUID o ID. Para reuniones recurrentes hay
    // que pasar el UUID doblemente encoded. Aquí asumimos un ID numérico simple.
    const data = await zoomFetch(`/meetings/${meetingId}/recordings`);
    return NextResponse.json({
      recording_files: data.recording_files || [],
      share_url: data.share_url,
      duration: data.duration,
    });
  } catch (err) {
    // Si aún no hay grabación Zoom devuelve 404 — lo tratamos como "sin grabaciones"
    if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
      return NextResponse.json({ recording_files: [] });
    }
    console.error('zoom recordings:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
