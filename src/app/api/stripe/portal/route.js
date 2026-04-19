import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { uid } = await req.json();
    const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
    const customerId = userSnap.val()?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: 'Sin customer de Stripe' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
