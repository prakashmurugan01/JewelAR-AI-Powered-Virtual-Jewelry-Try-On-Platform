import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// ═══ OAuth Config — read from env or use defaults ═══
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/login`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user;

  // Load user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/profile/');
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/api/login/', { email, password });
      if (res.data.access) {
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (data) => {
    setError(null);
    try {
      const res = await api.post('/api/register/', data);
      return { success: true, message: res.data.message };
    } catch (err) {
      const errors = err.response?.data;
      let msg = 'Registration failed.';
      
      if (errors) {
        // Handle detailed error responses
        if (errors.error) {
          msg = errors.error;
        } else if (errors.details) {
          // Field-specific errors
          const firstKey = Object.keys(errors.details)[0];
          const fieldError = errors.details[firstKey];
          msg = Array.isArray(fieldError) ? fieldError[0] : fieldError;
        } else {
          // Try to extract first field error
          const firstKey = Object.keys(errors)[0];
          if (firstKey) {
            const fieldError = errors[firstKey];
            msg = Array.isArray(fieldError) ? fieldError[0] : fieldError;
          }
        }
      }
      
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ═══ Social Login: exchange auth code with backend ═══
  const socialLogin = useCallback(async (provider, code) => {
    setError(null);
    try {
      const endpoint = provider === 'google' ? '/api/auth/google/' : '/api/auth/github/';
      const payload = { code };
      if (provider === 'google') {
        payload.redirect_uri = REDIRECT_URI;
      }
      const res = await api.post(endpoint, payload);
      if (res.data.access) {
        localStorage.setItem('access_token', res.data.access);
        localStorage.setItem('refresh_token', res.data.refresh);
        setUser(res.data.user);
        return { success: true, created: res.data.created };
      }
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || `${provider} login failed.`;
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  // ═══ Initiate OAuth flow (redirect to provider) ═══
  const initiateGoogleLogin = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID in .env');
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: 'google',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, []);

  const initiateGitHubLogin = useCallback(() => {
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub OAuth is not configured. Set VITE_GITHUB_CLIENT_ID in .env');
      return;
    }
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'user:email',
      state: 'github',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }, []);

  const value = {
    user, loading, error, isAuthenticated,
    login, register, logout, fetchProfile, setError,
    socialLogin, initiateGoogleLogin, initiateGitHubLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

