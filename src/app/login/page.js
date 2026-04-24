'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SESSION_STATE } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { MonitorOff, Clock } from 'lucide-react';
import { loginSchema, validar } from '@/lib/schemas';

export default function LoginPage() {
  const { login, logout, status } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (status === SESSION_STATE.ACTIVE) router.push('/dashboard');
  }, [status, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrores({});
    const v = validar(loginSchema, form);
    if (!v.valido) { setErrores(v.errores); return; }
    setLoading(true);
    try {
      await login(v.datos.email, v.datos.password);
    } catch (err) {
      toast.error(err.code === 'auth/too-many-requests'
        ? 'Demasiados intentos. Espera un momento.'
        : 'Credenciales inválidas');
    } finally { setLoading(false); }
  };

  if (status === SESSION_STATE.PENDING) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="card p-5 sm:p-8 max-w-md w-full text-center animate-fade-up">
          <Logo size="sm" href={null} className="mx-auto mb-5" />
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center animate-pop">
            <Clock size={22} className="text-amber-700" />
          </div>
          <h1 className="font-display text-2xl mt-4">{t('registro.pendiente_aprobacion_titulo')}</h1>
          <p className="text-ink-600 mt-2 text-sm">{t('registro.sin_aprobacion')}</p>
          <button onClick={() => logout()} className="btn-outline mt-5 w-full">
            {t('nav.logout')}
          </button>
        </div>
      </main>
    );
  }

  if (status === SESSION_STATE.KICKED) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="card p-5 sm:p-8 max-w-md w-full text-center animate-fade-up">
          <Logo size="sm" href={null} className="mx-auto mb-5" />
          <div className="mx-auto h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center animate-pop">
            <MonitorOff size={22} className="text-accent-deep" />
          </div>
          <h1 className="font-display text-2xl mt-4">Sesión cerrada</h1>
          <p className="text-ink-600 mt-2 text-sm">
            Has iniciado sesión desde otro dispositivo. Solo se permite una sesión activa.
          </p>
          <button onClick={() => window.location.reload()} className="btn-accent mt-5 w-full">
            Iniciar sesión de nuevo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between bg-ink-900 text-ink-50 p-8 lg:p-12 relative overflow-hidden animate-fade-in">
        <Logo size="md" href="/" variant="light" />
        <div className="my-8">
          <h2 className="font-display text-4xl lg:text-5xl leading-tight animate-fade-up">
            Bienvenido/a<br/>
            <em className="text-accent-soft font-normal italic">de vuelta.</em>
          </h2>
          <p className="mt-4 text-ink-300 max-w-sm animate-fade-up" style={{ animationDelay: '120ms' }}>
            Accede para continuar con tus clases.
          </p>
        </div>
        <p className="text-sm text-ink-400 font-display italic">— Skolium</p>
        <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-accent-deep/30 blur-3xl pointer-events-none" />
      </aside>

      <section className="flex items-center justify-center px-4 sm:px-6 py-8">
        <form onSubmit={onSubmit} className="w-full max-w-sm animate-fade-up" noValidate>
          <Logo size="md" className="md:hidden mb-6" />
          <h1 className="font-display text-3xl sm:text-4xl">Iniciar sesión</h1>
          <p className="mt-2 text-ink-600 text-sm">Introduce tus credenciales.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="text-sm text-ink-700">Correo</label>
              <input type="email" required className="field mt-1"
                autoComplete="email" inputMode="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errores.email && <p className="text-xs text-red-700 mt-1">{errores.email}</p>}
            </div>
            <div>
              <label className="text-sm text-ink-700">Contraseña</label>
              <input type="password" required className="field mt-1"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {errores.password && <p className="text-xs text-red-700 mt-1">{errores.password}</p>}
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full mt-6">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-6 text-sm text-ink-600 text-center md:text-left">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-accent-deep hover:underline">
              Crear una
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
