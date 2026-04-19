'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SESSION_STATE } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { MailCheck, Clock, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { login, logout, status, resendVerification, refreshStatus } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === SESSION_STATE.ACTIVE) router.push('/dashboard');
  }, [status, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      toast.error(
        err.code === 'auth/too-many-requests'
          ? 'Demasiados intentos. Espera un momento.'
          : 'Credenciales inválidas'
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === SESSION_STATE.UNVERIFIED) {
    return (
      <StatusScreen
        icon={MailCheck}
        titulo="Verifica tu correo"
        texto="Hemos enviado un enlace a tu email. Ábrelo para confirmar la cuenta. Revisa la carpeta de spam si no lo ves."
        acciones={[
          {
            label: 'Reenviar correo',
            onClick: async () => {
              try { await resendVerification(); toast.success('Correo reenviado'); }
              catch { toast.error('Espera un momento antes de reintentar'); }
            },
            variant: 'accent',
          },
          { label: 'Ya lo confirmé', onClick: () => refreshStatus(), variant: 'outline', icon: RefreshCw },
          { label: 'Cerrar sesión', onClick: () => logout(), variant: 'ghost' },
        ]}
      />
    );
  }

  if (status === SESSION_STATE.PENDING) {
    return (
      <StatusScreen
        icon={Clock}
        titulo="Cuenta pendiente"
        texto="Un administrador debe validar tu cuenta antes de que puedas acceder. Te avisaremos por correo cuando esté lista."
        acciones={[
          { label: 'Volver a comprobar', onClick: () => refreshStatus(), variant: 'outline', icon: RefreshCw },
          { label: 'Cerrar sesión', onClick: () => logout(), variant: 'ghost' },
        ]}
      />
    );
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      {/* Panel oscuro - desktop y tablet horizontal */}
      <aside className="hidden md:flex flex-col justify-between bg-ink-900 text-ink-50 p-6 md:p-8 lg:p-12 relative overflow-hidden">
        <Logo size="md" href="/" variant="light" />
        <div className="my-8">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl leading-tight">
            Bienvenido/a<br/>
            <em className="text-accent-soft font-normal italic">de vuelta.</em>
          </h2>
          <p className="mt-3 md:mt-4 text-ink-300 max-w-sm text-sm md:text-base">
            Accede para continuar con tus clases, gestionar pagos y comunicarte con tu comunidad.
          </p>
        </div>
        <p className="text-xs md:text-sm text-ink-400 font-display italic">— Academia Ágora</p>
        <div className="absolute -right-20 -bottom-20 h-60 md:h-80 w-60 md:w-80 rounded-full bg-accent-deep/30 blur-3xl pointer-events-none" />
      </aside>

      {/* Form */}
      <section className="flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10 md:py-12 min-h-screen md:min-h-0">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <Logo size="md" className="md:hidden mb-5 sm:mb-6" />
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Iniciar sesión</h1>
          <p className="mt-1 sm:mt-2 text-ink-600 text-sm sm:text-base">Introduce tus credenciales.</p>

          <div className="mt-5 sm:mt-8 space-y-3.5 sm:space-y-4">
            <div>
              <label className="text-sm text-ink-700">Correo electrónico</label>
              <input type="email" required className="field mt-1"
                autoComplete="email" inputMode="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-ink-700">Contraseña</label>
              <input type="password" required className="field mt-1"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full mt-5 sm:mt-6">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-5 sm:mt-6 text-sm text-ink-600 text-center md:text-left">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-accent-deep underline-offset-2 hover:underline">
              Crear una
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function StatusScreen({ icon: Icon, titulo, texto, acciones }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
      <div className="card p-5 sm:p-8 md:p-10 max-w-md w-full text-center">
        <Logo size="sm" href={null} className="mx-auto mb-5 sm:mb-6" />
        <div className="mx-auto h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-accent/15 flex items-center justify-center">
          <Icon size={20} className="text-accent-deep sm:w-[22px] sm:h-[22px]" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl mt-3 sm:mt-5">{titulo}</h1>
        <p className="text-ink-600 mt-2 text-sm sm:text-base">{texto}</p>
        <div className="mt-5 sm:mt-6 flex flex-col gap-2">
          {acciones.map((a, i) => {
            const cls = a.variant === 'accent' ? 'btn-accent'
                      : a.variant === 'outline' ? 'btn-outline'
                      : 'btn-ghost';
            return (
              <button key={i} onClick={a.onClick} className={cls}>
                {a.icon && <a.icon size={16} />} {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
