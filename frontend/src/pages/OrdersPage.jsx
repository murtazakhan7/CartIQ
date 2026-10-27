import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../api';
import Header from '../components/Header';

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {status}
    </span>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrapper">
      <Header />
      <div className="orders-page">
        <h1 className="orders-title">My Orders</h1>

        {loading && (
          <div className="state-center" style={{ minHeight: '200px' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && error && (
          <p className="error-text">{error}</p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="state-center" style={{ minHeight: '200px' }}>
            <p className="empty-text">You have no orders yet</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Start Shopping
            </button>
          </div>
        )}

        {!loading && !error && orders.map(order => (
          <div
            key={order.id}
            className="order-card"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <div className="order-card-header">
              <span className="order-number">Order #{order.id}</span>
              <StatusBadge status={order.status} />
            </div>

            <p className="order-meta">{order.created_at}</p>
            <p className="order-meta">
              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
              {order.delivery_city && ` · ${order.delivery_city}, ${order.delivery_country}`}
            </p>
            <p className="order-total">
              PKR {Number(order.total_amount).toLocaleString()}
            </p>

            <button
              className="view-details-btn"
              onClick={e => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
            >
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}