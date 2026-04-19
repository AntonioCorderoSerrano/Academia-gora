'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, SESSION_STATE } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { MailCheck, Clock, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const { login, logout, status, resendVerification, refreshStatus } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  // Redirige cuando el usuario ya es "active"
  useEffect(() => {
    if (status === SESSION_STATE.ACTIVE) router.push('/dashboard');
  }, [status, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      // El status se recalcula en AuthContext y la UI reacciona abajo.
    } catch (err) {
      toast.error('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla: email no verificado
  if (status === SESSION_STATE.UNVERIFIED) {
    return (
      <StatusScreen
        icon={MailCheck}
        titulo="Verifica tu correo"
        texto="Hemos enviado un enlace a tu email. Ábrelo para confirmar la cuenta antes de iniciar sesión."
        acciones={[
          {
            label: 'Reenviar correo',
            onClick: async () => {
              try { await resendVerification(); toast.success('Correo reenviado'); }
              catch { toast.error('Espera un momento antes de reintentar'); }
            },
            variant: 'accent',
          },
          {
            label: 'Ya lo confirmé',
            onClick: () => refreshStatus(),
            variant: 'outline',
            icon: RefreshCw,
          },
          { label: 'Cerrar sesión', onClick: () => logout(), variant: 'ghost' },
        ]}
      />
    );
  }

  // Pantalla: cuenta pendiente de aprobación
  if (status === SESSION_STATE.PENDING) {
    return (
      <StatusScreen
        icon={Clock}
        titulo="Cuenta pendiente"
        texto="Un administrador debe validar tu cuenta antes de que puedas acceder. Te avisaremos por correo en cuanto esté lista."
        acciones={[
          { label: 'Volver a comprobar', onClick: () => refreshStatus(), variant: 'outline', icon: RefreshCw },
          { label: 'Cerrar sesión', onClick: () => logout(), variant: 'ghost' },
        ]}
      />
    );
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between bg-ink-900 text-ink-50 p-12 relative overflow-hidden">
        <Link href="/" className="font-display text-2xl">Academia</Link>
        <div>
          <h2 className="font-display text-5xl leading-tight">
            Bienvenido/a<br/>
            <em className="text-accent-soft font-normal italic">de vuelta.</em>
          </h2>
          <p className="mt-4 text-ink-300 max-w-sm">
            Accede para continuar con tus clases, gestionar pagos y comunicarte con tu comunidad.
          </p>
        </div>
        <p className="text-sm text-ink-400 font-display italic">— desde 2025</p>
        <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-accent-deep/30 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="font-display text-4xl">Iniciar sesión</h1>
          <p className="mt-2 text-ink-600">Introduce tus credenciales.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="text-sm text-ink-700">Correo electrónico</label>
              <input
                type="email" required className="field mt-1"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-ink-700">Contraseña</label>
              <input
                type="password" required className="field mt-1"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full mt-6">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-6 text-sm text-ink-600">
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
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="card p-10 max-w-md w-full text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center">
          <Icon size={24} className="text-accent-deep" strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-3xl mt-5">{titulo}</h1>
        <p className="text-ink-600 mt-2">{texto}</p>
        <div className="mt-6 flex flex-col gap-2">
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
