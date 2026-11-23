import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';
import {
  db,
  saveOfflineSession,
  getOfflineSession,
  clearOfflineSession,
  seedDefaultOfflineUser
} from '../db/db';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);

  const updateContributionAccess = useCallback((access) => {
    if (
      !user ||
      !Number.isInteger(access?.contributions_count) ||
      typeof access.can_access_downloads !== 'boolean'
    ) {
      console.warn('[UniLink Auth] El servidor no devolvió un contador de aportes válido.');
      return false;
    }

    const updatedUser = {
      ...user,
      contributions_count: access.contributions_count,
      can_access_downloads: access.can_access_downloads
    };
    setUser(updatedUser);
    localStorage.setItem('unilink_cached_user', JSON.stringify(updatedUser));

    const activeToken = getAuthToken();
    if (activeToken) {
      saveOfflineSession({ token: activeToken, user: updatedUser })
        .catch((error) => console.warn('[UniLink Auth] No se pudo guardar la sesión actualizada offline:', error));
    }
    return true;
  }, [user]);

  // Cargar usuario y token autenticado inicial (Soporta arranque Online y Offline)
  useEffect(() => {
    const initAuth = async () => {
      // Garantizar que la base de datos offline tenga el usuario demo precargado
      await seedDefaultOfflineUser();

      const existingToken = getAuthToken();
      const offlineSession = await getOfflineSession();

      // Caso 1: Hay token en localStorage o sesión en IndexedDB
      const activeToken = existingToken || offlineSession?.token;

      if (!activeToken) {
        setLoading(false);
        return;
      }

      // Si es sesión de invitado, restaurar sin consultar API
      if (activeToken === 'guest-session-token') {
        const cached = localStorage.getItem('unilink_cached_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {}
        }
        setAuthToken(activeToken);
        setTokenState(activeToken);
        setLoading(false);
        return;
      }

      setAuthToken(activeToken);
      setTokenState(activeToken);

      // Intentar validar sesión con el servidor
      try {
        const data = await api.getMe();
        if (data.success && data.user) {
          setUser(data.user);
          setIsOfflineSession(false);
          localStorage.setItem('unilink_cached_user', JSON.stringify(data.user));
          await saveOfflineSession({ token: activeToken, user: data.user });
        }
      } catch (err) {
        // En caso de caída de red u offline, restaurar desde IndexedDB o localStorage
        console.warn('[UniLink Auth] Red no disponible, restaurando sesión local desde IndexedDB / caché:', err.message);

        if (offlineSession?.user) {
          setUser(offlineSession.user);
          setIsOfflineSession(true);
        } else {
          const cached = localStorage.getItem('unilink_cached_user');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setUser(parsed);
              setIsOfflineSession(true);
            } catch (e) {}
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Inicio de sesión híbrido (Online con API / Offline con IndexedDB)
   */
  const login = async (email, password) => {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Intentar autenticación online
    try {
      const res = await api.login(normalizedEmail, password);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        setIsOfflineSession(false);
        localStorage.setItem('unilink_cached_user', JSON.stringify(res.user));
        await saveOfflineSession({ token: res.token, user: res.user });

        // Guardar credenciales para acceso offline futuro
        await db.cached_users.put({
          email: normalizedEmail,
          password,
          role: res.user.role,
          full_name: res.user.profile?.full_name || 'Estudiante'
        });

        return res;
      }
    } catch (networkErr) {
      // 1. Si el servidor SÍ respondió (ej. HTTP 401 Credenciales Inválidas, 400, 404):
      // NO enmascarar el error con falso mensaje de conexión; propagar el motivo real del backend.
      if (networkErr.isServerResponse || (networkErr.status && networkErr.status < 500)) {
        throw networkErr;
      }

      console.warn('[UniLink Auth] Falló conexión con servidor, verificando credenciales en IndexedDB:', networkErr.message);

      // 2. Fallback de Autenticación Offline mediante IndexedDB (Solo ante fallo genuino de red)
      const cachedUser = await db.cached_users.get(normalizedEmail);

      // Validar si coincide con el usuario demo precargado o usuario guardado
      const isDemo = normalizedEmail === 'estudiante@unilink.edu.co' && password === '123456';
      const isAdminDemo = normalizedEmail === 'admin@unilink.edu.co' && password === '123456';
      const isCachedMatch = cachedUser && cachedUser.password === password;

      if (isDemo || isAdminDemo || isCachedMatch) {
        const offlineToken = `offline-jwt-session-${Date.now()}`;
        const offlineUser = {
          id: isDemo
            ? 'u1111111-1111-1111-1111-111111111111'
            : isAdminDemo
            ? 'u2222222-2222-2222-2222-222222222222'
            : crypto.randomUUID(),
          email: normalizedEmail,
          role: isAdminDemo ? 'ADMIN' : 'STUDENT',
          profile: {
            full_name: isDemo
              ? 'Walter Alfonso'
              : isAdminDemo
              ? 'Administrador General'
              : cachedUser?.full_name || 'Estudiante',
            university: 'Universidad (Campus Tunja)',
            academic_program: 'Ingeniería de Sistemas y Computación',
            semester: 9,
            latitude: 5.5530,
            longitude: -73.3565
          }
        };

        setAuthToken(offlineToken);
        setTokenState(offlineToken);
        setUser(offlineUser);
        setIsOfflineSession(true);
        localStorage.setItem('unilink_cached_user', JSON.stringify(offlineUser));
        await saveOfflineSession({ token: offlineToken, user: offlineUser });

        return {
          success: true,
          token: offlineToken,
          user: offlineUser,
          isOffline: true,
          message: 'Inicio de sesión offline concedido desde IndexedDB.'
        };
      }

      throw new Error(
        'No se pudo conectar con el servidor en la nube y no existen credenciales offline guardadas en este dispositivo para este correo.'
      );
    }
  };

  /**
   * Registro institucional (Obligatoriamente en el Servidor Central PostgreSQL)
   */
  const register = async (payload) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('⚠️ Conexión Requerida: El registro de nuevos estudiantes debe validarse directamente en la base de datos central de UniLink en PostgreSQL. Por favor conéctate a internet para crear tu cuenta.');
    }

    try {
      const res = await api.register(payload);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setTokenState(res.token);
        setUser(res.user);
        setIsOfflineSession(false);
        localStorage.setItem('unilink_cached_user', JSON.stringify(res.user));
        await saveOfflineSession({ token: res.token, user: res.user });

        // Guardar para futuros accesos offline
        await db.cached_users.put({
          email: payload.email.toLowerCase().trim(),
          password: payload.password,
          role: res.user.role,
          full_name: payload.full_name
        });

        return res;
      }
      throw new Error(res.error || 'Error en el registro.');
    } catch (err) {
      console.warn('[UniLink Auth] Error en registro online:', err.message);
      throw err;
    }
  };

  /**
   * Inicio de sesión directo pegando un Token de acceso
   */
  const loginWithToken = async (directToken) => {
    if (!directToken || !directToken.trim()) {
      throw new Error('Debes proporcionar un token de acceso válido.');
    }

    const cleanToken = directToken.trim();
    setAuthToken(cleanToken);
    setTokenState(cleanToken);

    try {
      const data = await api.getMe();
      if (data.success && data.user) {
        setUser(data.user);
        setIsOfflineSession(false);
        localStorage.setItem('unilink_cached_user', JSON.stringify(data.user));
        await saveOfflineSession({ token: cleanToken, user: data.user });
        return { success: true, user: data.user };
      }
    } catch (err) {
      // Fallback si el token es de formato de prueba o offline
      const fallbackUser = {
        id: 'u1111111-1111-1111-1111-111111111111',
        email: 'estudiante@unilink.edu.co',
        role: 'STUDENT',
        profile: {
          full_name: 'Walter Alfonso (Acceso por Token)',
          university: 'Universidad (Campus Tunja)',
          academic_program: 'Ingeniería de Sistemas y Computación',
          semester: 9,
          latitude: 5.5530,
          longitude: -73.3565
        }
      };
      setUser(fallbackUser);
      setIsOfflineSession(true);
      await saveOfflineSession({ token: cleanToken, user: fallbackUser });
      return { success: true, user: fallbackUser };
    }
  };

  /**
   * Inicio de sesión como Invitado (Modo Explorador / Solo Lectura)
   */
  const loginAsGuest = () => {
    const guestUser = {
      id: 'guest-explorer-001',
      email: 'invitado@unilink.app',
      role: 'GUEST',
      profile: {
        full_name: 'Visitante Invitado',
        university: 'Comunidad Universitaria',
        academic_program: 'Explorador Académico',
        semester: 1,
        latitude: 5.5530,
        longitude: -73.3565
      }
    };
    const guestToken = 'guest-session-token';
    setAuthToken(guestToken);
    setTokenState(guestToken);
    setUser(guestUser);
    setIsOfflineSession(false);
    localStorage.setItem('unilink_cached_user', JSON.stringify(guestUser));
    return { success: true, user: guestUser };
  };

  /**
   * Cierre de sesión y limpieza de tokens
   */
  const logout = async () => {
    removeAuthToken();
    localStorage.removeItem('unilink_cached_user');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    await clearOfflineSession();
    setUser(null);
    setTokenState(null);
    setIsOfflineSession(false);
  };

  const updateUserProfile = (newProfile) => {
    if (!user) return;
    const updated = { ...user, profile: { ...user.profile, ...newProfile } };
    setUser(updated);
    localStorage.setItem('unilink_cached_user', JSON.stringify(updated));
    if (token) {
      saveOfflineSession({ token, user: updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isOfflineSession,
        isGuest: user?.role === 'GUEST',
        login,
        register,
        loginWithToken,
        loginAsGuest,
        logout,
        updateUserProfile,
        updateContributionAccess
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
