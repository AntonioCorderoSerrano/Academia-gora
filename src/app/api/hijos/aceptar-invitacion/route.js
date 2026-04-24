import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const alumnoUid = decoded.uid;

    const { invitacionId } = await req.json();
    if (!invitacionId) return NextResponse.json({ error: 'Falta invitacionId' }, { status: 400 });

    const invSnap = await adminDb.ref(`invitacionesVinculacion/${alumnoUid}/${invitacionId}`).once('value');
    const inv = invSnap.val();
    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    const alumnoSnap = await adminDb.ref(`usuarios/${alumnoUid}`).once('value');
    const alumnoData = alumnoSnap.val();
    if (!alumnoData || alumnoData.role !== 'alumno') {
      return NextResponse.json({ error: 'Solo alumnos pueden aceptar' }, { status: 403 });
    }

    // Verifica que el alumno no esté ya vinculado a otro tutor
    const todosTutores = (await adminDb.ref('hijos').once('value')).val() || {};
    for (const [tUid, hijos] of Object.entries(todosTutores)) {
      for (const h of Object.values(hijos)) {
        if (h.vinculadoConUid === alumnoUid) {
          return NextResponse.json({
            error: 'Ya estás vinculado a otro tutor.'
          }, { status: 409 });
        }
      }
    }

    // Aplica la vinculación
    await adminDb.ref(`hijos/${inv.tutorUid}/${inv.hijoId}`).update({
      vinculadoConUid: alumnoUid,
      vinculadoConEmail: alumnoData.email,
      vinculadoEn: Date.now(),
      metodoVinculacion: 'email',
    });

    // Elimina la invitación (consumida)
    await adminDb.ref(`invitacionesVinculacion/${alumnoUid}/${invitacionId}`).remove();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('aceptar-invitacion:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
