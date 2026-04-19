'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, ROLES } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: ROLES.ALUMNO, label: 'Alumno/a', desc: 'Me inscribo' },
  { value: ROLES.MAESTRO, label: 'Docente', desc: 'Imparto clases' },
  { value: ROLES.TUTOR, label: 'Tutor/a', desc: 'Tutor legal' },
];

export default function RegisterPage() {
  const { register, logout } = useAuth();
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', role: ROLES.ALUMNO,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      setEmailEnviado(true);
      await logout();
      setDone(true);
    } catch (err) {
      toast.error(
        err.code === 'auth/email-already-in-use' ? 'Ese correo ya está en uso' :
        err.code === 'auth/weak-password' ? 'Contraseña demasiado débil' :
        'Error al registrar'
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="card p-5 sm:p-8 md:p-10 max-w-md w-full text-center">
          <Logo size="sm" href={null} className="mx-auto mb-5 sm:mb-6" />
          <div className="mx-auto h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-accent/15 flex items-center justify-center">
            <MailCheck size={20} className="text-accent-deep sm:w-[22px] sm:h-[22px]" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl mt-3 sm:mt-5">Cuenta creada</h1>
          <p className="text-ink-600 mt-3 text-sm sm:text-base">
            {emailEnviado
              ? <>Hemos enviado un correo a <span className="font-medium break-all">{form.email}</span> para verificar tu dirección.</>
              : 'Registro completado. Si no recibes el correo, podrás reenviarlo desde la pantalla de inicio de sesión.'}
            {' '}Luego, un administrador validará tu cuenta.
          </p>
          <p className="text-xs text-ink-500 mt-3">
            Revisa también la carpeta de spam si no aparece en 1-2 minutos.
          </p>
          <Link href="/login" className="btn-primary mt-5 sm:mt-6 inline-flex w-full">
            Ir a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10 md:py-12">
      <div className="w-full max-w-lg">
        <Logo size="md" />
        <h1 className="mt-5 sm:mt-6 font-display text-2xl sm:text-3xl md:text-4xl">Crear cuenta</h1>
        <p className="mt-1.5 sm:mt-2 text-ink-600 text-sm sm:text-base">
          Tu cuenta necesitará verificación por correo y aprobación del equipo antes del primer acceso.
        </p>

        <form onSubmit={onSubmit} className="mt-5 sm:mt-8 space-y-3.5 sm:space-y-5">
          <div>
            <label className="text-sm text-ink-700">Nombre completo</label>
            <input required className="field mt-1" autoComplete="name"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="text-sm text-ink-700">Correo</label>
              <input type="email" required className="field mt-1"
                autoComplete="email" inputMode="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-ink-700">Teléfono <span className="text-ink-400">(opcional)</span></label>
              <input className="field mt-1" type="tel" autoComplete="tel" inputMode="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-700">Contraseña</label>
            <input type="password" required minLength={6} className="field mt-1"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-ink-500 mt-1">Mínimo 6 caracteres.</p>
          </div>

          <div>
            <label className="text-sm text-ink-700">Quiero registrarme como</label>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.value} type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`text-left rounded-lg border p-2.5 sm:p-3 transition ${
                    form.role === r.value
                      ? 'border-accent bg-accent/5'
                      : 'border-ink-200 hover:border-ink-400'
                  }`}>
                  <div className="text-xs sm:text-sm font-medium">{r.label}</div>
                  <div className="text-[10px] sm:text-xs text-ink-500 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] sm:text-xs text-ink-500">
              * Los docentes están exentos de pago. Admin se asigna desde Firebase.
            </p>
          </div>

          <button disabled={loading} className="btn-accent w-full">
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>

          <p className="text-sm text-ink-600 text-center sm:text-left">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-accent-deep hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
