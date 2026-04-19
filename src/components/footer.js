// components/FooterLegal.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FooterLegal() {
  const pathname = usePathname();
  
  // Solo mostrar en páginas públicas (no en dashboard)
  const publicPaths = ['/', '/register', '/terminos', '/aviso-legal', '/privacidad', '/cookies'];
  const isPublicPage = publicPaths.includes(pathname);
  
  if (!isPublicPage) return null;
  
  return (
    <footer className="border-t border-ink-200 py-6 px-4 sm:px-6 bg-white/50 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-500">
          <Link href="/terminos-y-condiciones" className="hover:text-accent-deep transition-colors">
            Términos y Condiciones
          </Link>
          <Link href="/aviso-legal" className="hover:text-accent-deep transition-colors">
            Aviso Legal
          </Link>
          <Link href="/politica-de-privacidad" className="hover:text-accent-deep transition-colors">
            Política de Privacidad
          </Link>
          <Link href="/politica-de-cookies" className="hover:text-accent-deep transition-colors">
            Política de Cookies
          </Link>
        </div>
        <p className="text-center text-xs text-ink-400 mt-3">
          © {new Date().getFullYear()} Academia Ágora. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}