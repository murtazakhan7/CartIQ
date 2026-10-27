import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './authContext';
import ProductListPage   from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import OrdersPage      from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage    from './pages/WishlistPage';
import ProfilePage     from './pages/ProfilePage';



function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="state-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"            element={<ProductListPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/register"    element={<RegisterPage />} />

      <Route path="/cart" element={
  <ProtectedRoute>
    <CartPage />
  </ProtectedRoute>
  } />
     <Route path="/orders" element={
  <ProtectedRoute><OrdersPage /></ProtectedRoute>
} />
<Route path="/orders/:id" element={
  <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
} />
<Route path="/wishlist" element={
  <ProtectedRoute><WishlistPage /></ProtectedRoute>
} />
<Route path="/profile" element={
  <ProtectedRoute><ProfilePage /></ProtectedRoute>
} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes>
      </AppRoutes>
    </AuthProvider>
  );
}