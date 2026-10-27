import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getCart, updateCartItem, removeCartItem,
  validatePromo, createOrder,
} from '../api';
import { useAuth } from '../authContext';
import Header from '../components/Header';

export default function CartPage() {
  const navigate = useNavigate();
  const { refreshCartCount } = useAuth();

  const [cart,          setCart]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [promoCode,     setPromoCode]     = useState('');
  const [appliedPromo,  setAppliedPromo]  = useState(null); // {code, discount_percent, discount_amount}
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoError,    setPromoError]    = useState('');
  const [orderLoading,  setOrderLoading]  = useState(false);
  const [orderError,    setOrderError]    = useState('');
  const [toast,         setToast]         = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ---------------------------------------------------------------------------
  // Fetch cart
  // ---------------------------------------------------------------------------
  const fetchCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  // ---------------------------------------------------------------------------
  // Quantity controls
  // ---------------------------------------------------------------------------
  const handleQuantityChange = async (itemId, newQty) => {
    // Optimistic update
    setCart(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, quantity: newQty } : i
      ),
    }));
    try {
      const updated = await updateCartItem(itemId, { quantity: newQty });
      setCart(updated);
      refreshCartCount();
    } catch {
      fetchCart(); // revert on error
    }
  };

  const handleRemove = async (itemId) => {
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
      refreshCartCount();
    } catch {
      fetchCart();
    }
  };

  // ---------------------------------------------------------------------------
  // Promo
  // ---------------------------------------------------------------------------
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const data = await validatePromo(promoCode.trim());
      // Calculate discount amount from current subtotal
      const subtotal       = cart?.subtotal || 0;
      const discountAmount = Math.round(subtotal * data.discount_percent / 100 * 100) / 100;
      setAppliedPromo({
        code:             promoCode.trim().toUpperCase(),
        discount_percent: data.discount_percent,
        discount_amount:  discountAmount,
      });
      setPromoCode('');
    } catch {
      setPromoError('Invalid promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  // ---------------------------------------------------------------------------
  // Place order
  // ---------------------------------------------------------------------------
  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    setOrderError('');
    try {
      const payload = {};
      if (appliedPromo) payload.promo_code = appliedPromo.code;
      const order = await createOrder(payload);
      setAppliedPromo(null);
      await refreshCartCount();
      showToast('Order placed successfully!');
      setTimeout(() => navigate(`/orders/${order.id}`), 800);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg.includes('address')) {
        setOrderError('Please complete your delivery address in your profile before placing an order.');
      } else {
        setOrderError('Failed to place order. Please try again.');
      }
    } finally {
      setOrderLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const subtotal     = Number(cart?.subtotal     || 0);
  const deliveryFee  = Number(cart?.delivery_fee || 0);
  const discount     = appliedPromo ? Number(appliedPromo.discount_amount) : 0;
  const total        = subtotal + deliveryFee - discount;
  const isEmpty      = !cart?.items?.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="state-center" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="state-center" style={{ minHeight: '60vh' }}>
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />

      <div className="cart-page">
        <div className="cart-layout">

          {/* ============ LEFT: Items ============ */}
          <div>
            <h1 className="cart-title">
              Your Cart{' '}
              {cart?.total_items > 0 && (
                <span style={{ fontSize: '16px', color: '#888', fontFamily: 'Inter' }}>
                  ({cart.total_items} {cart.total_items === 1 ? 'item' : 'items'})
                </span>
              )}
            </h1>

            {isEmpty ? (
              <div className="state-center" style={{ minHeight: '200px' }}>
                <p className="empty-text">Your cart is empty</p>
                <button className="btn-primary" onClick={() => navigate('/')}>
                  Continue Shopping
                </button>
              </div>
            ) : (
              cart.items.map(item => (
                <div key={item.id} className="cart-item">
                  <img
                    className="cart-item-image"
                    src={item.product.thumbnail || ''}
                    alt={item.product.name}
                    onError={e => { e.target.style.background = '#eee'; e.target.src = ''; }}
                  />
                  <div className="cart-item-details">
                    <p className="cart-item-name">{item.product.name}</p>
                    <p className="cart-item-meta">Size: {item.variant.size}</p>
                    <p className="cart-item-price">
                      PKR {Number(item.product.base_price).toLocaleString()}
                    </p>

                    <div className="quantity-controls">
                      <button
                        className="qty-btn"
                        disabled={item.quantity <= 1}
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        disabled={item.quantity >= 10}
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className="cart-item-price">
                      PKR {Number(item.subtotal).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ============ RIGHT: Summary ============ */}
          <div className="order-summary">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-row">
              <span>Subtotal</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>

            <div className="summary-row">
              <span>
                Delivery
                {cart?.delivery_country_name && ` to ${cart.delivery_country_name}`}
              </span>
              <span>PKR {deliveryFee.toLocaleString()}</span>
            </div>

            {!cart?.delivery_country_name && (
              <p className="address-note">
                Delivery calculated for Pakistan. Update your profile to see accurate delivery cost.
              </p>
            )}

            {/* Promo */}
            <div className="promo-section">
              {!appliedPromo ? (
                <>
                  <div className="promo-input-row">
                    <input
                      className="promo-input"
                      type="text"
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                    />
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                    >
                      {promoLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="promo-error">{promoError}</p>}
                </>
              ) : (
                <div>
                  <p className="promo-success">
                    Promo applied! {appliedPromo.discount_percent}% off
                  </p>
                  <button
                    style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginTop: '4px' }}
                    onClick={handleRemovePromo}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {appliedPromo && (
              <div className="summary-row summary-row--discount">
                <span>Discount ({appliedPromo.discount_percent}%)</span>
                <span>-PKR {discount.toLocaleString()}</span>
              </div>
            )}

            <div className="summary-row summary-row--total">
              <span>Total</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>

            {orderError && (
              <p className="form-error" style={{ marginBottom: '12px' }}>
                {orderError}
                {orderError.includes('address') && (
                  <> <Link to="/profile" style={{ color: '#111' }}>Go to Profile</Link></>
                )}
              </p>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px 0', marginTop: '8px' }}
              disabled={isEmpty || orderLoading}
              onClick={handlePlaceOrder}
            >
              {orderLoading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>

        </div>
      </div>

      {/* Toast */}
      <div className={`pdp-toast${toast ? ' pdp-toast--visible' : ''}`}>
        {toast}
      </div>
    </div>
  );
}