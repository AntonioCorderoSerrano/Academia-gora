import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

async function verify(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw Object.assign(new Error('Sin token'), { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

async function puedeGestionar(uid, claseId) {
  const [userSnap, claseSnap] = await Promise.all([
    adminDb.ref(`usuarios/${uid}`).once('value'),
    adminDb.ref(`clases/${claseId}`).once('value'),
  ]);
  const user = userSnap.val();
  const clase = claseSnap.val();
  if (!user || !clase) return { ok: false, status: 404, msg: 'No encontrado' };
  if (user.role === 'admin') return { ok: true, clase };
  if (clase.maestroId === uid) return { ok: true, clase };
  return { ok: false, status: 403, msg: 'Sin permiso' };
}

// POST = añadir alumno / DELETE = quitar alumno
export async function POST(req) {
  try {
    const uid = await verify(req);
    const { claseId, alumnoUid } = await req.json();
    if (!claseId || !alumnoUid)
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const chk = await puedeGestionar(uid, claseId);
    if (!chk.ok) return NextResponse.json({ error: chk.msg }, { status: chk.status });

    // Validar cupo
    const inscritos = chk.clase.alumnos ? Object.keys(chk.clase.alumnos).length : 0;
    if (inscritos >= (chk.clase.cupoMax || 0)) {
      return NextResponse.json({ error: 'Clase completa' }, { status: 409 });
    }

    // Verificar que el alumno existe y está aprobado
    const alumnoSnap = await adminDb.ref(`usuarios/${alumnoUid}`).once('value');
    const alumno = alumnoSnap.val();
    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 });
    if (!alumno.approved) return NextResponse.json({ error: 'Alumno no aprobado' }, { status: 400 });

    await adminDb.ref(`clases/${claseId}/alumnos/${alumnoUid}`).set({
      nombre: alumno.nombre,
      email: alumno.email,
      inscritoEn: Date.now(),
      agregadoManual: true,
      agregadoPor: uid,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('alumnos POST:', err);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(req) {
  try {
    const uid = await verify(req);
    const { claseId, alumnoUid } = await req.json();
    if (!claseId || !alumnoUid)
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const chk = await puedeGestionar(uid, claseId);
    if (!chk.ok) return NextResponse.json({ error: chk.msg }, { status: chk.status });

    await adminDb.ref(`clases/${claseId}/alumnos/${alumnoUid}`).remove();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('alumnos DELETE:', err);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
