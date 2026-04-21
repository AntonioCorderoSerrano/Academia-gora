import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { stripe } from '@/lib/stripe';

/**
 * Verifica el ID token y devuelve { uid, userData, clase, customerId }
 * Lanza error si algo falla.
 */
export async function preparePagoContext(req, { claseId, needsClase = true } = {}) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw Object.assign(new Error('Sin token'), { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
  const userData = userSnap.val();
  if (!userData) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  if (!userData.approved) throw Object.assign(new Error('Cuenta no aprobada'), { status: 403 });

  let clase = null;
  if (needsClase) {
    const claseSnap = await adminDb.ref(`clases/${claseId}`).once('value');
    clase = claseSnap.val();
    if (!clase) throw Object.assign(new Error('Clase no encontrada'), { status: 404 });
  }

  // Reutilizar o crear customer
  let customerId = userData.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.nombre,
      metadata: { firebaseUid: uid },
    });
    customerId = customer.id;
    await adminDb.ref(`usuarios/${uid}/stripeCustomerId`).set(customerId);
  }

  return { uid, userData, clase, customerId };
}

/**
 * Valida que haya cupo antes de permitir el pago.
 * Lanza error si no hay cupo.
 */
export function validarCupo(clase, sedeId = null) {
  if (!clase.alumnos) return;
  const inscritos = sedeId
    ? Object.values(clase.alumnos).filter((a) => a.sedeId === sedeId).length
    : Object.keys(clase.alumnos).length;

  const cupo = sedeId
    ? (clase.sedes?.[sedeId]?.cupoMax || 0)
    : (clase.cupoMax || 0);

  if (inscritos >= cupo) {
    throw Object.assign(new Error('No hay plazas disponibles'), { status: 409 });
  }
}
