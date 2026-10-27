import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProductDetail, getSimilarProducts, getDelivery,
  addToCart, checkWishlist, addToWishlist, removeFromWishlist,
} from '../api';
import { useAuth } from '../authContext';
import Header from '../components/Header';

const COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'UAE' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Map country name to country code for the delivery dropdown
const NAME_TO_CODE = {
  'pakistan':       'PK',
  'uae':            'AE',
  'united kingdom': 'GB',
  'united states':  'US',
};

export default function ProductDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { isAuthenticated, user, refreshCartCount } = useAuth();

  const [product,         setProduct]         = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [selectedImage,   setSelectedImage]   = useState(null);
  const [selectedSize,    setSelectedSize]    = useState(null);
  const [delivery,        setDelivery]        = useState(null);
  const [loadingProduct,  setLoadingProduct]  = useState(true);
  const [loadingSimilar,  setLoadingSimilar]  = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [loadingCart,     setLoadingCart]     = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('PK');
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [toast,           setToast]           = useState({ visible: false, message: '', isError: false });
  const [error,           setError]           = useState(null);
  const [inWishlist,      setInWishlist]      = useState(false);
  const [wishlistItemId,  setWishlistItemId]  = useState(null);

  // ---------------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------------
  const showToast = (message, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => setToast({ visible: false, message: '', isError: false }), 2500);
  };

  // ---------------------------------------------------------------------------
  // Fetch on id change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setProduct(null);
    setSelectedImage(null);
    setSelectedSize(null);
    setDelivery(null);
    setError(null);
    setInWishlist(false);
    setWishlistItemId(null);
    setLoadingProduct(true);
    setLoadingSimilar(true);
    setLoadingDelivery(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchAll = async () => {
      try {
        const prod = await getProductDetail(id);
        setProduct(prod);
        if (prod.images?.length > 0) setSelectedImage(prod.images[0].image_url);
        setLoadingProduct(false);

        // Determine default country
        let defaultCode = 'PK';
        if (isAuthenticated && user?.has_country) {
          const code = NAME_TO_CODE[user.country.toLowerCase()];
          if (code) { defaultCode = code; }
        }
        setSelectedCountry(defaultCode);

        const [similar, del] = await Promise.allSettled([
          getSimilarProducts(id),
          getDelivery(defaultCode),
        ]);
        if (similar.status === 'fulfilled') setSimilarProducts(similar.value);
        if (del.status    === 'fulfilled') setDelivery(del.value);
        setLoadingSimilar(false);
        setLoadingDelivery(false);

        // Wishlist check
        if (isAuthenticated) {
          try {
            const wl = await checkWishlist(prod.id);
            setInWishlist(wl.in_wishlist);
            setWishlistItemId(wl.wishlist_item_id);
          } catch { /* silent */ }
        }
      } catch {
        setError('Something went wrong. Please try again.');
        setLoadingProduct(false);
        setLoadingSimilar(false);
        setLoadingDelivery(false);
      }
    };

    fetchAll();
  }, [id, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Refetch delivery on country change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!product) return;
    setLoadingDelivery(true);
    setDelivery(null);
    getDelivery(selectedCountry)
      .then(setDelivery)
      .catch(() => setDelivery(null))
      .finally(() => setLoadingDelivery(false));
  }, [selectedCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------
  const variantMap      = product
    ? Object.fromEntries(product.variants.map(v => [v.size, v]))
    : {};
  const selectedVariant = selectedSize ? variantMap[selectedSize] : null;
  const canAddToCart    = selectedVariant &&
    (selectedVariant.status === 'in_stock' || selectedVariant.status === 'low_stock');

  const totalPrice = product && delivery
    ? Number(product.base_price) + Number(delivery.flat_fee)
    : null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSizeClick = (size) => {
    const variant = variantMap[size];
    if (!variant || variant.status === 'out_of_stock') return;
    setSelectedSize(size);
  };

  const handleAddToCart = async () => {
    if (!canAddToCart) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    setLoadingCart(true);
    try {
      await addToCart({
        product_id: product.id,
        variant_id: selectedVariant.id,
        quantity:   1,
      });
      await refreshCartCount();
      showToast('Added to cart!');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 400) {
        showToast('This size is out of stock', true);
      } else {
        showToast('Failed to add to cart', true);
      }
    } finally {
      setLoadingCart(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setLoadingWishlist(true);
    try {
      if (inWishlist) {
        await removeFromWishlist(wishlistItemId);
        setInWishlist(false);
        setWishlistItemId(null);
      } else {
        const res = await addToWishlist(product.id);
        setInWishlist(true);
        setWishlistItemId(res.item.id);
      }
    } catch { /* silent */ }
    finally { setLoadingWishlist(false); }
  };

  const addToCartButtonLabel = () => {
    if (loadingCart)    return 'Adding...';
    if (!selectedSize)  return 'Select a Size';
    if (selectedVariant?.status === 'out_of_stock') return 'Out of Stock';
    return 'Add to Cart';
  };

  // ---------------------------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------------------------
  if (loadingProduct) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="state-center" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="state-center" style={{ minHeight: '60vh' }}>
          <p className="error-text">{error || 'Product not found.'}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to products
          </button>
        </div>
      </div>
    );
  }

  const userCountryName = isAuthenticated && user?.has_country ? user.country : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page-wrapper">
      <Header />

      <div className="pdp-container">

        {/* ============ LEFT: Gallery ============ */}
        <div className="pdp-gallery">
          <div className="pdp-main-image-wrapper">
            {selectedImage ? (
              <img className="pdp-main-image" src={selectedImage} alt={product.name} />
            ) : (
              <div className="card-image-placeholder">No Image</div>
            )}

            {/* Wishlist heart */}
            <button
              className={`pdp-wishlist-btn${inWishlist ? ' pdp-wishlist-btn--active' : ''}`}
              onClick={handleWishlistToggle}
              disabled={loadingWishlist}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              {inWishlist ? '♥' : '♡'}
            </button>
          </div>

          {product.images.length > 1 && (
            <div className="pdp-thumbnail-strip">
              {product.images.map(img => (
                <div
                  key={img.id}
                  className={`pdp-thumbnail${selectedImage === img.image_url ? ' pdp-thumbnail--active' : ''}`}
                  onClick={() => setSelectedImage(img.image_url)}
                >
                  <img src={img.image_url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ RIGHT: Info Panel ============ */}
        <div className="pdp-info-panel">

          {/* Breadcrumb */}
          <nav className="pdp-breadcrumb">
            <span className="pdp-breadcrumb-link" onClick={() => navigate(`/?category=${product.category.slug}`)}>
              {product.category.name}
            </span>
            <span className="pdp-breadcrumb-sep"> › </span>
            <span className="pdp-breadcrumb-link" onClick={() => navigate(`/?category=${product.category.slug}&subcategory=${product.subcategory.slug}`)}>
              {product.subcategory.name}
            </span>
            <span className="pdp-breadcrumb-sep"> › </span>
            <span className="pdp-breadcrumb-current">{product.name}</span>
          </nav>

          <h1 className="pdp-name">{product.name}</h1>
          <p className="pdp-price">PKR {Number(product.base_price).toLocaleString()}</p>

          <div className="pdp-divider" />

          {/* Delivery */}
          <div className="pdp-section">
            <p className="pdp-section-label">Delivery</p>

            {userCountryName && !showCountrySelector ? (
              <p style={{ fontSize: '13px', color: '#333', marginBottom: '8px' }}>
                Delivering to <strong>{userCountryName}</strong>{' '}
                <button
                  style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setShowCountrySelector(true)}
                >
                  Change country
                </button>
              </p>
            ) : (
              <select
                className="filter-select pdp-country-select"
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            )}

            <div className="pdp-delivery-info">
              {loadingDelivery && <span className="pdp-delivery-loading">Checking delivery...</span>}
              {!loadingDelivery && delivery && (
                <span className="pdp-delivery-text">
                  Estimated {delivery.estimated_days_min}–{delivery.estimated_days_max} days
                  &nbsp;|&nbsp;PKR {Number(delivery.flat_fee).toLocaleString()}
                  &nbsp;|&nbsp;Arrives by <strong>{delivery.estimated_arrival_date}</strong>
                </span>
              )}
              {!loadingDelivery && !delivery && (
                <span className="pdp-delivery-unavailable">Delivery info unavailable</span>
              )}
            </div>
          </div>

          <div className="pdp-divider" />

          {/* Size selector */}
          <div className="pdp-section">
            <p className="pdp-section-label">Select Size</p>
            <div className="pdp-size-grid">
              {ALL_SIZES.map(size => {
                const variant  = variantMap[size];
                if (!variant) {
                  return <button key={size} className="size-btn size-btn--unavailable" disabled>{size}</button>;
                }
                const isSelected = selectedSize === size;
                const { status } = variant;
                let cls = 'size-btn';
                if (status === 'out_of_stock') cls += ' size-btn--oos';
                else if (status === 'low_stock') cls += isSelected ? ' size-btn--low-selected' : ' size-btn--low';
                else cls += isSelected ? ' size-btn--selected' : '';

                return (
                  <button
                    key={size}
                    className={cls}
                    disabled={status === 'out_of_stock'}
                    onClick={() => handleSizeClick(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {selectedVariant?.status === 'low_stock' && (
              <p className="pdp-low-stock-text">Only {selectedVariant.stock_quantity} left in this size</p>
            )}
          </div>

          {/* Add to Cart */}
          <button
            className={`btn-primary pdp-add-to-cart${!canAddToCart || loadingCart ? ' pdp-add-to-cart--disabled' : ''}`}
            disabled={!canAddToCart || loadingCart}
            onClick={handleAddToCart}
          >
            {addToCartButtonLabel()}
          </button>

          {/* Total */}
          {selectedSize && delivery && <div className="pdp-divider" />}
          {selectedSize && delivery && (
            <div className="pdp-total">
              <p className="pdp-total-amount">Total: PKR {totalPrice.toLocaleString()}</p>
              <p className="pdp-total-subtext">
                Includes PKR {Number(delivery.flat_fee).toLocaleString()} delivery to {delivery.country_name}
              </p>
            </div>
          )}

          <div className="pdp-divider" />

          {/* Description */}
          <div className="pdp-section">
            <p className="pdp-section-label">About this piece</p>
            <p className="pdp-description">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      {(loadingSimilar || similarProducts.length > 0) && (
        <div className="pdp-similar-section">
          <h2 className="pdp-similar-title">You might also like</h2>
          {loadingSimilar ? (
            <div className="state-center" style={{ minHeight: '160px' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div className="pdp-similar-strip">
              {similarProducts.map(p => (
                <div
                  key={p.id}
                  className={`pdp-similar-card${!p.has_any_stock ? ' product-card--oos' : ''}`}
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div className="pdp-similar-image-wrapper">
                    {p.thumbnail
                      ? <img className="pdp-similar-image" src={p.thumbnail} alt={p.name} />
                      : <div className="card-image-placeholder">No Image</div>
                    }
                    {!p.has_any_stock && <span className="oos-badge">Out of Stock</span>}
                  </div>
                  <div className="card-body">
                    <p className="card-name">{p.name}</p>
                    <p className="card-price">PKR {Number(p.base_price).toLocaleString()}</p>
                    <div className="card-tags">
                      <span className="tag">{p.category}</span>
                      <span className="tag">{p.subcategory}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <div className={`pdp-toast${toast.visible ? ' pdp-toast--visible' : ''}${toast.isError ? ' pdp-toast--error' : ''}`}>
        {toast.message}
      </div>
    </div>
  );
}