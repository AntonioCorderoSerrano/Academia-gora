import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { preparePagoContext, validarCupo } from '@/lib/pagoHelpers';
import { calcularCuotasAcademicas } from '@/lib/claseHelpers';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { claseId, hijoId } = await req.json();
    if (!claseId) return NextResponse.json({ error: 'Falta claseId' }, { status: 400 });

    const { uid, clase, inscripciones, customerId } = await preparePagoContext(req, { claseId });
    if (clase.tipo !== 'regular' || clase.modalidad !== 'academica') {
      return NextResponse.json({ error: 'Tipo de clase no válido' }, { status: 400 });
    }
    validarCupo(clase, inscripciones);

    const cuotasRestantes = calcularCuotasAcademicas(new Date());
    const precio = Math.round(Number(clase.precio_mensual) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'eur',
          recurring: { interval: 'month' },
          product_data: { name: `${clase.nombre} — Curso académico` },
          unit_amount: precio,
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: {
          uid, claseId, tipo: 'academica',
          hijoId: hijoId || '',
          cuotasRestantes: String(cuotasRestantes),
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: { uid, claseId, hijoId: hijoId || '', tipo: 'inscripcion_academica' },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-academica:', err);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
