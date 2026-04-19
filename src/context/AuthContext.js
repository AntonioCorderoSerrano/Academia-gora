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

// Estados de la sesión:
//  loading | unauth | unverified | pending | active
export const SESSION_STATE = {
  LOADING: 'loading',
  UNAUTH: 'unauth',
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  ACTIVE: 'active',
};

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
      const snap = await get(ref(db, `usuarios/${fbUser.uid}`));
      const data = snap.exists() ? snap.val() : null;
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
      sinCobro: role === ROLES.MAESTRO,   // maestros exentos de pagos
      approved: false,
      approvedAt: null,
      createdAt: serverTimestamp(),
      suscripcionActiva: false,
      stripeCustomerId: null,
    };
    await set(ref(db, `usuarios/${cred.user.uid}`), userData);
    setProfile(userData);

    try {
      await sendEmailVerification(cred.user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
      });
    } catch (e) {
      console.warn('No se pudo enviar email de verificación:', e);
    }
    return cred;
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser, {
        url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
      });
    }
  };

  const refreshStatus = async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    const snap = await get(ref(db, `usuarios/${auth.currentUser.uid}`));
    const data = snap.exists() ? snap.val() : null;
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
