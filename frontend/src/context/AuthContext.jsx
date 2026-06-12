import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { mergeGuestCartIntoUserCart, POST_LOGIN_REDIRECT_KEY } from '../utils/cartStorage';
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCE_STORAGE_KEY,
  normalizeThemePreference
} from '../utils/themePreferences';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' o 'register'
  const navigate = useNavigate();
  
  // States for the Welcome Animation
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [themePreference, setThemePreferenceState] = useState(DEFAULT_THEME_PREFERENCE);

  const applyThemePreference = (theme) => {
    const normalizedTheme = normalizeThemePreference(theme);
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, normalizedTheme);
    setThemePreferenceState(normalizedTheme);
    return normalizedTheme;
  };

  const triggerWelcome = (name) => {
    setWelcomeName(name);
    setShowWelcome(true);
  };

  const closeWelcome = () => setShowWelcome(false);

  useEffect(() => {
    applyThemePreference(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY) || DEFAULT_THEME_PREFERENCE);

    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        if (res.data.user?.tema_preferencia) {
          applyThemePreference(res.data.user.tema_preferencia);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.user);
    if (res.data.user?.tema_preferencia) {
      applyThemePreference(res.data.user.tema_preferencia);
    }
    return res.data;
  };

  const login = async (email, clave, skipAnimation = false, turnstileToken = '') => {
    const res = await api.post('/auth/login', { email, clave, turnstileToken });
    setUser(res.data.user);
    if (res.data.user?.tema_preferencia) {
      applyThemePreference(res.data.user.tema_preferencia);
    }
    mergeGuestCartIntoUserCart(res.data.user.id);

    const pendingRedirect = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (pendingRedirect) {
      localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      navigate(pendingRedirect);
    }

    if (!skipAnimation) {
      triggerWelcome(res.data.user.nombre);
    }
    return res.data;
  };

  const register = async (nombre, email, clave, confirmarClave, turnstileToken = '') => {
    const res = await api.post('/auth/register', { nombre, email, clave, confirmarClave, turnstileToken });
    return res.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    navigate('/');
  };

  const updateProfile = async (formData) => {
    const res = await api.put('/auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setUser(res.data.user);
    if (res.data.user?.tema_preferencia) {
      applyThemePreference(res.data.user.tema_preferencia);
    }
    return res.data;
  };

  const setThemePreference = async (theme) => {
    const normalizedTheme = applyThemePreference(theme);

    if (!user) {
      return normalizedTheme;
    }

    const formData = new FormData();
    formData.append('tema_preferencia', normalizedTheme);

    try {
      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data.user);
      if (res.data.user?.tema_preferencia) {
        applyThemePreference(res.data.user.tema_preferencia);
      }
      return normalizedTheme;
    } catch (error) {
      applyThemePreference(user.tema_preferencia || DEFAULT_THEME_PREFERENCE);
      throw error;
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin: user?.rol === 'admin',
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    updateProfile,
    themePreference,
    setThemePreference,
    refreshUser,
    showWelcome,
    welcomeName,
    triggerWelcome,
    closeWelcome
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
