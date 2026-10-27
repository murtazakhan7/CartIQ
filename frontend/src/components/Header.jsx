import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../authContext';

export default function Header({ searchSlot, cartCount = 0 }) {
  const { isAuthenticated, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate    = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const username = user?.email?.split('@')[0] || '';

  return (
    <header className="site-header">
      <Link to="/" className="site-logo">LAAM</Link>

      {/* Search slot — only rendered when passed */}
      {searchSlot && (
        <div className="search-wrapper">{searchSlot}</div>
      )}

      <nav className="header-nav">
        {!isAuthenticated ? (
          <>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            {/* Wishlist */}
            <span
              className="wishlist-icon"
              onClick={() => navigate('/wishlist')}
              title="Wishlist"
            >
              ♡
            </span>

            {/* Cart */}
            <span
              className="cart-icon-wrapper"
              onClick={() => navigate('/cart')}
              title="Cart"
            >
              🛍
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </span>

            {/* User dropdown */}
            <div className="user-dropdown-wrapper" ref={dropdownRef}>
              <span
                style={{ cursor: 'pointer', fontSize: '13px' }}
                onClick={() => setDropdownOpen(o => !o)}
              >
                {username} ▾
              </span>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Orders
                  </Link>
                  <button onClick={() => { setDropdownOpen(false); logout(); }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
    </header>
  );
}