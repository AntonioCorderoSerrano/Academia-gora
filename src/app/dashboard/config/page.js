'use client';

import { useAuth, ROLES } from '@/context/AuthContext';

export default function ConfigPage() {
  const { profile, hasRole } = useAuth();

  if (!hasRole(ROLES.ADMIN)) {
    return <div className="card p-8 sm:p-10 text-center text-ink-500">Solo administradores.</div>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl sm:text-4xl mb-1 sm:mb-2">Configuración</h1>
      <p className="text-ink-600 mb-6 sm:mb-8 text-sm sm:text-base">
        Ajustes globales de la academia.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg sm:text-xl">Perfil</h3>
          <div className="mt-3 text-sm space-y-1 text-ink-600">
            <p><span className="text-ink-500">Nombre:</span> {profile.nombre}</p>
            <p className="break-all"><span className="text-ink-500">Email:</span> {profile.email}</p>
            <p><span className="text-ink-500">Rol:</span> {profile.role}</p>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg sm:text-xl">Stripe</h3>
          <p className="text-sm text-ink-600 mt-2">
            Gestiona productos y precios desde el dashboard de Stripe.
          </p>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer"
            className="btn-outline text-sm mt-3 inline-flex">
            Abrir Stripe →
          </a>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg sm:text-xl">Zoom</h3>
          <p className="text-sm text-ink-600 mt-2">
            Configura tu app Server-to-Server OAuth en Zoom Marketplace.
          </p>
          <a href="https://marketplace.zoom.us/" target="_blank" rel="noreferrer"
            className="btn-outline text-sm mt-3 inline-flex">
            Abrir Zoom Marketplace →
          </a>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-lg sm:text-xl">Resend</h3>
          <p className="text-sm text-ink-600 mt-2">
            Gestiona dominios y logs de correos enviados.
          </p>
          <a href="https://resend.com/emails" target="_blank" rel="noreferrer"
            className="btn-outline text-sm mt-3 inline-flex">
            Abrir Resend →
          </a>
        </div>
      </div>
    </div>
  );
}
