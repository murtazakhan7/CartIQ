import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as logoutApi } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const savedUser   = localStorage.getItem('cartiq_user');
      const savedTokens = localStorage.getItem('cartiq_tokens');
      if (savedUser && savedTokens) {
        setUser(JSON.parse(savedUser));
        setTokens(JSON.parse(savedTokens));
      }
    } catch {
      localStorage.removeItem('cartiq_user');
      localStorage.removeItem('cartiq_tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('cartiq_user',   JSON.stringify(userData));
    localStorage.setItem('cartiq_tokens', JSON.stringify(tokenData));
  };

  const logout = async () => {
    try {
      const saved = localStorage.getItem('cartiq_tokens');
      if (saved) {
        const t = JSON.parse(saved);
        await logoutApi(t.refresh);
      }
    } catch {
      // proceed with local logout even if API call fails
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('cartiq_user');
      localStorage.removeItem('cartiq_tokens');
      navigate('/login');
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('cartiq_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;