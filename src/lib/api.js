/**
 * Helper para llamar a la API del backend.
 *
 * En web (Vercel): las rutas /api/* son relativas al dominio actual.
 * En app nativa (Capacitor): el bundle es estático y NO tiene /api/*.
 *   Debe apuntar a tu backend desplegado (Vercel) vía NEXT_PUBLIC_API_URL.
 *
 * Uso:
 *   const res = await apiFetch('/api/stripe/checkout-subscription', { method: 'POST', body: ... })
 */
export function apiUrl(path) {
  // Si es URL absoluta, devolverla tal cual
  if (/^https?:\/\//i.test(path)) return path;

  const base = process.env.NEXT_PUBLIC_API_URL || '';
  // En SSR o navegador web, base puede ir vacío (rutas relativas funcionan)
  if (!base) return path;
  // Asegurar slash único
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}

export async function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options);
}
