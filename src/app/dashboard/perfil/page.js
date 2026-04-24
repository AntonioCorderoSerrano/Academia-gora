'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth, ROLES } from '@/context/AuthContext';
import { useLocale } from '@/context/LocaleContext';
import { useConfirm } from '@/context/ConfirmContext';
import { LOCALES } from '@/i18n/dictionaries';
import { perfilUpdateSchema, passwordChangeSchema, validar } from '@/lib/schemas';
import toast from 'react-hot-toast';
import {
  User, Globe, Lock, Hash, Check, X as XIcon, UserCircle, Clipboard,
} from 'lucide-react';

export default function PerfilPage() {
  const { user, profile, updatePassword } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const confirm = useConfirm();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pw, setPw] = useState({ nueva: '', confirmar: '' });
  const [invitaciones, setInvitaciones] = useState([]);

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || '');
      setTelefono(profile.telefono || '');
    }
  }, [profile]);

  // Invitaciones pendientes (para alumnos cuando un tutor los invita por email)
  useEffect(() => {
    if (!user || profile?.role !== ROLES.ALUMNO) return;
    const unsub = onValue(ref(db, `invitacionesVinculacion/${user.uid}`), (snap) => {
      const data = snap.val() || {};
      setInvitaciones(Object.entries(data).map(([id, i]) => ({ id, ...i })));
    });
    return () => unsub();
  }, [user, profile]);

  const guardarDatos = async () => {
    const v = validar(perfilUpdateSchema, { nombre, telefono, locale });
    if (!v.valido) {
      const msg = Object.values(v.errores)[0];
      toast.error(msg);
      return;
    }
    await update(ref(db, `usuarios/${user.uid}`), {
      nombre: v.datos.nombre,
      telefono: v.datos.telefono || '',
    });
    toast.success(t('common.guardado'));
  };

  const cambiarPassword = async () => {
    const v = validar(passwordChangeSchema, pw);
    if (!v.valido) {
      toast.error(Object.values(v.errores)[0]);
      return;
    }
    try {
      await updatePassword(v.datos.nueva);
      setPw({ nueva: '', confirmar: '' });
      toast.success(t('perfil.pw_actualizada'));
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Vuelve a iniciar sesión para cambiar la contraseña.');
      } else {
        toast.error('Error al cambiar la contraseña');
      }
    }
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(profile.codigoAlumno);
      toast.success('Código copiado');
    } catch {}
  };

  const responderInvitacion = async (inv, aceptar) => {
    const ok = await confirm({
      titulo: aceptar ? '¿Aceptar vinculación?' : '¿Rechazar vinculación?',
      mensaje: aceptar
        ? `${inv.tutorNombre} quedará vinculado como tutor/a. Podrá inscribirte en clases en tu nombre.`
        : 'La invitación se rechazará y se eliminará.',
      peligroso: !aceptar,
    });
    if (!ok) return;

    if (aceptar) {
      // Llama al endpoint server para finalizar la vinculación
      const idToken = await user.getIdToken();
      const res = await fetch('/api/hijos/aceptar-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ invitacionId: inv.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || 'Error');
        return;
      }
      toast.success('Vinculación aceptada');
    }
    // En ambos casos eliminar la invitación (el server ya lo hace si acepta)
    if (!aceptar) await remove(ref(db, `invitacionesVinculacion/${user.uid}/${inv.id}`));
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl">
      <div className="animate-fade-up mb-8">
        <h1 className="font-display text-3xl sm:text-4xl">{t('perfil.titulo')}</h1>
        <p className="text-ink-600 text-sm sm:text-base mt-1">{t('perfil.subtitulo')}</p>
      </div>

      {/* Invitaciones pendientes (alumno) */}
      {invitaciones.length > 0 && (
        <div className="card p-4 sm:p-5 mb-6 animate-fade-up border-accent/30 bg-accent/5">
          <h2 className="font-display text-lg mb-3">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {invitaciones.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserCircle size={20} className="text-accent-deep shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{inv.tutorNombre}</p>
                    <p className="text-xs text-ink-500 truncate">
                      Quiere vincularse como tu tutor/a ({inv.tutorEmail})
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => responderInvitacion(inv, true)}
                    className="btn bg-green-600 text-white hover:bg-green-700 text-sm">
                    <Check size={14} /> Aceptar
                  </button>
                  <button onClick={() => responderInvitacion(inv, false)}
                    className="btn-ghost text-red-700 text-sm">
                    <XIcon size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Código alumno (solo alumnos) */}
      {profile.role === ROLES.ALUMNO && profile.codigoAlumno && (
        <div className="card p-4 sm:p-5 mb-6 animate-fade-up">
          <div className="flex items-start gap-3">
            <Hash size={18} className="text-accent-deep mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">Tu código de vinculación</h3>
              <p className="text-xs text-ink-500 mt-1">
                Si tu tutor/a quiere vincular tu cuenta, comparte este código con él/ella.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-ink-50 rounded-lg px-4 py-2">
                <span className="font-mono text-xl tracking-widest">{profile.codigoAlumno}</span>
                <button onClick={copiarCodigo} className="btn-ghost p-1.5"
                  aria-label="Copiar código">
                  <Clipboard size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Datos personales */}
      <div className="card p-4 sm:p-6 mb-6 animate-fade-up">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <User size={18} className="text-accent-deep" /> {t('perfil.datos_personales')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-ink-700">{t('perfil.nombre')}</label>
            <input className="field mt-1" value={nombre}
              onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-ink-700">{t('perfil.email')}</label>
            <input className="field mt-1 bg-ink-50" value={profile.email} disabled />
            <p className="text-xs text-ink-500 mt-1">
              El correo no se puede cambiar desde aquí.
            </p>
          </div>
          <div>
            <label className="text-sm text-ink-700">{t('perfil.telefono')} {t('common.opcional')}</label>
            <input className="field mt-1" type="tel" value={telefono}
              onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <button onClick={guardarDatos} className="btn-accent">{t('common.guardar')}</button>
        </div>
      </div>

      {/* Idioma */}
      <div className="card p-4 sm:p-6 mb-6 animate-fade-up">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Globe size={18} className="text-accent-deep" /> {t('perfil.idioma')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(LOCALES).map(([code, loc]) => (
            <button key={code}
              onClick={() => { setLocale(code); toast.success(loc.label); }}
              className={`rounded-lg border p-3 text-center transition ${
                locale === code
                  ? 'border-accent bg-accent/5 scale-[1.02]'
                  : 'border-ink-200 hover:border-ink-400'
              }`}>
              <div className="text-2xl">{loc.flag}</div>
              <div className="text-xs mt-1">{loc.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="card p-4 sm:p-6 mb-6 animate-fade-up">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Lock size={18} className="text-accent-deep" /> {t('perfil.cambiar_pw')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-ink-700">{t('perfil.nueva_pw')}</label>
            <input type="password" className="field mt-1" autoComplete="new-password"
              value={pw.nueva} onChange={(e) => setPw({ ...pw, nueva: e.target.value })} />
            <p className="text-xs text-ink-500 mt-1">
              Mínimo 8 caracteres con mayúscula, minúscula y número.
            </p>
          </div>
          <div>
            <label className="text-sm text-ink-700">{t('perfil.confirmar_pw')}</label>
            <input type="password" className="field mt-1" autoComplete="new-password"
              value={pw.confirmar} onChange={(e) => setPw({ ...pw, confirmar: e.target.value })} />
          </div>
          <button onClick={cambiarPassword} className="btn-primary">{t('perfil.cambiar_pw')}</button>
        </div>
      </div>
    </div>
  );
}
