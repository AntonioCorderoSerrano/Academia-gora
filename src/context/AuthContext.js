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
import {
  ref, get, set, serverTimestamp, onValue, onDisconnect, remove,
} from 'firebase/database';
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
  ACTIVE: 'active',
  KICKED: 'kicked', // sesión cerrada porque se abrió otra
};

function buildActionSettings() {
  const base =
    (typeof window !== 'undefined' && window.location?.origin) ||
    process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  return { url: `${base}/login`, handleCodeInApp: false };
}

// Generar un token único por pestaña
function newSessionToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(SESSION_STATE.LOADING);
  const [sessionToken, setSessionToken] = useState(null);

  // Listener de sesión única
  useEffect(() => {
    if (!user || !sessionToken) return;
    const sesRef = ref(db, `sesiones/${user.uid}`);

    // Marcar nuestra sesión como activa
    set(sesRef, {
      token: sessionToken,
      lastActive: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : '',
    });

    // Limpiar al desconectar
    onDisconnect(sesRef).remove();

    // Escuchar cambios: si el token cambia, otra pestaña tomó control
    const unsub = onValue(sesRef, (snap) => {
      const data = snap.val();
      if (data && data.token && data.token !== sessionToken) {
        // Otra sesión nos echó
        setStatus(SESSION_STATE.KICKED);
        fbSignOut(auth).catch(() => {});
      }
    });

    return () => unsub();
  }, [user, sessionToken]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setSessionToken(null);
        setStatus((prev) => prev === SESSION_STATE.KICKED ? SESSION_STATE.KICKED : SESSION_STATE.UNAUTH);
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

      // Generar token y marcar sesión activa (esto echará a otras sesiones)
      const token = newSessionToken();
      setSessionToken(token);
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
      // Sin verificación admin: aprobado de entrada
      approved: true,
      approvedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      suscripcionActiva: false,
      stripeCustomerId: null,
    };
    await set(ref(db, `usuarios/${cred.user.uid}`), userData);
    setProfile(userData);

    try {
      await sendEmailVerification(cred.user, buildActionSettings());
    } catch (e) {
      console.warn('No se pudo enviar email de verificación:', e);
    }

    return cred;
  };

  const resendVerification = async () => {
    if (!auth.currentUser) throw new Error('Sin sesión');
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) { await refreshStatus(); return; }
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
    else {
      const token = newSessionToken();
      setSessionToken(token);
      setStatus(SESSION_STATE.ACTIVE);
    }
  };

  const logout = async () => {
    if (user) {
      try { await remove(ref(db, `sesiones/${user.uid}`)); } catch {}
    }
    return fbSignOut(auth);
  };

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
