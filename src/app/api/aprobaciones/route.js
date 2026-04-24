import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

async function verifyAdmin(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw Object.assign(new Error('Sin token'), { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb.ref(`usuarios/${decoded.uid}`).once('value');
  const user = userSnap.val();
  if (!user || user.role !== 'admin') {
    throw Object.assign(new Error('Solo admins'), { status: 403 });
  }
  return decoded.uid;
}

// POST → aprobar: body { uid }
export async function POST(req) {
  try {
    const adminUid = await verifyAdmin(req);
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Falta uid' }, { status: 400 });

    await adminDb.ref(`usuarios/${uid}`).update({
      approved: true,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

// DELETE → rechazar (borra la cuenta): body { uid }
export async function DELETE(req) {
  try {
    await verifyAdmin(req);
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Falta uid' }, { status: 400 });

    // Borrar usuario de Auth y de RTDB
    try { await adminAuth.deleteUser(uid); } catch {}
    await adminDb.ref(`usuarios/${uid}`).remove();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
