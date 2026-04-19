import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

// En Next 14 app router, para webhooks necesitamos el raw body.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { uid, tipo, claseId, claseNombre } = session.metadata || {};
        if (!uid) break;

        const pagoRef = adminDb.ref(`pagos/${uid}`).push();
        await pagoRef.set({
          stripeSessionId: session.id,
          amount: session.amount_total,
          currency: session.currency,
          status: session.payment_status,
          concepto: tipo === 'suscripcion'
            ? 'Suscripción mensual'
            : `Inscripción: ${claseNombre}`,
          tipo,
          createdAt: Date.now(),
        });

        if (tipo === 'suscripcion') {
          await adminDb.ref(`usuarios/${uid}`).update({
            suscripcionActiva: true,
            suscripcionDesde: Date.now(),
            stripeSubscriptionId: session.subscription,
          });
        }

        if (tipo === 'inscripcion_clase' && claseId) {
          const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
          const u = userSnap.val();
          await adminDb.ref(`clases/${claseId}/alumnos/${uid}`).set({
            nombre: u?.nombre || 'Alumno',
            email: u?.email,
            inscritoEn: Date.now(),
            pagoId: pagoRef.key,
          });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // Buscar usuario por customerId
        const usersSnap = await adminDb.ref('usuarios')
          .orderByChild('stripeCustomerId')
          .equalTo(sub.customer)
          .once('value');
        const users = usersSnap.val() || {};
        const uid = Object.keys(users)[0];
        if (uid) {
          await adminDb.ref(`usuarios/${uid}`).update({
            suscripcionActiva: sub.status === 'active' || sub.status === 'trialing',
            suscripcionStatus: sub.status,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn('Pago fallido:', invoice.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
