'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { LOCALES, DEFAULT_LOCALE, t as translate } from '@/i18n/dictionaries';

const LocaleContext = createContext({});
export const useLocale = () => useContext(LocaleContext);

export function LocaleProvider({ children }) {
  const { user, profile } = useAuth();
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  // Orden de prioridad:
  // 1. Perfil del usuario (si logueado) → siempre gana
  // 2. localStorage (invitados / pre-login)
  // 3. Idioma del navegador
  // 4. Español por defecto
  useEffect(() => {
    if (profile?.locale && LOCALES[profile.locale]) {
      setLocaleState(profile.locale);
      try { localStorage.setItem('skolium_locale', profile.locale); } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem('skolium_locale');
      if (stored && LOCALES[stored]) { setLocaleState(stored); return; }
    } catch {}
    if (typeof navigator !== 'undefined') {
      const nav = navigator.language?.slice(0, 2);
      if (LOCALES[nav]) { setLocaleState(nav); return; }
    }
    setLocaleState(DEFAULT_LOCALE);
  }, [profile]);

  const setLocale = async (nuevoLocale) => {
    if (!LOCALES[nuevoLocale]) return;
    setLocaleState(nuevoLocale);
    try { localStorage.setItem('skolium_locale', nuevoLocale); } catch {}
    if (user) {
      try {
        await update(ref(db, `usuarios/${user.uid}`), { locale: nuevoLocale });
      } catch {}
    }
  };

  const t = (key) => translate(locale, key);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, locales: LOCALES }}>
      {children}
    </LocaleContext.Provider>
  );
}
