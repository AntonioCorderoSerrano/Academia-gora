import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { uid, email, nombre } = await req.json();
    if (!uid || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Reutilizar o crear customer de Stripe
    const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
    const userData = userSnap.val() || {};
    let customerId = userData.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: nombre,
        metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await adminDb.ref(`usuarios/${uid}/stripeCustomerId`).set(customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUBSCRIPTION_MONTHLY,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos?status=cancel`,
      metadata: { uid, tipo: 'suscripcion' },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-subscription error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
