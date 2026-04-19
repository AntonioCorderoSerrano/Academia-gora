'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ROLES, SESSION_STATE } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import {
  Home, BookOpen, Users, Calendar, CheckSquare,
  MessageSquare, CreditCard, LogOut, Settings, ShieldCheck, MoreHorizontal,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home, roles: ['*'], priority: 1 },
  { href: '/dashboard/clases', label: 'Clases', icon: BookOpen, roles: ['*'], priority: 1 },
  { href: '/dashboard/calendario', label: 'Agenda', icon: Calendar, roles: ['*'], priority: 2 },
  { href: '/dashboard/mensajes', label: 'Chat', icon: MessageSquare, roles: ['*'], priority: 2 },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare,
    roles: [ROLES.ADMIN, ROLES.MAESTRO, ROLES.ALUMNO, ROLES.TUTOR], priority: 3 },
  { href: '/dashboard/alumnos', label: 'Usuarios', icon: Users,
    roles: [ROLES.ADMIN, ROLES.MAESTRO], priority: 3 },
  { href: '/dashboard/aprobaciones', label: 'Validar', icon: ShieldCheck,
    roles: [ROLES.ADMIN], priority: 2 },
  { href: '/dashboard/pagos', label: 'Pagos', icon: CreditCard,
    roles: [ROLES.ADMIN, ROLES.ALUMNO, ROLES.TUTOR], priority: 3 },
  { href: '/dashboard/config', label: 'Ajustes', icon: Settings,
    roles: [ROLES.ADMIN], priority: 4 },
];

function etiquetaRol(role) {
  if (role === ROLES.MAESTRO) return 'docente';
  if (role === ROLES.ALUMNO) return 'alumno';
  if (role === ROLES.TUTOR) return 'tutor';
  if (role === ROLES.ADMIN) return 'admin';
  return role;
}

export default function DashboardLayout({ children }) {
  const { profile, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreWrapperRef = useRef(null);

  useEffect(() => {
    if (status === SESSION_STATE.UNAUTH) router.push('/login');
    else if (status === SESSION_STATE.UNVERIFIED || status === SESSION_STATE.PENDING) {
      router.push('/login');
    }
  }, [status, router]);

  // Cerrar cuando cambia de ruta
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Cerrar con ESC
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  if (status !== SESSION_STATE.ACTIVE || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500">
        <div className="animate-pulse font-display text-2xl">cargando…</div>
      </div>
    );
  }

  const visible = NAV.filter(
    (n) => n.roles.includes('*') || n.roles.includes(profile.role)
  );

  const bottomNavItems = visible.sort((a, b) => a.priority - b.priority).slice(0, 4);
  const restNavItems = visible.filter((n) => !bottomNavItems.includes(n));

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex">
      {/* =============== SIDEBAR (desktop + tablet horizontal) =============== */}
      <aside className="hidden lg:flex w-60 xl:w-64 flex-col bg-ink-900 text-ink-100 fixed h-screen z-30">
        <div className="px-5 xl:px-6 py-5 border-b border-ink-800">
          <Logo size="sm" href="/dashboard" variant="light" />
        </div>

        <div className="px-3 xl:px-4 py-5 flex-1 overflow-y-auto">
          <div className="px-2 mb-3">
            <p className="text-xs uppercase tracking-wider text-ink-500">{etiquetaRol(profile.role)}</p>
            <p className="text-sm truncate">{profile.nombre}</p>
          </div>
          <nav className="space-y-1">
            {visible.map((n) => {
              const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href));
              return (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-accent text-ink-900 font-medium'
                      : 'text-ink-300 hover:bg-ink-800 hover:text-ink-50'
                  }`}>
                  <n.icon size={18} strokeWidth={1.75} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <button onClick={handleLogout}
          className="m-3 xl:m-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-ink-800">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>

      {/* =============== TOP BAR (móvil + tablet vertical) =============== */}
      <div className="lg:hidden fixed top-0 inset-x-0 bg-ink-900 text-ink-50 flex items-center justify-between px-4 py-3 z-40 safe-top">
        <Logo size="sm" href="/dashboard" variant="light" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-300 hidden sm:inline">{profile.nombre}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-ink-300 hover:text-ink-50 px-2 py-1.5 -mr-2"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* =============== OVERLAY para cerrar "Más" al tocar fuera =============== */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMoreOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/10 cursor-default"
        />
      )}

      {/* =============== BOTTOM NAV (móvil + tablet vertical) =============== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-ink-200 z-50 safe-bottom">
        <div className="grid grid-cols-5 gap-0.5 px-1 pt-1.5">
          {bottomNavItems.map((n) => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition ${
                  active ? 'text-accent-deep' : 'text-ink-600 hover:text-ink-900'
                }`}>
                <n.icon size={22} strokeWidth={active ? 2 : 1.5} />
                <span className={`text-[10px] mt-0.5 leading-tight ${active ? 'font-semibold' : ''}`}>
                  {n.label}
                </span>
              </Link>
            );
          })}

          {restNavItems.length > 0 ? (
            <div ref={moreWrapperRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={`w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition ${
                  moreOpen || restNavItems.some((n) => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href)))
                    ? 'text-accent-deep' : 'text-ink-600'
                }`}
                aria-haspopup="true"
                aria-expanded={moreOpen}
              >
                <MoreHorizontal size={22} strokeWidth={moreOpen ? 2 : 1.5} />
                <span className="text-[10px] mt-0.5 leading-tight">Más</span>
              </button>

              {moreOpen && (
                <div className="absolute bottom-full right-0 mb-2 min-w-[200px] card p-2 shadow-elegant z-50">
                  <div className="flex flex-col gap-0.5">
                    {restNavItems.map((n) => {
                      const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href));
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition ${
                            active ? 'bg-accent/10 text-accent-deep font-medium' : 'text-ink-700 hover:bg-ink-50'
                          }`}>
                          <n.icon size={16} /> {n.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>
      </nav>

      {/* =============== MAIN =============== */}
      <main className="flex-1 lg:ml-60 xl:ml-64 pt-14 lg:pt-0 pb-24 lg:pb-0 w-full min-w-0">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 lg:py-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
