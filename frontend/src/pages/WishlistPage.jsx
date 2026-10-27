import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWishlist, removeFromWishlist } from '../api';
import Header from '../components/Header';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getWishlist()
      .then(data => setItems(data.items || []))
      .catch(() => setError('Failed to load wishlist.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (e, itemId) => {
    e.stopPropagation();
    // Optimistic removal
    setItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await removeFromWishlist(itemId);
    } catch {
      // Refetch on failure
      getWishlist()
        .then(data => setItems(data.items || []))
        .catch(() => {});
    }
  };

  return (
    <div className="page-wrapper">
      <Header />
      <div className="wishlist-page">
        <h1 className="wishlist-title">
          My Wishlist
          {items.length > 0 && (
            <span className="wishlist-count">({items.length} items)</span>
          )}
        </h1>

        {loading && (
          <div className="state-center" style={{ minHeight: '200px' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && error && (
          <p className="error-text">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="state-center" style={{ minHeight: '200px' }}>
            <p className="empty-text">Your wishlist is empty</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Discover Products
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="product-grid">
            {items.map(item => {
              const p = item.product;
              return (
                <div
                  key={item.id}
                  className={`product-card wishlist-card${!p.has_any_stock ? ' product-card--oos' : ''}`}
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div className="card-image-wrapper">
                    {p.thumbnail ? (
                      <img className="card-image" src={p.thumbnail} alt={p.name} />
                    ) : (
                      <div className="card-image-placeholder">No Image</div>
                    )}
                    {!p.has_any_stock && (
                      <span className="oos-badge">Out of Stock</span>
                    )}
                    <button
                      className="wishlist-heart-btn"
                      onClick={e => handleRemove(e, item.id)}
                      title="Remove from wishlist"
                    >
                      ♥
                    </button>
                  </div>
                  <div className="card-body">
                    <p className="card-name">{p.name}</p>
                    <p className="card-price">
                      PKR {Number(p.base_price).toLocaleString()}
                    </p>
                    <div className="card-tags">
                      <span className="tag">{p.category}</span>
                      <span className="tag">{p.subcategory}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}