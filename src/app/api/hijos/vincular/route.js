import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

/**
 * POST /api/hijos/vincular
 * Body: { hijoId, emailAlumno }
 *
 * Busca un usuario con rol "alumno" cuyo email coincida y guarda
 * `vinculadoConUid` en el sub-perfil hijo. Esto evita duplicar al niño
 * cuando ya tiene su propia cuenta y su tutor lo añade.
 *
 * Body: { hijoId, emailAlumno: '' }  → desvincula
 */
export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const tutorUid = decoded.uid;

    const { hijoId, emailAlumno } = await req.json();
    if (!hijoId) return NextResponse.json({ error: 'Falta hijoId' }, { status: 400 });

    // Verifica que el hijo existe y pertenece al tutor
    const hijoSnap = await adminDb.ref(`hijos/${tutorUid}/${hijoId}`).once('value');
    if (!hijoSnap.exists()) {
      return NextResponse.json({ error: 'Hijo no encontrado' }, { status: 404 });
    }

    // Sin email = desvincular
    if (!emailAlumno || !emailAlumno.trim()) {
      await adminDb.ref(`hijos/${tutorUid}/${hijoId}/vinculadoConUid`).remove();
      await adminDb.ref(`hijos/${tutorUid}/${hijoId}/vinculadoConEmail`).remove();
      return NextResponse.json({ ok: true, vinculado: false });
    }

    const emailNorm = emailAlumno.trim().toLowerCase();

    // Buscar usuario con ese email Y rol alumno
    const usersSnap = await adminDb.ref('usuarios').once('value');
    const usuarios = usersSnap.val() || {};
    const match = Object.entries(usuarios).find(
      ([, u]) => u.email?.toLowerCase() === emailNorm && u.role === 'alumno'
    );

    if (!match) {
      return NextResponse.json({
        error: 'No existe ninguna cuenta de alumno con ese email. Revisa que el alumno se haya registrado primero.'
      }, { status: 404 });
    }

    const [alumnoUid, alumnoData] = match;

    // Comprobar que ese alumno no esté ya vinculado a otro tutor
    const otrosTutoresSnap = await adminDb.ref('hijos').once('value');
    const otrosTutores = otrosTutoresSnap.val() || {};
    for (const [tUid, hijos] of Object.entries(otrosTutores)) {
      if (tUid === tutorUid) continue;
      for (const [hId, h] of Object.entries(hijos)) {
        if (h.vinculadoConUid === alumnoUid) {
          return NextResponse.json({
            error: 'Ese alumno ya está vinculado al perfil de otro tutor.'
          }, { status: 409 });
        }
      }
    }

    await adminDb.ref(`hijos/${tutorUid}/${hijoId}`).update({
      vinculadoConUid: alumnoUid,
      vinculadoConEmail: emailNorm,
      vinculadoEn: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      vinculado: true,
      alumnoNombre: alumnoData.nombre,
    });
  } catch (err) {
    console.error('hijos/vincular:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
