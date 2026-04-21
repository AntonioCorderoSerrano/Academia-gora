import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

/**
 * Calcula cuántas cuotas mensuales quedan hasta junio (incluido)
 * desde el mes actual. Si estamos fuera de temporada, arranca en septiembre próximo.
 * Devuelve { iterations, trialEndTimestamp? }
 */
function calcularCuotasRestantes() {
  const ahora = new Date();
  const mes = ahora.getMonth(); // 0=enero, 8=septiembre, 5=junio, 6=julio

  // Meses "en curso": 8 (sep), 9, 10, 11, 0, 1, 2, 3, 4, 5 (jun) → 10 meses
  const mesesValidos = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];

  if (mesesValidos.includes(mes)) {
    // Cuotas desde el mes actual hasta junio incluido
    const orden = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
    const idx = orden.indexOf(mes);
    const iterations = orden.length - idx;
    return { iterations, inSeason: true };
  }

  // Fuera de temporada (julio o agosto) → activación aplazada a septiembre
  const anio = ahora.getFullYear();
  const sept = new Date(anio, 8, 1, 0, 0, 0); // 1 sep
  if (sept.getTime() < ahora.getTime()) sept.setFullYear(anio + 1);
  return {
    iterations: 10,
    inSeason: false,
    trialEnd: Math.floor(sept.getTime() / 1000),
  };
}

export async function POST(req) {
  try {
    const { uid, email, nombre } = await req.json();
    if (!uid || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
    const usuario = userSnap.val() || {};
    let customerId = usuario.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email, name: nombre,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await adminDb.ref(`usuarios/${uid}/stripeCustomerId`).set(customerId);
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_MONTHLY;
    if (!priceId) {
      return NextResponse.json({ error: 'Precio de suscripción no configurado' }, { status: 500 });
    }

    const { iterations, inSeason, trialEnd } = calcularCuotasRestantes();

    const sessionParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos?status=cancel`,
      metadata: {
        uid,
        tipo: 'suscripcion',
        temporada: inSeason ? 'in_season' : 'off_season',
      },
      subscription_data: {
        // Stripe cancelará automáticamente la suscripción tras `iterations` facturaciones mensuales.
        // Así: si es septiembre → 10 cuotas → cancelación tras junio.
        //      si es febrero → 5 cuotas (feb, mar, abr, may, jun) → cancelación tras junio.
        //      si es julio/agosto → trial hasta 1 sep + 10 cuotas → cancelación tras junio siguiente.
        billing_cycle_anchor_config: undefined, // usamos default
        metadata: { uid, iterations: String(iterations) },
      },
    };

    // Si estamos fuera de temporada, aplazamos el primer cobro al 1 de septiembre.
    if (!inSeason && trialEnd) {
      sessionParams.subscription_data.trial_end = trialEnd;
    }

    // Cancelación automática tras N facturaciones:
    // Stripe no tiene "cancel after N cycles" directo en Checkout, así que lo hacemos
    // vía billing cycle anchor + cancelAt calculado. Añadimos cancelAt en metadata
    // y lo aplicamos desde el webhook 'checkout.session.completed'.
    sessionParams.metadata.cancelAfterIterations = String(iterations);

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-subscription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
