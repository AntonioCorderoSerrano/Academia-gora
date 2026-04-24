import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await onSubscriptionChanged(event.data.object);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function onCheckoutCompleted(session) {
  const { uid, tipo, claseId, hijoId } = session.metadata || {};
  if (!uid) return;

  const pagoRef = adminDb.ref(`pagos/${uid}`).push();
  await pagoRef.set({
    stripeSessionId: session.id,
    stripeSubscriptionId: session.subscription || null,
    amount: session.amount_total,
    currency: session.currency,
    status: session.payment_status,
    claseId: claseId || null,
    tipo,
    concepto: await construirConcepto(claseId, tipo, session.metadata),
    createdAt: Date.now(),
  });

  if (!claseId) return;

  const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
  const u = userSnap.val() || {};

  let hijoData = null;
  let alumnoVinculadoUid = null;
  if (hijoId) {
    const hijoSnap = await adminDb.ref(`hijos/${uid}/${hijoId}`).once('value');
    hijoData = hijoSnap.val();
    if (hijoData?.vinculadoConUid) alumnoVinculadoUid = hijoData.vinculadoConUid;
  }

  const inscritoUid = alumnoVinculadoUid || hijoId || uid;

  const inscripcion = {
    tutorUid: hijoId ? uid : null,
    tutorNombre: hijoId ? u.nombre : null,
    tutorEmail: hijoId ? u.email : null,
    nombre: hijoData ? `${hijoData.nombre} ${hijoData.apellidos || ''}`.trim() : u.nombre,
    email: u.email,
    hijoId: hijoId || null,
    vinculadoConUid: alumnoVinculadoUid || null,
    inscritoEn: Date.now(),
    pagoId: pagoRef.key,
    stripeSessionId: session.id,
    stripeSubscriptionId: session.subscription || null,
  };

  if (tipo === 'inscripcion_campamento') {
    inscripcion.sedeId = session.metadata.sedeId;
    inscripcion.opcionId = session.metadata.opcionId;
    inscripcion.conComedor = session.metadata.conComedor === '1';
  }
  if (hijoData) {
    inscripcion.alergias = hijoData.alergias || '';
    inscripcion.medicacion = hijoData.medicacion || '';
    inscripcion.observaciones = hijoData.observaciones || '';
    inscripcion.contactoEmergencia = hijoData.contactoEmergencia || '';
    inscripcion.telefonoEmergencia = hijoData.telefonoEmergencia || '';
    inscripcion.fechaNacimiento = hijoData.fechaNacimiento || '';
  }
  if (tipo === 'inscripcion_privada') {
    inscripcion.cantidad = Number(session.metadata.cantidad || 1);
    inscripcion.unidad = session.metadata.unidad;
  }

  await adminDb.ref(`clases/${claseId}/alumnos/${inscritoUid}`).set(inscripcion);

  if (hijoId) {
    await adminDb.ref(`tutoresDeClase/${claseId}/${uid}`).set(true);
  }

  // NOTIFICACIÓN al tutor cuando se inscribe un hijo
  // También al alumno (si es vinculación) para que lo vea en su panel
  const claseSnap = await adminDb.ref(`clases/${claseId}/nombre`).once('value');
  const claseNombre = claseSnap.val() || 'una clase';

  if (hijoId) {
    const notifRef = adminDb.ref(`notificaciones/${uid}`).push();
    await notifRef.set({
      tipo: 'hijo_inscrito',
      claseId,
      claseNombre,
      hijoNombre: inscripcion.nombre,
      createdAt: Date.now(),
      leido: false,
    });
  }
  if (alumnoVinculadoUid) {
    const notifRef = adminDb.ref(`notificaciones/${alumnoVinculadoUid}`).push();
    await notifRef.set({
      tipo: 'inscrito_por_tutor',
      claseId,
      claseNombre,
      tutorNombre: u.nombre,
      createdAt: Date.now(),
      leido: false,
    });
  }

  if (session.subscription && (tipo === 'inscripcion_academica' || tipo === 'inscripcion_duracion')) {
    await programarCancelacion(session.subscription, tipo, session.metadata);
  }

  if (tipo === 'inscripcion_academica') {
    await adminDb.ref(`usuarios/${uid}`).update({
      suscripcionActiva: true,
      suscripcionDesde: Date.now(),
      stripeSubscriptionId: session.subscription,
    });
  }
}

async function programarCancelacion(subscriptionId, tipo, metadata) {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.schedule) return;
    let iterations;
    if (tipo === 'inscripcion_academica') iterations = Number(metadata.cuotasRestantes) || 10;
    else iterations = Number(metadata.numeroPeriodos) || 1;
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
    const phase = schedule.phases[0];
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: 'cancel',
      phases: [{
        items: phase.items.map((i) => ({ price: i.price, quantity: i.quantity })),
        iterations,
      }],
    });
  } catch (err) { console.error('Error programando cancelación:', err.message); }
}

async function onSubscriptionChanged(sub) {
  const usersSnap = await adminDb.ref('usuarios')
    .orderByChild('stripeCustomerId').equalTo(sub.customer).once('value');
  const users = usersSnap.val() || {};
  const uid = Object.keys(users)[0];
  if (!uid) return;
  const activa = sub.status === 'active' || sub.status === 'trialing';
  if (sub.metadata?.tipo === 'academica' || users[uid]?.stripeSubscriptionId === sub.id) {
    await adminDb.ref(`usuarios/${uid}`).update({
      suscripcionActiva: activa,
      suscripcionStatus: sub.status,
    });
  }
}

async function construirConcepto(claseId, tipo, metadata) {
  if (!claseId) return 'Pago';
  try {
    const snap = await adminDb.ref(`clases/${claseId}/nombre`).once('value');
    const nombre = snap.val() || 'Clase';
    const mapa = {
      inscripcion_academica: `${nombre} — Curso académico`,
      inscripcion_duracion: `${nombre} — Duración`,
      inscripcion_privada: `${nombre} — ${metadata.cantidad} ${metadata.unidad}`,
      inscripcion_campamento: `${nombre} — Campamento`,
    };
    return mapa[tipo] || nombre;
  } catch { return 'Inscripción'; }
}
