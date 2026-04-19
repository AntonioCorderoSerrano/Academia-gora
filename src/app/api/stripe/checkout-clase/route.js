import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req) {
  try {
    const { claseId, claseNombre, precio, uid, email, nombre } = await req.json();
    if (!claseId || !precio || !uid) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Verificar que la clase existe y el precio
    const claseSnap = await adminDb.ref(`clases/${claseId}`).once('value');
    const clase = claseSnap.val();
    if (!clase) return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    if (clase.alumnos?.[uid]) return NextResponse.json({ error: 'Ya inscrito' }, { status: 400 });

    // Customer
    const userSnap = await adminDb.ref(`usuarios/${uid}`).once('value');
    const userData = userSnap.val() || {};
    let customerId = userData.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email, name: nombre, metadata: { firebaseUid: uid },
      });
      customerId = customer.id;
      await adminDb.ref(`usuarios/${uid}/stripeCustomerId`).set(customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Inscripción: ${claseNombre}`,
            },
            unit_amount: Math.round(Number(clase.precio) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: {
        uid,
        claseId,
        claseNombre,
        tipo: 'inscripcion_clase',
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-clase error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
