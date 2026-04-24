import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Llamado al registrarse para notificar a admins. Stub: usa Resend si está configurado.
export async function POST(req) {
  try {
    const { email, nombre, role } = await req.json();
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: true, skipped: true });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        subject: `Nuevo registro en Skolium: ${nombre}`,
        html: `<p>Nuevo usuario registrado:</p><ul><li>Nombre: ${nombre}</li><li>Email: ${email}</li><li>Rol: ${role}</li></ul>`,
      }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
