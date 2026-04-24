'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  updatePassword as fbUpdatePassword,
} from 'firebase/auth';
import {
  ref, get, set, update, serverTimestamp, onValue, onDisconnect, remove,
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
  PENDING: 'pending',   // cuenta creada, pendiente de aprobación admin
  ACTIVE: 'active',
  KICKED: 'kicked',
};

// Roles que requieren aprobación admin
const ROLES_APROBACION = [ROLES.ADMIN, ROLES.MAESTRO];

function newSessionToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Genera un código de 6 dígitos único para alumnos (método vinculación hijo↔cuenta)
function generarCodigoAlumno() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(SESSION_STATE.LOADING);
  const [sessionToken, setSessionToken] = useState(null);

  // Sesión única
  useEffect(() => {
    if (!user || !sessionToken || status !== SESSION_STATE.ACTIVE) return;
    const sesRef = ref(db, `sesiones/${user.uid}`);
    set(sesRef, {
      token: sessionToken,
      lastActive: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : '',
    });
    onDisconnect(sesRef).remove();
    const unsub = onValue(sesRef, (snap) => {
      const data = snap.val();
      if (data && data.token && data.token !== sessionToken) {
        setStatus(SESSION_STATE.KICKED);
        fbSignOut(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [user, sessionToken, status]);

  // Listener del perfil en vivo: para detectar cuando admin aprueba
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, `usuarios/${user.uid}`), (snap) => {
      const data = snap.exists() ? snap.val() : null;
      setProfile(data);

      if (!data) return;
      // Si el rol requiere aprobación y no está aprobado → PENDING
      if (ROLES_APROBACION.includes(data.role) && !data.approved) {
        setStatus(SESSION_STATE.PENDING);
        return;
      }
      // Si pasa de PENDING a aprobado, activar sesión
      if (status !== SESSION_STATE.ACTIVE && status !== SESSION_STATE.KICKED) {
        const token = newSessionToken();
        setSessionToken(token);
        setStatus(SESSION_STATE.ACTIVE);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setSessionToken(null);
        setStatus((prev) =>
          prev === SESSION_STATE.KICKED ? SESSION_STATE.KICKED : SESSION_STATE.UNAUTH
        );
        return;
      }
      setUser(fbUser);
      // El listener del perfil arriba determinará estado final (ACTIVE/PENDING)
    });
    return () => unsub();
  }, []);

  const login = async (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async ({ email, password, nombre, role = ROLES.ALUMNO, telefono = '', locale = 'es' }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await updateProfile(cred.user, { displayName: nombre }); } catch {}

    const necesitaAprobacion = ROLES_APROBACION.includes(role);

    const userData = {
      uid: cred.user.uid,
      nombre,
      email,
      telefono,
      role,
      sinCobro: role === ROLES.MAESTRO,
      approved: !necesitaAprobacion,
      approvedAt: necesitaAprobacion ? null : serverTimestamp(),
      createdAt: serverTimestamp(),
      suscripcionActiva: false,
      stripeCustomerId: null,
      locale,
    };

    // Código único para alumnos (vinculación segura con perfil de hijo)
    if (role === ROLES.ALUMNO) {
      userData.codigoAlumno = generarCodigoAlumno();
    }

    await set(ref(db, `usuarios/${cred.user.uid}`), userData);

    // Si requiere aprobación, registro se cierra hasta que admin apruebe
    if (necesitaAprobacion) {
      await fbSignOut(auth);
    }

    return { cred, necesitaAprobacion };
  };

  const updatePassword = async (nuevaPassword) => {
    if (!auth.currentUser) throw new Error('No hay sesión');
    await fbUpdatePassword(auth.currentUser, nuevaPassword);
  };

  const logout = async () => {
    if (user) {
      try { await remove(ref(db, `sesiones/${user.uid}`)); } catch {}
    }
    return fbSignOut(auth);
  };

  const hasRole = (...roles) => profile && roles.includes(profile.role);

  return (
    <AuthContext.Provider value={{
      user, profile, status,
      loading: status === SESSION_STATE.LOADING,
      login, register, logout, hasRole, updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
