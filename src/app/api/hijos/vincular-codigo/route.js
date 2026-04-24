import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { vincularCodigoSchema, validar } from '@/lib/schemas';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Rate limit por IP: máx 10 intentos/minuto (evita brute-force del código)
    const ip = getClientIP(req);
    const rl = rateLimit(`vincular:${ip}`, { max: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: `Demasiados intentos. Espera ${rl.retryAfter}s.` }, { status: 429 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const tutorUid = decoded.uid;

    const body = await req.json();
    const v = validar(vincularCodigoSchema, body);
    if (!v.valido) {
      return NextResponse.json({ error: Object.values(v.errores)[0] }, { status: 400 });
    }
    const { hijoId, codigo } = v.datos;

    // Verifica que el que llama es tutor y dueño del hijo
    const [tutorSnap, hijoSnap] = await Promise.all([
      adminDb.ref(`usuarios/${tutorUid}`).once('value'),
      adminDb.ref(`hijos/${tutorUid}/${hijoId}`).once('value'),
    ]);
    const tutorData = tutorSnap.val();
    if (!tutorData || tutorData.role !== 'tutor') {
      return NextResponse.json({ error: 'Solo los tutores pueden vincular' }, { status: 403 });
    }
    if (!hijoSnap.exists()) {
      return NextResponse.json({ error: 'Hijo no encontrado' }, { status: 404 });
    }

    // Busca un alumno con ese código
    const usersSnap = await adminDb.ref('usuarios').once('value');
    const usuarios = usersSnap.val() || {};
    const match = Object.entries(usuarios).find(
      ([, u]) => u.codigoAlumno === codigo && u.role === 'alumno'
    );
    if (!match) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 404 });
    }
    const [alumnoUid, alumnoData] = match;

    // Verifica que no esté ya vinculado a otro tutor
    const todosTutores = (await adminDb.ref('hijos').once('value')).val() || {};
    for (const [tUid, hijos] of Object.entries(todosTutores)) {
      if (tUid === tutorUid) continue;
      for (const h of Object.values(hijos)) {
        if (h.vinculadoConUid === alumnoUid) {
          return NextResponse.json({
            error: 'Este alumno ya está vinculado al perfil de otro tutor.'
          }, { status: 409 });
        }
      }
    }

    // Rotar código tras uso exitoso (un código = un uso)
    const nuevoCodigo = String(Math.floor(100000 + Math.random() * 900000));
    await adminDb.ref(`usuarios/${alumnoUid}/codigoAlumno`).set(nuevoCodigo);

    // Vincula
    await adminDb.ref(`hijos/${tutorUid}/${hijoId}`).update({
      vinculadoConUid: alumnoUid,
      vinculadoConEmail: alumnoData.email,
      vinculadoEn: Date.now(),
      metodoVinculacion: 'codigo',
    });

    return NextResponse.json({
      ok: true,
      alumnoNombre: alumnoData.nombre,
    });
  } catch (err) {
    console.error('vincular-codigo:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
