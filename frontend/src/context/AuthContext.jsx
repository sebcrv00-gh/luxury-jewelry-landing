import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, clave) => {
    const res = await api.post('/auth/login', { email, clave });
    setUser(res.data.user);
    return res.data;
  };

  const register = async (nombre, email, clave) => {
    const res = await api.post('/auth/register', { nombre, email, clave });
    return res.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const updateProfile = async (formData) => {
    const res = await api.put('/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setUser(res.data.user);
    return res.data;
  };

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin: user?.rol === 'admin',
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
