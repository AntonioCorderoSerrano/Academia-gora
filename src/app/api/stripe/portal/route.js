import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Falta uid' }, { status: 400 });

    const snap = await adminDb.ref(`usuarios/${uid}`).once('value');
    const user = snap.val();
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'Sin customer de Stripe' }, { status: 400 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pagos`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
