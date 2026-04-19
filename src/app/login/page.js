'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SESSION_STATE } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { MailCheck, Clock, RefreshCw, Eye, EyeOff } from 'lucide-react';
import FooterLegal from '@/components/footer';

export default function LoginPage() {
  const { login, logout, status, resendVerification, refreshStatus } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
          <div className="card p-5 sm:p-8 md:p-10 max-w-md w-full text-center">
            <Logo size="sm" href={null} className="mx-auto mb-5 sm:mb-6" />
            <div className="mx-auto h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-accent/15 flex items-center justify-center">
              <MailCheck size={20} className="text-accent-deep sm:w-[22px] sm:h-[22px]" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl mt-3 sm:mt-5">Verifica tu correo</h1>
            <p className="text-ink-600 mt-2 text-sm sm:text-base">
              Hemos enviado un enlace a tu email. Ábrelo para confirmar la cuenta. Revisa la carpeta de spam si no lo ves.
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col gap-2">
              <button onClick={async () => {
                try { await resendVerification(); toast.success('Correo reenviado'); }
                catch { toast.error('Espera un momento antes de reintentar'); }
              }} className="btn-accent">
                Reenviar correo
              </button>
              <button onClick={() => refreshStatus()} className="btn-outline">
                <RefreshCw size={16} /> Ya lo confirmé
              </button>
              <button onClick={() => logout()} className="btn-ghost">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
        <FooterLegal />
      </div>
    );
  }

  if (status === SESSION_STATE.PENDING) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
          <div className="card p-5 sm:p-8 md:p-10 max-w-md w-full text-center">
            <Logo size="sm" href={null} className="mx-auto mb-5 sm:mb-6" />
            <div className="mx-auto h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-accent/15 flex items-center justify-center">
              <Clock size={20} className="text-accent-deep sm:w-[22px] sm:h-[22px]" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl mt-3 sm:mt-5">Cuenta pendiente</h1>
            <p className="text-ink-600 mt-2 text-sm sm:text-base">
              Un administrador debe validar tu cuenta antes de que puedas acceder. Te avisaremos por correo cuando esté lista.
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col gap-2">
              <button onClick={() => refreshStatus()} className="btn-outline">
                <RefreshCw size={16} /> Volver a comprobar
              </button>
              <button onClick={() => logout()} className="btn-ghost">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
        <FooterLegal />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Panel oscuro - desktop y tablet horizontal */}
      <aside className="hidden md:flex flex-col bg-ink-900 text-ink-50 p-6 md:p-8 lg:p-12 relative overflow-hidden w-1/2">
        {/* Logo en la parte superior */}
        <div className="flex-shrink-0">
          <Logo size="md" href="/" variant="light" />
        </div>
        
        {/* Contenido centrado verticalmente */}
        <div className="flex-1 flex flex-col justify-center -mt-16">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl leading-tight">
            Bienvenido/a<br />
            <em className="text-accent-soft font-normal italic">de vuelta.</em>
          </h2>
          <p className="mt-3 md:mt-4 text-ink-300 max-w-sm text-sm md:text-base">
            Accede para continuar con tus clases y comunicarte con tu comunidad.
          </p>
        </div>
        
        <div className="absolute -right-20 -bottom-20 h-60 md:h-80 w-60 md:w-80 rounded-full bg-accent-deep/30 blur-3xl pointer-events-none" />
      </aside>

      {/* Lado derecho con formulario y footer */}
      <section className="flex-1 flex flex-col md:w-1/2">
        <div className="flex-1 flex items-center justify-center">
          <form onSubmit={onSubmit} className="w-full max-w-sm px-4 sm:px-6">
            <Logo size="md" className="md:hidden mb-6" />
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Iniciar sesión</h1>
            <p className="mt-1 sm:mt-2 text-ink-600 text-sm sm:text-base">Introduce tus credenciales.</p>

            <div className="mt-6 sm:mt-8 space-y-4">
              <div>
                <label className="text-sm text-ink-700">Correo electrónico</label>
                <input type="email" required className="field mt-1"
                  autoComplete="email" inputMode="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-ink-700">Contraseña</label>
                <div className="relative mt-1">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    className="field w-full pr-10"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button disabled={loading} className="btn-primary w-full mt-6">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>

            <p className="mt-6 text-sm text-ink-600 text-center md:text-left">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-accent-deep underline-offset-2 hover:underline">
                Crear una
              </Link>
            </p>
          </form>
        </div>
        
        <FooterLegal />
      </section>
    </div>
  );
}