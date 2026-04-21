'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, ROLES } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import toast from 'react-hot-toast';
import { MailCheck, Eye, EyeOff } from 'lucide-react';
import FooterLegal from '@/components/footer';

const ROLE_OPTIONS = [
  { value: ROLES.ALUMNO, label: 'Alumno/a', desc: 'Me inscribo' },
  { value: ROLES.MAESTRO, label: 'Docente', desc: 'Imparto clases' },
  { value: ROLES.TUTOR, label: 'Tutor/a', desc: 'Tutor legal' },
];

export default function RegisterPage() {
  const { register, logout } = useAuth();
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', confirmPassword: '', telefono: '', role: ROLES.ALUMNO,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
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
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
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
            <Link href="/" className="btn-primary mt-5 sm:mt-6 inline-flex w-full justify-center">
              Ir a iniciar sesión
            </Link>
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
            Únete a<br />
            <em className="text-accent-soft font-normal italic">nuestra comunidad.</em>
          </h2>
          <p className="mt-3 md:mt-4 text-ink-300 max-w-sm text-sm md:text-base">
            Regístrate para acceder a tus clases, materiales didácticos y comunicarte con profesores y compañeros.
          </p>
        </div>

        <div className="absolute -right-20 -bottom-20 h-60 md:h-80 w-60 md:w-80 rounded-full bg-accent-deep/30 blur-3xl pointer-events-none" />
      </aside>

      {/* Lado derecho con formulario y footer */}
      <section className="flex-1 flex flex-col md:w-1/2">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-4 sm:px-6">
            <Logo size="md" className="md:hidden mb-6" />
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl">Crear cuenta</h1>
            <p className="mt-1 sm:mt-2 text-ink-600 text-sm sm:text-base">
              Tu cuenta necesitará verificación por correo y aprobación del equipo antes del primer acceso.
            </p>

            <form onSubmit={onSubmit} className="mt-6 sm:mt-8 space-y-4">
              <div>
                <label className="text-sm text-ink-700">Nombre completo</label>
                <input required className="field mt-1" autoComplete="name"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-ink-700">Correo</label>
                  <input type="email" required className="field mt-1"
                    autoComplete="email" inputMode="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-ink-700">Teléfono</label>
                  <input className="field mt-1" type="tel" autoComplete="tel" inputMode="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-sm text-ink-700">Contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required minLength={6}
                    className="field w-full pr-10"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-ink-500 mt-1">Mínimo 6 caracteres.</p>
              </div>

              <div>
                <label className="text-sm text-ink-700">Confirmar contraseña</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required minLength={6}
                    className="field w-full pr-10"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-ink-700">Quiero registrarme como</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((r) => (
                    <button key={r.value} type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`text-left rounded-lg border p-2.5 sm:p-3 transition ${form.role === r.value
                          ? 'border-accent bg-accent/5'
                          : 'border-ink-200 hover:border-ink-400'
                        }`}>
                      <div className="text-xs sm:text-sm font-medium">{r.label}</div>
                      <div className="text-[10px] sm:text-xs text-ink-500 leading-tight">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button disabled={loading} className="btn-accent w-full mt-6">
                {loading ? 'Creando…' : 'Crear cuenta'}
              </button>

              <p className="text-sm text-ink-600 text-center md:text-left">
                ¿Ya tienes cuenta?{' '}
                <Link href="/" className="text-accent-deep underline-offset-2 hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </form>
          </div>
        </div>

        <FooterLegal />
      </section>
    </div>
  );
}