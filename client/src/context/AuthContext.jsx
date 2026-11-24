import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken, getAuthToken } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Check login state on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        // Attempt silent refresh via HTTP-only cookie
        try {
          const { data } = await api.post('/auth/refresh');
          setAuthToken(data.accessToken);
          setUser(data.user);
        } catch (e) {
          setUser(null);
        }
      } else {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.user);
        } catch (e) {
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email, password, rememberMe) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    setAuthToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    }
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
