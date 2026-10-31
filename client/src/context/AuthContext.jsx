import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The session lives entirely in httpOnly cookies. On load we ask the server who we are;
  // there is no token in JS to read, which is the point (an XSS cannot steal it).
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Prime the CSRF cookie, then load the profile.
    api.get('/auth/csrf').finally(() => refresh().finally(() => setLoading(false)));
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.mfaRequired) return { mfaRequired: true };
    setUser(data.user);
    return { user: data.user };
  };

  const verifyMfa = async (code) => {
    const { data } = await api.post('/auth/mfa/verify', { code });
    setUser(data.user);
    return data.user;
  };

  const register = (payload) => api.post('/auth/register', payload);

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    setUser,
    refresh,
    login,
    verifyMfa,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
