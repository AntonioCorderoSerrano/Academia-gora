'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export const ROLES = {
  ADMIN: 'admin',
  MAESTRO: 'maestro',
  ALUMNO: 'alumno',
  TUTOR: 'tutor',
};

export const SESSION_STATE = {
  LOADING: 'loading',
  UNAUTH: 'unauth',
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  ACTIVE: 'active',
};

// Construye la URL de retorno completa o null si no podemos determinarla.
function buildActionSettings() {
  const base =
    (typeof window !== 'undefined' && window.location?.origin) ||
    process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  return { url: `${base}/`, handleCodeInApp: false };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(SESSION_STATE.LOADING);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setStatus(SESSION_STATE.UNAUTH);
        return;
      }
      try { await reload(fbUser); } catch {}

      setUser(fbUser);
      let data = null;
      try {
        const snap = await get(ref(db, `usuarios/${fbUser.uid}`));
        data = snap.exists() ? snap.val() : null;
      } catch {}
      setProfile(data);

      if (!fbUser.emailVerified) {
        setStatus(SESSION_STATE.UNVERIFIED);
        return;
      }
      if (data?.role === ROLES.ADMIN) {
        setStatus(SESSION_STATE.ACTIVE);
        return;
      }
      if (!data?.approved) {
        setStatus(SESSION_STATE.PENDING);
        return;
      }
      setStatus(SESSION_STATE.ACTIVE);
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await reload(cred.user);
    return cred;
  };

  const register = async ({ email, password, nombre, role = ROLES.ALUMNO, telefono = '' }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nombre });

    const userData = {
      uid: cred.user.uid,
      nombre,
      email,
      telefono,
      role,
      sinCobro: role === ROLES.MAESTRO,
      approved: false,
      approvedAt: null,
      createdAt: serverTimestamp(),
      suscripcionActiva: false,
      stripeCustomerId: null,
    };
    await set(ref(db, `usuarios/${cred.user.uid}`), userData);
    setProfile(userData);

    // IMPORTANTE: enviamos el email de verificación y esperamos a que
    // termine antes de devolver el control. La llamada debe hacerse con
    // el usuario AUTENTICADO (no hacer signOut antes).
    try {
      await sendEmailVerification(cred.user, buildActionSettings());
    } catch (e) {
      // No bloqueamos el registro si Firebase rate-limitea: el usuario
      // podrá reenviar desde la pantalla de estado.
      console.warn('No se pudo enviar email de verificación en registro:', e);
    }

    // Avisar a los admins (fire-and-forget)
    try {
      fetch('/api/notifications/new-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: cred.user.uid, nombre, email, role }),
      }).catch(() => {});
    } catch {}

    return cred;
  };

  const resendVerification = async () => {
    if (!auth.currentUser) throw new Error('Sin sesión');
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      await refreshStatus();
      return;
    }
    await sendEmailVerification(auth.currentUser, buildActionSettings());
  };

  const refreshStatus = async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    let data = null;
    try {
      const snap = await get(ref(db, `usuarios/${auth.currentUser.uid}`));
      data = snap.exists() ? snap.val() : null;
    } catch {}
    setProfile(data);
    if (!auth.currentUser.emailVerified) setStatus(SESSION_STATE.UNVERIFIED);
    else if (data?.role === ROLES.ADMIN || data?.approved) setStatus(SESSION_STATE.ACTIVE);
    else setStatus(SESSION_STATE.PENDING);
  };

  const logout = () => fbSignOut(auth);
  const hasRole = (...roles) => profile && roles.includes(profile.role);

  return (
    <AuthContext.Provider
      value={{
        user, profile, status,
        loading: status === SESSION_STATE.LOADING,
        login, register, logout, hasRole,
        resendVerification, refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
