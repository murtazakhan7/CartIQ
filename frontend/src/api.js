import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  try {
    const saved = localStorage.getItem('cartiq_tokens');
    if (saved) {
      const tokens = JSON.parse(saved);
      if (tokens.access) {
        config.headers['Authorization'] = `Bearer ${tokens.access}`;
      }
    }
  } catch {
    // ignore malformed localStorage
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — refresh on 401
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const saved = localStorage.getItem('cartiq_tokens');
        if (!saved) throw new Error('No tokens');

        const tokens   = JSON.parse(saved);
        const response = await axios.post(
          'http://localhost:8000/api/auth/token/refresh/',
          { refresh: tokens.refresh }
        );

        const newAccess = response.data.access;
        const updated   = { ...tokens, access: newAccess };
        localStorage.setItem('cartiq_tokens', JSON.stringify(updated));

        original.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        localStorage.removeItem('cartiq_user');
        localStorage.removeItem('cartiq_tokens');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const getCategories    = ()       => api.get('/api/categories/').then(r => r.data);
export const getProducts      = (params) => api.get('/api/products/', { params }).then(r => r.data);
export const getProductDetail = (id)     => api.get(`/api/products/${id}/`).then(r => r.data);
export const getSimilarProducts = (id)  => api.get(`/api/products/${id}/similar/`).then(r => r.data);
export const getDelivery      = (code)   => api.get('/api/delivery/', { params: { country: code } }).then(r => r.data);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const register       = (data)          => api.post('/api/auth/register/', data).then(r => r.data);
export const login          = (data)          => api.post('/api/auth/login/', data).then(r => r.data);
export const logout         = (refreshToken)  => api.post('/api/auth/logout/', { refresh: refreshToken }).then(r => r.data);
export const getProfile     = ()              => api.get('/api/auth/me/').then(r => r.data);
export const updateProfile  = (data)          => api.patch('/api/auth/me/', data).then(r => r.data);
export const changePassword = (data)          => api.post('/api/auth/change-password/', data).then(r => r.data);

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export const getCart         = ()              => api.get('/api/cart/').then(r => r.data);
export const addToCart       = (data)          => api.post('/api/cart/items/', data).then(r => r.data);
export const updateCartItem  = (itemId, data)  => api.patch(`/api/cart/items/${itemId}/`, data).then(r => r.data);
export const removeCartItem  = (itemId)        => api.delete(`/api/cart/items/${itemId}/`).then(r => r.data);
export const clearCart       = ()              => api.delete('/api/cart/clear/').then(r => r.data);

// ---------------------------------------------------------------------------
// Promo
// ---------------------------------------------------------------------------
export const validatePromo = (code) => api.post('/api/promo/validate/', { code }).then(r => r.data);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const createOrder    = (data) => api.post('/api/orders/', data).then(r => r.data);
export const getOrders      = ()     => api.get('/api/orders/').then(r => r.data);
export const getOrderDetail = (id)   => api.get(`/api/orders/${id}/`).then(r => r.data);

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------
export const getWishlist        = ()            => api.get('/api/wishlist/').then(r => r.data);
export const addToWishlist      = (productId)   => api.post('/api/wishlist/', { product_id: productId }).then(r => r.data);
export const removeFromWishlist = (itemId)      => api.delete(`/api/wishlist/${itemId}/`).then(r => r.data);
export const checkWishlist      = (productId)   => api.get('/api/wishlist/check/', { params: { product_id: productId } }).then(r => r.data);