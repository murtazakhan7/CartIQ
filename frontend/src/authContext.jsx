import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout as logoutApi, getCart } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [tokens,    setTokens]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

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

  const refreshCartCount = async () => {
    try {
      const data = await getCart();
      setCartCount(data.total_items || 0);
    } catch {
      // fail silently
    }
  };

  const login = async (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('cartiq_user',   JSON.stringify(userData));
    localStorage.setItem('cartiq_tokens', JSON.stringify(tokenData));
    // fetch cart count after login
    try {
      const data = await getCart();
      setCartCount(data.total_items || 0);
    } catch {
      setCartCount(0);
    }
  };

  const logout = async () => {
    try {
      const saved = localStorage.getItem('cartiq_tokens');
      if (saved) {
        const t = JSON.parse(saved);
        await logoutApi(t.refresh);
      }
    } catch {
      // proceed regardless
    } finally {
      setUser(null);
      setTokens(null);
      setCartCount(0);
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
      cartCount,
      refreshCartCount,
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