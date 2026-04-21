import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    // Verificar sesión Firebase
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Sin token' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { claseId } = await req.json();
    if (!claseId) return NextResponse.json({ error: 'Falta claseId' }, { status: 400 });

    // Cargar clase y usuario (server-side, evita trampas del cliente)
    const [claseSnap, userSnap] = await Promise.all([
      adminDb.ref(`clases/${claseId}`).once('value'),
      adminDb.ref(`usuarios/${uid}`).once('value'),
    ]);
    const clase = claseSnap.val();
    const usuario = userSnap.val();

    if (!clase) return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    if (!usuario) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (!usuario.approved) {
      return NextResponse.json({ error: 'Cuenta pendiente de aprobación' }, { status: 403 });
    }

    // Si ya está inscrito
    if (clase.alumnos?.[uid]) {
      return NextResponse.json({ alreadyEnrolled: true });
    }

    // Validar cupo
    const ocupacion = clase.alumnos ? Object.keys(clase.alumnos).length : 0;
    if (ocupacion >= (clase.cupoMax || 0)) {
      return NextResponse.json({ error: 'La clase está completa' }, { status: 409 });
    }

    // Bypass para suscriptores activos: inscripción directa sin Stripe
    if (usuario.suscripcionActiva) {
      await adminDb.ref(`clases/${claseId}/alumnos/${uid}`).set({
        nombre: usuario.nombre,
        email: usuario.email,
        inscritoEn: Date.now(),
        viaSuscripcion: true,
      });
      return NextResponse.json({ alreadyEnrolled: true, viaSuscripcion: true });
    }

    // Validar precio
    const precio = Number(clase.precio);
    if (!precio || precio <= 0) {
      return NextResponse.json({ error: 'Precio de clase inválido' }, { status: 400 });
    }

    // Garantizar customer Stripe
    let customerId = usuario.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email,
        name: usuario.nombre,
        metadata: { firebaseUid: uid },
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
            product_data: { name: `Inscripción: ${clase.nombre}` },
            unit_amount: Math.round(precio * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: {
        uid,
        claseId,
        claseNombre: clase.nombre,
        tipo: 'inscripcion_clase',
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-clase:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
