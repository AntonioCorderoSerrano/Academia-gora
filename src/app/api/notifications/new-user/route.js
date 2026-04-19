import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

// Plantilla HTML minimalista y elegante para el correo
function buildEmailHtml({ nombre, email, role, dashboardUrl }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="utf-8"><title>Nueva cuenta pendiente</title></head>
  <body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b18;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 20px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,27,24,.06);">
          <tr>
            <td style="background:#1c1b18;color:#f6f6f5;padding:32px 32px 24px;">
              <p style="margin:0;font-size:12px;letter-spacing:2px;color:#d4a574;text-transform:uppercase;">Academia Ágora</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:400;font-family:Georgia,serif;">
                Nueva cuenta <em style="color:#d4a574;">pendiente</em>
              </h1>
            </td>
          </tr>
          <tr><td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3b3a36;">
              Un nuevo usuario se ha registrado en la plataforma y está esperando tu aprobación.
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f7f4;border-radius:12px;padding:20px;margin:16px 0;">
              <tr><td>
                <p style="margin:0 0 8px;font-size:13px;color:#8b8a7e;">Nombre</p>
                <p style="margin:0 0 16px;font-size:16px;font-weight:500;">${escapeHtml(nombre)}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#8b8a7e;">Correo</p>
                <p style="margin:0 0 16px;font-size:16px;">${escapeHtml(email)}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#8b8a7e;">Rol solicitado</p>
                <p style="margin:0;font-size:16px;text-transform:capitalize;">${escapeHtml(role)}</p>
              </td></tr>
            </table>
            <p style="margin:24px 0 0;">
              <a href="${dashboardUrl}"
                 style="display:inline-block;background:#b8864c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:500;">
                Ir a aprobaciones
              </a>
            </p>
            <p style="margin:24px 0 0;font-size:13px;color:#8b8a7e;line-height:1.5;">
              También debes verificar que el usuario haya confirmado su correo electrónico antes de aprobarlo.
            </p>
          </td></tr>
          <tr><td style="background:#f8f7f4;padding:16px 32px;text-align:center;font-size:12px;color:#8b8a7e;">
            Academia Ágora — Notificación automática
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(req) {
  try {
    const { uid, nombre, email, role } = await req.json();
    if (!uid || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Verificar que el UID existe en la base (anti-spam básico)
    const snap = await adminDb.ref(`usuarios/${uid}`).once('value');
    if (!snap.exists()) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener emails de todos los admins
    const usersSnap = await adminDb.ref('usuarios').once('value');
    const users = usersSnap.val() || {};
    const adminEmails = Object.values(users)
      .filter((u) => u.role === 'admin' && u.email)
      .map((u) => u.email);

    if (adminEmails.length === 0) {
      return NextResponse.json({ sent: 0, note: 'No hay admins configurados' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'Academia Ágora <onboarding@resend.dev>';
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/aprobaciones`;

    if (!apiKey) {
      // No rompemos: si Resend no está configurado, devolvemos 200 con info
      console.warn('RESEND_API_KEY no configurada, se omite envío');
      return NextResponse.json({ sent: 0, note: 'Resend no configurado' });
    }

    const html = buildEmailHtml({ nombre, email, role, dashboardUrl });
    const subject = `Nueva cuenta pendiente de aprobación: ${nombre}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: adminEmails,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend error:', errText);
      return NextResponse.json({ error: 'Error enviando correo', detail: errText }, { status: 502 });
    }

    return NextResponse.json({ sent: adminEmails.length });
  } catch (err) {
    console.error('new-user notification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
