import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategories, getProducts } from '../api';

const PAGE_SIZE = 12;

export default function ProductListPage() {
  // --- URL state ---
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- Filter state — initialised from URL on mount ---
  const [searchInput, setSearchInput]       = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('subcategory') || '');
  const [currentPage, setCurrentPage]       = useState(Number(searchParams.get('page')) || 1);

  // --- Data state ---
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  // --- Debounce ref for search ---
  const debounceTimer = useRef(null);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Subcategories available for the currently selected category
  const subcategoryOptions = selectedCategory
    ? (categories.find((c) => c.slug === selectedCategory)?.subcategories ?? [])
    : [];

  // ---------------------------------------------------------------------------
  // Sync URL params whenever filters or page change
  // ---------------------------------------------------------------------------

  const syncURL = useCallback(
    (search, category, subcategory, page) => {
      const params = {};
      if (search)      params.search      = search;
      if (category)    params.category    = category;
      if (subcategory) params.subcategory = subcategory;
      if (page > 1)    params.page        = page;
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  // ---------------------------------------------------------------------------
  // Fetch products
  // ---------------------------------------------------------------------------

  const fetchProducts = useCallback(async (search, category, subcategory, page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page };
      if (search)      params.search      = search;
      if (category)    params.category    = category;
      if (subcategory) params.subcategory = subcategory;

      const data = await getProducts(params);
      setProducts(data.results);
      setTotalCount(data.count);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch whenever filters or page change
  useEffect(() => {
    const activeSearch = searchParams.get('search') || '';
    fetchProducts(activeSearch, selectedCategory, selectedSubcategory, currentPage);
  }, [selectedCategory, selectedSubcategory, currentPage, searchParams, fetchProducts]);

  // ---------------------------------------------------------------------------
  // Fetch categories once on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {/* categories failing silently is acceptable */});
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);

    // Debounce: wait 500ms after the user stops typing before fetching
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setCurrentPage(1);
      syncURL(value, selectedCategory, selectedSubcategory, 1);
    }, 500);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Immediate search on Enter — cancel any pending debounce
      clearTimeout(debounceTimer.current);
      setCurrentPage(1);
      syncURL(searchInput, selectedCategory, selectedSubcategory, 1);
    }
  };

  const handleCategoryChange = (e) => {
    const slug = e.target.value;
    setSelectedCategory(slug);
    setSelectedSubcategory(''); // reset subcategory when category changes
    setSearchInput('');
    setCurrentPage(1);
    syncURL('', slug, '', 1);
  };

  const handleSubcategoryChange = (e) => {
    const slug = e.target.value;
    setSelectedSubcategory(slug);
    setSearchInput('');
    setCurrentPage(1);
    syncURL('', selectedCategory, slug, 1);
  };

  const handlePrev = () => {
    const newPage = currentPage - 1;
    setCurrentPage(newPage);
    syncURL(searchInput, selectedCategory, selectedSubcategory, newPage);
  };

  const handleNext = () => {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    syncURL(searchInput, selectedCategory, selectedSubcategory, newPage);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-wrapper">
      {/* ---- Header ---- */}
      <header className="site-header">
        <a href="/" className="site-logo">LAAM</a>
        <div className="search-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </header>

      {/* ---- Filter Row ---- */}
      <div className="filter-row">
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedSubcategory}
          onChange={handleSubcategoryChange}
          disabled={!selectedCategory}
        >
          <option value="">All Subcategories</option>
          {subcategoryOptions.map((sub) => (
            <option key={sub.id} value={sub.slug}>{sub.name}</option>
          ))}
        </select>
      </div>

      {/* ---- Main Content ---- */}
      <main className="main-content">

        {/* Loading */}
        {loading && (
          <div className="state-center">
            <div className="spinner" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="state-center">
            <p className="error-text">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="state-center">
            <p className="empty-text">No products found</p>
            <button className="btn-primary" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && products.length > 0 && (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`product-card${!product.has_any_stock ? ' product-card--oos' : ''}`}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  {/* Image */}
                  <div className="card-image-wrapper">
                    {product.thumbnail ? (
                      <img
                        className="card-image"
                        src={product.thumbnail}
                        alt={product.name}
                      />
                    ) : (
                      <div className="card-image-placeholder">No Image</div>
                    )}
                    {!product.has_any_stock && (
                      <span className="oos-badge">Out of Stock</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="card-body">
                    <p className="card-name">{product.name}</p>
                    <p className="card-price">
                      PKR {Number(product.base_price).toLocaleString()}
                    </p>
                    <div className="card-tags">
                      <span className="tag">{product.category}</span>
                      <span className="tag">{product.subcategory}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                className="btn-primary"
                onClick={handlePrev}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}