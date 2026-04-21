import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { preparePagoContext, validarCupo } from '@/lib/pagoHelpers';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { claseId, sedeId, opcionId, conComedor, hijoId } = await req.json();
    if (!claseId || !sedeId || !opcionId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const { uid, clase, customerId } = await preparePagoContext(req, { claseId });

    if (clase.tipo !== 'campamento') {
      return NextResponse.json({ error: 'Tipo de clase no válido' }, { status: 400 });
    }

    const sede = clase.sedes?.[sedeId];
    const opcion = clase.opciones?.[opcionId];
    if (!sede) return NextResponse.json({ error: 'Sede no válida' }, { status: 400 });
    if (!opcion) return NextResponse.json({ error: 'Opción no válida' }, { status: 400 });

    // Validar cupo de la SEDE concreta
    validarCupo(clase, sedeId);

    const precioBase = Math.round(Number(opcion.precio) * 100);
    const precioComedor = conComedor && clase.comedorDisponible
      ? Math.round(Number(clase.precioComedor || 0) * 100)
      : 0;

    const lineItems = [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `${clase.nombre} — ${opcion.label} · ${sede.nombre}`,
        },
        unit_amount: precioBase,
      },
      quantity: 1,
    }];
    if (precioComedor > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Suplemento comedor' },
          unit_amount: precioComedor,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/clases/${claseId}?status=cancel`,
      metadata: {
        uid, claseId, hijoId: hijoId || '',
        tipo: 'inscripcion_campamento',
        sedeId, opcionId,
        conComedor: conComedor ? '1' : '0',
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error('checkout-campamento:', err);
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 500 }
    );
  }
}
