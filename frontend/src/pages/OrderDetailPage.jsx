import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getOrderDetail } from '../api';
import Header from '../components/Header';

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {status}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getOrderDetail(id)
      .then(setOrder)
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (error || !order) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="order-detail-page">
          <Link to="/orders" className="back-link">← Back to Orders</Link>
          <p className="error-text">{error || 'Order not found.'}</p>
        </div>
      </div>
    );
  }

  const hasDiscount = Number(order.discount_amount) > 0;

  return (
    <div className="page-wrapper">
      <Header />
      <div className="order-detail-page">
        <Link to="/orders" className="back-link">← Back to Orders</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <h1 className="orders-title" style={{ marginBottom: 0 }}>Order #{order.id}</h1>
          <StatusBadge status={order.status} />
        </div>

        <div className="order-detail-layout">

          {/* ============ LEFT: Items ============ */}
          <div className="order-items-section">
            <h2 className="profile-section-title">Items</h2>
            {order.items.map(item => (
              <div key={item.id} className="order-item">
                {item.product.thumbnail ? (
                  <img
                    className="order-item-image"
                    src={item.product.thumbnail}
                    alt={item.product.name}
                  />
                ) : (
                  <div className="order-item-image" style={{ background: '#f5f5f5' }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>
                    {item.product.name}
                  </p>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Size: {item.variant.size}
                  </p>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                    Qty: {item.quantity}
                  </p>
                  <p style={{ fontSize: '13px', color: '#555' }}>
                    PKR {Number(item.price_at_purchase).toLocaleString()} each
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>
                    PKR {Number(item.subtotal).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ============ RIGHT: Summary ============ */}
          <div className="order-summary-section">
            <div className="order-summary">
              <h2 className="summary-title">Summary</h2>

              <div className="summary-row">
                <span>Subtotal</span>
                <span>PKR {Number(order.subtotal).toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span>PKR {Number(order.delivery_fee).toLocaleString()}</span>
              </div>
              {hasDiscount && (
                <div className="summary-row summary-row--discount">
                  <span>
                    Promo{order.promo_code && `: ${order.promo_code}`}
                    {order.discount_percent > 0 && ` (-${order.discount_percent}%)`}
                  </span>
                  <span>-PKR {Number(order.discount_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span>PKR {Number(order.total_amount).toLocaleString()}</span>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                <p className="profile-section-title" style={{ marginBottom: '8px' }}>
                  Delivery Address
                </p>
                {order.delivery_address_line && (
                  <p style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                    {order.delivery_address_line}
                  </p>
                )}
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                  {[order.delivery_city, order.delivery_province].filter(Boolean).join(', ')}
                </p>
                <p style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>
                  {[order.delivery_country, order.delivery_postal_code].filter(Boolean).join(' ')}
                </p>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <div className="summary-row">
                  <span style={{ color: '#888', fontSize: '13px' }}>Placed</span>
                  <span style={{ fontSize: '13px' }}>{order.created_at}</span>
                </div>
                <div className="summary-row">
                  <span style={{ color: '#888', fontSize: '13px' }}>Payment</span>
                  <span style={{ fontSize: '13px' }}>Cash on Delivery</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}