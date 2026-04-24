'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, ROLES } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { Clock } from 'lucide-react';
import { registerSchema, validar } from '@/lib/schemas';

const ROLE_OPTIONS = [
  { value: ROLES.ALUMNO, labelKey: 'role.alumno', desc: 'Me inscribo' },
  { value: ROLES.MAESTRO, labelKey: 'role.maestro', desc: 'Imparto clases' },
  { value: ROLES.TUTOR, labelKey: 'role.tutor', desc: 'Tutor legal' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { t, locale } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', telefono: '', role: ROLES.ALUMNO,
  });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});
  const [pendiente, setPendiente] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrores({});

    const v = validar(registerSchema, form);
    if (!v.valido) { setErrores(v.errores); return; }

    setLoading(true);
    try {
      const { necesitaAprobacion } = await register({ ...v.datos, locale });
      if (necesitaAprobacion) {
        setPendiente(true);
        return;
      }
      toast.success(t('common.guardado'));
      router.push('/dashboard');
    } catch (err) {
      toast.error(
        err.code === 'auth/email-already-in-use' ? 'Ese correo ya está en uso' :
        err.code === 'auth/weak-password' ? 'Contraseña demasiado débil' :
        err.code === 'auth/invalid-email' ? 'Correo no válido' :
        'Error al registrar'
      );
    } finally { setLoading(false); }
  };

  if (pendiente) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="card p-5 sm:p-8 md:p-10 max-w-md w-full text-center animate-fade-up">
          <Logo size="sm" href={null} className="mx-auto mb-5 sm:mb-6" />
          <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-amber-100 flex items-center justify-center animate-pop">
            <Clock size={22} className="text-amber-700" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl mt-3 sm:mt-5">
            {t('registro.pendiente_aprobacion_titulo')}
          </h1>
          <p className="text-ink-600 mt-3 text-sm sm:text-base">
            {t('registro.pendiente_aprobacion_desc')}
          </p>
          <Link href="/login" className="btn-outline mt-5 sm:mt-6 inline-flex w-full">
            {t('common.volver')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10 md:py-12">
      <div className="w-full max-w-lg animate-fade-up">
        <Logo size="md" />
        <h1 className="mt-5 sm:mt-6 font-display text-2xl sm:text-3xl md:text-4xl">Crear cuenta</h1>
        <p className="mt-1.5 sm:mt-2 text-ink-600 text-sm sm:text-base">
          Empieza a usar Skolium en segundos.
        </p>

        <form onSubmit={onSubmit} className="mt-5 sm:mt-8 space-y-3.5 sm:space-y-5" noValidate>
          <Field label="Nombre completo" error={errores.nombre}>
            <input required className="field mt-1" autoComplete="name"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <Field label="Correo" error={errores.email}>
              <input type="email" required className="field mt-1"
                autoComplete="email" inputMode="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={`Teléfono ${t('common.opcional')}`} error={errores.telefono}>
              <input className="field mt-1" type="tel" autoComplete="tel" inputMode="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </Field>
          </div>

          <Field label="Contraseña" error={errores.password}
            hint="Mínimo 8 caracteres con mayúscula, minúscula y número.">
            <input type="password" required className="field mt-1"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          <div>
            <label className="text-sm text-ink-700">Quiero registrarme como</label>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.value} type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`text-left rounded-lg border p-2.5 sm:p-3 transition-all duration-200 ${
                    form.role === r.value
                      ? 'border-accent bg-accent/5 scale-[1.02]'
                      : 'border-ink-200 hover:border-ink-400 hover:scale-[1.01]'
                  }`}>
                  <div className="text-xs sm:text-sm font-medium capitalize">{r.value}</div>
                  <div className="text-[10px] sm:text-xs text-ink-500 leading-tight">{r.desc}</div>
                </button>
              ))}
            </div>
            {(form.role === ROLES.MAESTRO) && (
              <p className="mt-2 text-[11px] sm:text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                ⏳ El registro como docente requiere aprobación de un administrador.
              </p>
            )}
          </div>

          <button disabled={loading} className="btn-accent w-full">
            {loading ? t('common.guardando') : 'Crear cuenta y entrar'}
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

function Field({ label, error, hint, children }) {
  return (
    <div>
      <label className="text-sm text-ink-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
    </div>
  );
}
