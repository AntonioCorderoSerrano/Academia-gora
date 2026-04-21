import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { preparePagoContext, validarCupo } from '@/lib/pagoHelpers';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { claseId, cantidad, hijoId } = await req.json();
    if (!claseId || !cantidad) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(100, Number(cantidad)));

    const { uid, clase, customerId } = await preparePagoContext(req, { claseId });

    if (clase.tipo !== 'privada') {
      return NextResponse.json({ error: 'Tipo de clase no válido' }, { status: 400 });
    }

    validarCupo(clase);

    const precioUnitario = Math.round(Number(clase.precioUnitario) * 100);
    const unidadLabel = clase.unidad === 'horas' ? 'horas' : 'días';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${clase.nombre} — ${qty} ${unidadLabel}`,
          },
          unit_amount: precioUnitario,
        },
        quantity: qty,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: {
        uid, claseId, hijoId: hijoId || '',
        tipo: 'inscripcion_privada',
        cantidad: String(qty),
        unidad: clase.unidad,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-privada:', err);
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 500 }
    );
  }
}
