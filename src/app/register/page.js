'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, ROLES } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.ALUMNO, label: 'Alumno/a', desc: 'Me inscribo a clases' },
  { value: ROLES.MAESTRO, label: 'Maestro/a', desc: 'Imparto clases' },
  { value: ROLES.TUTOR, label: 'Padre / Tutor', desc: 'Tutor legal de un alumno' },
];

export default function RegisterPage() {
  const { register, logout } = useAuth();
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', role: ROLES.ALUMNO,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      // Cerramos sesión para forzar el flujo: verificar → aprobar → entrar
      await logout();
      setDone(true);
    } catch (err) {
      toast.error(err.code === 'auth/email-already-in-use'
        ? 'Ese correo ya está en uso'
        : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center">
            <MailCheck size={24} className="text-accent-deep" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl mt-5">Cuenta creada</h1>
          <p className="text-ink-600 mt-3">
            Te hemos enviado un correo a <span className="font-medium">{form.email}</span> para
            verificar tu dirección. Después, un administrador validará tu cuenta y recibirás
            un aviso cuando puedas iniciar sesión.
          </p>
          <Link href="/login" className="btn-primary mt-6 inline-flex">Ir a iniciar sesión</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Link href="/" className="font-display text-2xl">Academia</Link>
        <h1 className="mt-6 font-display text-4xl">Crear cuenta</h1>
        <p className="mt-2 text-ink-600">
          Tu cuenta necesitará verificación por correo y aprobación del equipo antes del primer acceso.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm text-ink-700">Nombre completo</label>
            <input required className="field mt-1"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-ink-700">Correo</label>
              <input type="email" required className="field mt-1"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-ink-700">Teléfono (opcional)</label>
              <input className="field mt-1"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-700">Contraseña</label>
            <input type="password" required minLength={6} className="field mt-1"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-ink-700">Quiero registrarme como</label>
            <div className="mt-2 grid sm:grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.value} type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`text-left rounded-lg border p-3 transition ${
                    form.role === r.value
                      ? 'border-accent bg-accent/5'
                      : 'border-ink-200 hover:border-ink-400'
                  }`}>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-ink-500">{r.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              * Los maestros están exentos de pago. La cuenta admin se asigna manualmente desde Firebase.
            </p>
          </div>

          <button disabled={loading} className="btn-accent w-full">
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>

          <p className="text-sm text-ink-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-accent-deep hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
