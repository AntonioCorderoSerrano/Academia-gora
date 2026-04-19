'use client';

import { useAuth, ROLES } from '@/context/AuthContext';

export default function ConfigPage() {
  const { profile, hasRole } = useAuth();

  if (!hasRole(ROLES.ADMIN)) {
    return <div className="card p-10 text-center text-ink-500">Solo administradores.</div>;
  }

  return (
    <div>
      <h1 className="font-display text-4xl mb-2">Configuración</h1>
      <p className="text-ink-600 mb-8">Ajustes globales de la academia.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="font-display text-xl">Perfil</h3>
          <div className="mt-3 text-sm space-y-1 text-ink-600">
            <p><span className="text-ink-500">Nombre:</span> {profile.nombre}</p>
            <p><span className="text-ink-500">Email:</span> {profile.email}</p>
            <p><span className="text-ink-500">Rol:</span> {profile.role}</p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-xl">Stripe</h3>
          <p className="text-sm text-ink-600 mt-2">
            Gestiona productos y precios desde el dashboard de Stripe.
          </p>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noreferrer"
            className="btn-outline text-sm mt-3 inline-flex"
          >
            Abrir Stripe →
          </a>
        </div>
      </div>
    </div>
  );
}
