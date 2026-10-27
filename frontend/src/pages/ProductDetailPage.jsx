import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductDetail, getSimilarProducts, getDelivery } from '../api';
import Header from '../components/Header';


const COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'AE', name: 'UAE' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct]               = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [selectedImage, setSelectedImage]   = useState(null);
  const [selectedSize, setSelectedSize]     = useState(null);
  const [delivery, setDelivery]             = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('PK');
  const [toast, setToast]                   = useState(false);
  const [error, setError]                   = useState(null);

  // ---------------------------------------------------------------------------
  // Fetch product + similar + delivery on id change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Reset per-product state when navigating between products
    setProduct(null);
    setSelectedImage(null);
    setSelectedSize(null);
    setDelivery(null);
    setError(null);
    setLoadingProduct(true);
    setLoadingSimilar(true);
    setLoadingDelivery(true);

    // Scroll to top when navigating to a new product
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchAll = async () => {
      try {
        // Product detail first — we need it before we can render anything
        const prod = await getProductDetail(id);
        setProduct(prod);
        // Set first image as active
        if (prod.images && prod.images.length > 0) {
          setSelectedImage(prod.images[0].image_url);
        }
        setLoadingProduct(false);

        // Similar products and delivery can run in parallel
        const [similar, del] = await Promise.allSettled([
          getSimilarProducts(id),
          getDelivery('PK'),
        ]);

        if (similar.status === 'fulfilled') setSimilarProducts(similar.value);
        setLoadingSimilar(false);

        if (del.status === 'fulfilled') setDelivery(del.value);
        setLoadingDelivery(false);

      } catch {
        setError('Something went wrong. Please try again.');
        setLoadingProduct(false);
        setLoadingSimilar(false);
        setLoadingDelivery(false);
      }
    };

    fetchAll();
  }, [id]);

  // ---------------------------------------------------------------------------
  // Refetch delivery when country changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Skip on initial mount — handled by the id effect above
    if (!product) return;

    setLoadingDelivery(true);
    setDelivery(null);
    getDelivery(selectedCountry)
      .then(setDelivery)
      .catch(() => setDelivery(null))
      .finally(() => setLoadingDelivery(false));
  }, [selectedCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Build a map of size → variant for quick lookup in the size selector
  const variantMap = product
    ? Object.fromEntries(product.variants.map((v) => [v.size, v]))
    : {};

  const selectedVariant = selectedSize ? variantMap[selectedSize] : null;

  const canAddToCart =
    selectedVariant &&
    (selectedVariant.status === 'in_stock' || selectedVariant.status === 'low_stock');

  const addToCartButtonLabel = () => {
    if (!selectedSize) return 'Select a Size';
    if (selectedVariant?.status === 'out_of_stock') return 'Out of Stock';
    return 'Add to Cart';
  };

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const handleSizeClick = (size) => {
    const variant = variantMap[size];
    if (!variant || variant.status === 'out_of_stock') return;
    setSelectedSize(size);
  };

  const totalPrice =
    product && delivery
      ? Number(product.base_price) + Number(delivery.flat_fee)
      : null;

  // ---------------------------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------------------------
  if (loadingProduct) {
    return (
      <div className="state-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="state-center" style={{ minHeight: '60vh' }}>
        <p className="error-text">{error || 'Product not found.'}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          Back to products
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page-wrapper">
      {/* ---- Minimal header ---- */}
     <Header cartCount={0} />
        {/* <a href="/" className="site-logo">CarIQ</a> */}
    

      {/* ---- PDP body ---- */}
      <div className="pdp-container">

        {/* ============================================================
            LEFT — Image Gallery
            ============================================================ */}
        <div className="pdp-gallery">
          {/* Main image */}
          <div className="pdp-main-image-wrapper">
            {selectedImage ? (
              <img
                className="pdp-main-image"
                src={selectedImage}
                alt={product.name}
              />
            ) : (
              <div className="card-image-placeholder">No Image</div>
            )}
          </div>

          {/* Thumbnail strip — only if more than 1 image */}
          {product.images.length > 1 && (
            <div className="pdp-thumbnail-strip">
              {product.images.map((img) => (
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

        {/* ============================================================
            RIGHT — Product Info Panel
            ============================================================ */}
        <div className="pdp-info-panel">

          {/* 1. Breadcrumb */}
          <nav className="pdp-breadcrumb">
            <span
              className="pdp-breadcrumb-link"
              onClick={() => navigate(`/?category=${product.category.slug}`)}
            >
              {product.category.name}
            </span>
            <span className="pdp-breadcrumb-sep"> › </span>
            <span
              className="pdp-breadcrumb-link"
              onClick={() =>
                navigate(`/?category=${product.category.slug}&subcategory=${product.subcategory.slug}`)
              }
            >
              {product.subcategory.name}
            </span>
            <span className="pdp-breadcrumb-sep"> › </span>
            <span className="pdp-breadcrumb-current">{product.name}</span>
          </nav>

          {/* 2. Product name */}
          <h1 className="pdp-name">{product.name}</h1>

          {/* 3. Price */}
          <p className="pdp-price">
            PKR {Number(product.base_price).toLocaleString()}
          </p>

          {/* ---- Divider ---- */}
          <div className="pdp-divider" />

          {/* 4. Delivery */}
          <div className="pdp-section">
            <p className="pdp-section-label">Delivery</p>
            <select
              className="filter-select pdp-country-select"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>

            <div className="pdp-delivery-info">
              {loadingDelivery && (
                <span className="pdp-delivery-loading">Checking delivery...</span>
              )}
              {!loadingDelivery && delivery && (
                <span className="pdp-delivery-text">
                  Estimated {delivery.estimated_days_min}–{delivery.estimated_days_max} days
                  &nbsp;|&nbsp;
                  PKR {Number(delivery.flat_fee).toLocaleString()}
                  &nbsp;|&nbsp;
                  Arrives by <strong>{delivery.estimated_arrival_date}</strong>
                </span>
              )}
              {!loadingDelivery && !delivery && (
                <span className="pdp-delivery-unavailable">
                  Delivery info unavailable
                </span>
              )}
            </div>
          </div>

          {/* ---- Divider ---- */}
          <div className="pdp-divider" />

          {/* 5. Size selector */}
          <div className="pdp-section">
            <p className="pdp-section-label">Select Size</p>
            <div className="pdp-size-grid">
              {ALL_SIZES.map((size) => {
                const variant = variantMap[size];

                // No variant for this size at all
                if (!variant) {
                  return (
                    <button key={size} className="size-btn size-btn--unavailable" disabled>
                      {size}
                    </button>
                  );
                }

                const isSelected = selectedSize === size;
                const { status } = variant;

                let btnClass = 'size-btn';
                if (status === 'out_of_stock') {
                  btnClass += ' size-btn--oos';
                } else if (status === 'low_stock') {
                  btnClass += isSelected
                    ? ' size-btn--low-selected'
                    : ' size-btn--low';
                } else {
                  // in_stock
                  btnClass += isSelected ? ' size-btn--selected' : '';
                }

                return (
                  <button
                    key={size}
                    className={btnClass}
                    disabled={status === 'out_of_stock'}
                    onClick={() => handleSizeClick(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Low stock warning — shown when a low-stock size is selected */}
            {selectedVariant?.status === 'low_stock' && (
              <p className="pdp-low-stock-text">
                Only {selectedVariant.stock_quantity} left in this size
              </p>
            )}
          </div>

          {/* 6. Add to Cart */}
          <button
            className={`btn-primary pdp-add-to-cart${!canAddToCart ? ' pdp-add-to-cart--disabled' : ''}`}
            disabled={!canAddToCart}
            onClick={handleAddToCart}
          >
            {addToCartButtonLabel()}
          </button>

          {/* 7. Total cost — only when size selected AND delivery loaded */}
          {selectedSize && delivery && (
            <div className="pdp-divider" />
          )}
          {selectedSize && delivery && (
            <div className="pdp-total">
              <p className="pdp-total-amount">
                Total: PKR {totalPrice.toLocaleString()}
              </p>
              <p className="pdp-total-subtext">
                Includes PKR {Number(delivery.flat_fee).toLocaleString()} delivery to {delivery.country_name}
              </p>
            </div>
          )}

          {/* ---- Divider ---- */}
          <div className="pdp-divider" />

          {/* 8. Description */}
          <div className="pdp-section">
            <p className="pdp-section-label">About this piece</p>
            <p className="pdp-description">{product.description}</p>
          </div>

        </div>
      </div>

      {/* ============================================================
          SIMILAR PRODUCTS
          ============================================================ */}
      {(loadingSimilar || similarProducts.length > 0) && (
        <div className="pdp-similar-section">
          <h2 className="pdp-similar-title">You might also like</h2>

          {loadingSimilar ? (
            <div className="state-center" style={{ minHeight: '160px' }}>
              <div className="spinner" />
            </div>
          ) : (
            <div className="pdp-similar-strip">
              {similarProducts.map((p) => (
                <div
                  key={p.id}
                  className={`pdp-similar-card${!p.has_any_stock ? ' product-card--oos' : ''}`}
                  onClick={() => navigate(`/products/${p.id}`)}
                >
                  <div className="pdp-similar-image-wrapper">
                    {p.thumbnail ? (
                      <img
                        className="pdp-similar-image"
                        src={p.thumbnail}
                        alt={p.name}
                      />
                    ) : (
                      <div className="card-image-placeholder">No Image</div>
                    )}
                    {!p.has_any_stock && (
                      <span className="oos-badge">Out of Stock</span>
                    )}
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TOAST
          ============================================================ */}
      <div className={`pdp-toast${toast ? ' pdp-toast--visible' : ''}`}>
        Added to cart!
      </div>
    </div>
  );
}