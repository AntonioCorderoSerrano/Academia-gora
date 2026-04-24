import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { vincularEmailSchema, validar } from '@/lib/schemas';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(`inv-email:${ip}`, { max: 5, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: `Demasiados intentos. Espera ${rl.retryAfter}s.` }, { status: 429 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const tutorUid = decoded.uid;

    const body = await req.json();
    const v = validar(vincularEmailSchema, body);
    if (!v.valido) {
      return NextResponse.json({ error: Object.values(v.errores)[0] }, { status: 400 });
    }
    const { hijoId, emailAlumno } = v.datos;

    const [tutorSnap, hijoSnap] = await Promise.all([
      adminDb.ref(`usuarios/${tutorUid}`).once('value'),
      adminDb.ref(`hijos/${tutorUid}/${hijoId}`).once('value'),
    ]);
    const tutorData = tutorSnap.val();
    if (!tutorData || tutorData.role !== 'tutor') {
      return NextResponse.json({ error: 'Solo los tutores pueden invitar' }, { status: 403 });
    }
    if (!hijoSnap.exists()) {
      return NextResponse.json({ error: 'Hijo no encontrado' }, { status: 404 });
    }

    // Busca alumno
    const usersSnap = await adminDb.ref('usuarios').once('value');
    const usuarios = usersSnap.val() || {};
    const match = Object.entries(usuarios).find(
      ([, u]) => u.email?.toLowerCase() === emailAlumno && u.role === 'alumno'
    );
    if (!match) {
      return NextResponse.json({
        error: 'No existe ninguna cuenta de alumno con ese email.'
      }, { status: 404 });
    }
    const [alumnoUid] = match;

    // Si ya está vinculado con otro tutor
    const todosTutores = (await adminDb.ref('hijos').once('value')).val() || {};
    for (const [tUid, hijos] of Object.entries(todosTutores)) {
      if (tUid === tutorUid) continue;
      for (const h of Object.values(hijos)) {
        if (h.vinculadoConUid === alumnoUid) {
          return NextResponse.json({
            error: 'Ese alumno ya está vinculado al perfil de otro tutor.'
          }, { status: 409 });
        }
      }
    }

    // Crea la invitación: el alumno la aceptará desde su perfil
    const invRef = adminDb.ref(`invitacionesVinculacion/${alumnoUid}`).push();
    await invRef.set({
      tutorUid,
      tutorNombre: tutorData.nombre,
      tutorEmail: tutorData.email,
      hijoId,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true, invitacionId: invRef.key });
  } catch (err) {
    console.error('vincular-email:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
