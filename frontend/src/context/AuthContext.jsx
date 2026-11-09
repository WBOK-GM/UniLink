import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario autenticado inicial
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('unilink_cached_user', JSON.stringify(data.user));
        }
      } catch (err) {
        // Si está offline, usar caché de usuario local
        const cached = localStorage.getItem('unilink_cached_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      localStorage.setItem('unilink_cached_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    if (res.success && res.token) {
      setAuthToken(res.token);
      setUser(res.user);
      localStorage.setItem('unilink_cached_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = () => {
    removeAuthToken();
    localStorage.removeItem('unilink_cached_user');
    setUser(null);
  };

  const updateUserProfile = (newProfile) => {
    if (!user) return;
    const updated = { ...user, profile: { ...user.profile, ...newProfile } };
    setUser(updated);
    localStorage.setItem('unilink_cached_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
