import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { preparePagoContext, validarCupo } from '@/lib/pagoHelpers';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { claseId, hijoId } = await req.json();
    if (!claseId) return NextResponse.json({ error: 'Falta claseId' }, { status: 400 });

    const { uid, clase, inscripciones, customerId } = await preparePagoContext(req, { claseId });
    if (clase.tipo !== 'regular' || clase.modalidad !== 'duracion') {
      return NextResponse.json({ error: 'Tipo de clase no válido' }, { status: 400 });
    }
    validarCupo(clase, inscripciones);

    const esMensual = clase.unidad_duracion === 'meses';
    const precio = Math.round(Number(esMensual ? clase.precio_mensual : clase.precio_semanal) * 100);
    const interval = esMensual ? 'month' : 'week';
    const numeroPeriodos = Number(clase.numero_periodos);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'eur',
          recurring: { interval },
          product_data: { name: `${clase.nombre} — ${numeroPeriodos} ${clase.unidad_duracion}` },
          unit_amount: precio,
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          uid, claseId, tipo: 'duracion',
          hijoId: hijoId || '',
          numeroPeriodos: String(numeroPeriodos),
          unidad: clase.unidad_duracion,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: { uid, claseId, hijoId: hijoId || '', tipo: 'inscripcion_duracion' },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-duracion:', err);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
