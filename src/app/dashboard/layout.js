'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ROLES, SESSION_STATE } from '@/context/AuthContext';
import {
  Home, BookOpen, Users, Calendar, CheckSquare,
  MessageSquare, CreditCard, LogOut, Settings, ShieldCheck,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home, roles: ['*'] },
  { href: '/dashboard/clases', label: 'Clases', icon: BookOpen, roles: ['*'] },
  { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar, roles: ['*'] },
  { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare,
    roles: [ROLES.ADMIN, ROLES.MAESTRO, ROLES.ALUMNO, ROLES.TUTOR] },
  { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare, roles: ['*'] },
  { href: '/dashboard/alumnos', label: 'Usuarios', icon: Users,
    roles: [ROLES.ADMIN, ROLES.MAESTRO] },
  { href: '/dashboard/aprobaciones', label: 'Aprobaciones', icon: ShieldCheck,
    roles: [ROLES.ADMIN] },
  { href: '/dashboard/pagos', label: 'Pagos', icon: CreditCard,
    // maestros no ven pagos (están exentos)
    roles: [ROLES.ADMIN, ROLES.ALUMNO, ROLES.TUTOR] },
  { href: '/dashboard/config', label: 'Configuración', icon: Settings,
    roles: [ROLES.ADMIN] },
];

export default function DashboardLayout({ children }) {
  const { profile, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === SESSION_STATE.UNAUTH) router.push('/login');
    else if (status === SESSION_STATE.UNVERIFIED || status === SESSION_STATE.PENDING) {
      router.push('/login');
    }
  }, [status, router]);

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

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col bg-ink-900 text-ink-100 fixed h-screen">
        <div className="px-6 py-5 border-b border-ink-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-ink-900">A</span>
            </div>
            <span className="font-display text-xl">Academia</span>
          </Link>
        </div>

        <div className="px-4 py-5 flex-1 overflow-y-auto">
          <div className="px-2 mb-3">
            <p className="text-xs uppercase tracking-wider text-ink-500">{profile.role}</p>
            <p className="text-sm truncate">{profile.nombre}</p>
          </div>
          <nav className="space-y-1">
            {visible.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/');
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
          className="m-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-ink-800">
          <LogOut size={18} /> Cerrar sesión
        </button>
      </aside>

      {/* Mobile */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-ink-900 text-ink-50 flex items-center justify-between px-4 py-3 z-40">
        <Link href="/dashboard" className="font-display text-lg">Academia</Link>
        <button onClick={handleLogout} className="text-sm text-ink-300">Salir</button>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-ink-200 flex justify-around py-2 z-40">
        {visible.slice(0, 5).map((n) => (
          <Link key={n.href} href={n.href}
            className="flex flex-col items-center text-[10px] text-ink-600 py-1 px-2">
            <n.icon size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>

      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0">
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
