import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// Genera un chatId determinista (mismo par → mismo id), independiente del orden
function chatIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

// Verifica si existe relación legítima entre dos usuarios para abrir un chat:
// - docente <-> alumno: el alumno está inscrito en alguna clase del docente
// - docente <-> tutor:  algún hijo del tutor está inscrito en alguna clase del docente
// - admin puede chatear con cualquiera
async function hayRelacion(uidYo, miPerfil, uidOtro, otroPerfil) {
  if (miPerfil.role === 'admin' || otroPerfil.role === 'admin') return true;

  const docenteUid = miPerfil.role === 'maestro' ? uidYo
    : otroPerfil.role === 'maestro' ? uidOtro : null;
  const otroRol = miPerfil.role === 'maestro' ? otroPerfil.role : miPerfil.role;
  const otroUid = miPerfil.role === 'maestro' ? uidOtro : uidYo;

  if (!docenteUid) return false; // solo se permite docente <-> (alumno|tutor)

  const clasesSnap = await adminDb.ref('clases')
    .orderByChild('maestroId').equalTo(docenteUid).once('value');
  const clases = clasesSnap.val() || {};

  for (const c of Object.values(clases)) {
    if (!c.alumnos) continue;
    if (otroRol === 'alumno' && c.alumnos[otroUid]) return true;
    if (otroRol === 'tutor') {
      const algunHijo = Object.values(c.alumnos).some((a) => a.tutorUid === otroUid);
      if (algunHijo) return true;
    }
  }
  return false;
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uidYo = decoded.uid;

    const { otroUid } = await req.json();
    if (!otroUid || otroUid === uidYo) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 });
    }

    const [miSnap, otroSnap] = await Promise.all([
      adminDb.ref(`usuarios/${uidYo}`).once('value'),
      adminDb.ref(`usuarios/${otroUid}`).once('value'),
    ]);
    const yo = miSnap.val();
    const otro = otroSnap.val();
    if (!yo || !otro) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const permitido = await hayRelacion(uidYo, yo, otroUid, otro);
    if (!permitido) {
      return NextResponse.json({ error: 'No tienes relación con este usuario' }, { status: 403 });
    }

    const chatId = chatIdFor(uidYo, otroUid);
    const chatRef = adminDb.ref(`chatsPrivados/${chatId}/meta`);
    const existSnap = await chatRef.once('value');
    if (!existSnap.exists()) {
      await chatRef.set({
        participantes: { [uidYo]: true, [otroUid]: true },
        nombres: { [uidYo]: yo.nombre, [otroUid]: otro.nombre },
        roles: { [uidYo]: yo.role, [otroUid]: otro.role },
        createdAt: Date.now(),
        createdBy: uidYo,
      });
    }
    return NextResponse.json({ chatId });
  } catch (err) {
    console.error('chat/start:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
