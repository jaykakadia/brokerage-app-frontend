import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../services/api';

export const formatListingPrice = (raw) => {
  if (raw == null || raw === '') return 'Price on request';
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return '₹ ' + raw;

  if (num >= 10000000) {
    const cr = num / 10000000;
    const crStr = cr.toFixed(2).replace(/\.?0+$/, '');
    return `₹ ${crStr} Cr`;
  }
  if (num >= 100000) {
    const lac = num / 100000;
    const lacStr = Number.isInteger(lac) ? String(lac) : lac.toFixed(2).replace(/\.?0+$/, '');
    return `₹ ${lacStr} Lac`;
  }
  return '₹ ' + new Intl.NumberFormat('en-IN').format(Math.round(num));
};

export const getFirstImageUrl = (listing) => {
  if (listing?.images && listing.images.length > 0) {
    return getImageUrl(listing.images[0].file_path);
  }
  return '/placeholder-property.svg';
};

export default function HomePage({ activeCity, onCitySelect, onNavigate }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & filter state
  const [heroCity, setHeroCity] = useState(activeCity || '');
  const [heroType, setHeroType] = useState('');
  const [heroKeyword, setHeroKeyword] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCities, setSelectedCities] = useState([]);
  const [viewType, setViewType] = useState('grid'); // 'grid' | 'list'

  const citiesList = [
    'Palwal', 'Faridabad', 'Gurugram', 'Sonipat', 'Panipat',
    'Hodal', 'Hathin', 'Delhi', 'Noida'
  ];

  // Sync heroCity with activeCity from Header
  useEffect(() => {
    if (activeCity) {
      setHeroCity(activeCity);
      setSelectedCities([activeCity]);
    } else {
      setSelectedCities([]);
    }
  }, [activeCity]);

  // Fetch approved listings from backend
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/listings', {
        params: { status: 'approved' }
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setListings(res.data.data);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Unable to load listings right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleCityCheckbox = (city) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter((c) => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const handleClearFilters = () => {
    setSelectedCities([]);
    setBudgetMin('');
    setBudgetMax('');
    setHeroCity('');
    setHeroType('');
    setHeroKeyword('');
    setActiveCategoryTab('all');
    if (onCitySelect) onCitySelect('');
  };

  // Filter listings
  const filteredListings = listings.filter((item) => {
    const loc = (item.location || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const price = Number(item.price) || 0;

    // City filter: either from selected checkboxes or heroCity
    if (selectedCities.length > 0) {
      const match = selectedCities.some((c) => loc.includes(c.toLowerCase()));
      if (!match) return false;
    } else if (heroCity) {
      if (!loc.includes(heroCity.toLowerCase())) return false;
    }

    // Keyword
    if (heroKeyword.trim()) {
      const kw = heroKeyword.toLowerCase().trim();
      if (!title.includes(kw) && !desc.includes(kw) && !loc.includes(kw)) {
        return false;
      }
    }

    // Property Type / Category
    if (heroType) {
      const formType = item.form_data?.propType?.toLowerCase() || '';
      const text = (title + ' ' + desc).toLowerCase();
      if (!formType.includes(heroType.toLowerCase()) && !text.includes(heroType.toLowerCase())) {
        return false;
      }
    }

    // Category Tabs: all, sale, rent, verified
    if (activeCategoryTab === 'sale') {
      const isRent = desc.includes('[listing_type: rent]') || (item.form_data?.listingType === 'rent');
      if (isRent) return false;
    } else if (activeCategoryTab === 'rent') {
      const isRent = desc.includes('[listing_type: rent]') || (item.form_data?.listingType === 'rent');
      if (!isRent) return false;
    } else if (activeCategoryTab === 'verified') {
      if (item.verified !== 1) return false;
    }

    // Budget
    const min = parseFloat(budgetMin) || 0;
    const max = parseFloat(budgetMax) || Infinity;
    if (price < min || price > max) return false;

    return true;
  });

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="container hero-content">
          <h1>Find Properties &amp; Related Businesses in NCR Haryana</h1>
          <p className="hero-subtext">
            Palwal &middot; Faridabad &middot; Gurugram &middot; Sonipat &middot; Panipat &middot; Hodal &middot; Hathin &middot; Delhi
          </p>

          <div className="search-box">
            <div className="search-form">
              <select
                className="search-select"
                id="heroCity"
                value={heroCity}
                onChange={(e) => {
                  setHeroCity(e.target.value);
                  if (onCitySelect) onCitySelect(e.target.value);
                }}
              >
                <option value="">All Cities</option>
                {citiesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="search-select"
                id="heroType"
                value={heroType}
                onChange={(e) => setHeroType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="flat">Flat / Builder Floor</option>
                <option value="house">House / Villa</option>
                <option value="plot">Plot / Land</option>
                <option value="agriculture">Agriculture Land</option>
                <option value="commercial">Commercial - Shop / Office</option>
                <option value="pg">PG / Guest House</option>
              </select>

              <input
                type="text"
                className="search-input"
                placeholder="Search locality, title or keyword..."
                value={heroKeyword}
                onChange={(e) => setHeroKeyword(e.target.value)}
              />

              <button
                type="button"
                className="btn-search"
                onClick={() => {
                  const el = document.getElementById('listings');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <i className="fas fa-search"></i> Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <div className="metrics-bar">
        <div className="container metrics-inner">
          <div className="metric-item">
            <span className="metric-icon"><i className="fas fa-list-ul"></i></span>
            <div>
              <span className="metric-num">{listings.length}</span>
              <span className="metric-plus">+</span>
              <div className="metric-label">Active Listings</div>
            </div>
          </div>
          <div className="metric-item">
            <span className="metric-icon"><i className="fas fa-check-circle"></i></span>
            <div>
              <span className="metric-num">{listings.filter((l) => l.verified === 1).length}</span>
              <div className="metric-label">Verified Listings</div>
            </div>
          </div>
          <div className="metric-item">
            <span className="metric-icon"><i className="fas fa-map-marker-alt"></i></span>
            <div>
              <span className="metric-num">9</span>
              <div className="metric-label">Cities Covered</div>
            </div>
          </div>
          <div className="metric-item">
            <span className="metric-icon"><i className="fas fa-bolt"></i></span>
            <div>
              <span className="metric-num">100%</span>
              <div className="metric-label">Direct Connect</div>
            </div>
          </div>
        </div>
      </div>

      {/* City Quick Pills */}
      <div className="container" style={{ margin: '24px auto', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          className="city-pill"
          style={{ background: (!selectedCities.length && !heroCity) ? '#0c6253' : '#fff', color: (!selectedCities.length && !heroCity) ? '#fff' : '#1f2937' }}
          onClick={() => handleClearFilters()}
        >
          All Cities
        </button>
        {citiesList.map((c) => {
          const isActive = selectedCities.includes(c) || heroCity === c;
          return (
            <button
              key={c}
              type="button"
              className="city-pill"
              style={{ background: isActive ? '#0c6253' : '#fff', color: isActive ? '#fff' : '#1f2937' }}
              onClick={() => {
                if (isActive) {
                  setSelectedCities(selectedCities.filter((item) => item !== c));
                  if (heroCity === c) setHeroCity('');
                } else {
                  setSelectedCities([c]);
                  setHeroCity(c);
                }
              }}
            >
              <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: isActive ? '#fff' : '#0c6253' }}></i>
              {c}
            </button>
          );
        })}
      </div>

      {/* Listings Section */}
      <section className="listings-section" id="listings">
        <div className="container listings-layout">
          {/* Sidebar Filter */}
          <aside className="filter-sidebar" id="filterSidebar">
            <div className="filter-header">
              <h3><i className="fas fa-sliders-h"></i> Filter Listings</h3>
              <button type="button" className="btn-clear-filter" onClick={handleClearFilters}>
                Clear All
              </button>
            </div>

            <div className="filter-group" id="filter-cities">
              <h4>Filter by City</h4>
              {citiesList.map((city) => (
                <label key={city} className="filter-check">
                  <input
                    type="checkbox"
                    checked={selectedCities.includes(city) || heroCity === city}
                    onChange={() => handleCityCheckbox(city)}
                  />
                  {' '}{city}
                </label>
              ))}
            </div>

            <div className="filter-group">
              <h4>Budget</h4>
              <div className="budget-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              </div>
              <div className="budget-presets">
                <button type="button" className="preset-btn" onClick={() => { setBudgetMin('0'); setBudgetMax('2000000'); }}>
                  Under 20 Lakh
                </button>
                <button type="button" className="preset-btn" onClick={() => { setBudgetMin('2000000'); setBudgetMax('5000000'); }}>
                  20 to 50 Lakh
                </button>
                <button type="button" className="preset-btn" onClick={() => { setBudgetMin('5000000'); setBudgetMax('10000000'); }}>
                  50L to 1 Cr
                </button>
                <button type="button" className="preset-btn" onClick={() => { setBudgetMin('10000000'); setBudgetMax('20000000'); }}>
                  1 to 2 Cr
                </button>
                <button type="button" className="preset-btn" onClick={() => { setBudgetMin('20000000'); setBudgetMax(''); }}>
                  Above 2 Cr
                </button>
              </div>
            </div>
          </aside>

          {/* Main Listings Grid */}
          <div className="listings-main">
            <div className="listings-controls">
              <div className="listing-count">
                <strong>{filteredListings.length}</strong> listings found
              </div>
              <div className="listings-actions">
                <div className="category-tabs">
                  <button
                    type="button"
                    className={`cat-tab ${activeCategoryTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`cat-tab ${activeCategoryTab === 'sale' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('sale')}
                  >
                    For Sale
                  </button>
                  <button
                    type="button"
                    className={`cat-tab ${activeCategoryTab === 'rent' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('rent')}
                  >
                    For Rent
                  </button>
                  <button
                    type="button"
                    className={`cat-tab ${activeCategoryTab === 'verified' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('verified')}
                  >
                    Verified Only
                  </button>
                </div>

                <div className="view-toggles">
                  <button
                    type="button"
                    className={`view-btn ${viewType === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewType('grid')}
                    title="Grid View"
                  >
                    <i className="fas fa-th"></i>
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${viewType === 'list' ? 'active' : ''}`}
                    onClick={() => setViewType('list')}
                    title="List View"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '12px' }}></i>
                <div>Loading verified listings...</div>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
                <i className="fas fa-exclamation-circle fa-2x" style={{ marginBottom: '8px' }}></i>
                <div>{error}</div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: '14px' }}
                  onClick={fetchListings}
                >
                  Retry
                </button>
              </div>
            ) : filteredListings.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px',
                  color: '#6b7280',
                  fontSize: '16px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}
              >
                <i className="fas fa-home" style={{ fontSize: '36px', color: '#94a3b8', marginBottom: '14px', display: 'block' }}></i>
                No listings matching your selected filters. Try broadening your search or{' '}
                <a
                  href="#post"
                  onClick={(e) => { e.preventDefault(); onNavigate('post-listing'); }}
                  style={{ color: '#0c6253', fontWeight: 'bold' }}
                >
                  post a new listing!
                </a>
              </div>
            ) : (
              <div
                className="listings-grid"
                id="listingsGrid"
                style={{ gridTemplateColumns: viewType === 'list' ? '1fr' : '' }}
              >
                {filteredListings.map((listing) => {
                  const imgSrc = getFirstImageUrl(listing);
                  const priceStr = formatListingPrice(listing.price);
                  const propType = listing.form_data?.propType || 'Property';

                  return (
                    <div
                      key={listing.id}
                      className="listing-card"
                      style={viewType === 'list' ? { display: 'flex', flexDirection: 'row' } : {}}
                    >
                      <div
                        className="card-img-wrap"
                        style={viewType === 'list' ? { width: '280px', flexShrink: 0 } : {}}
                      >
                        <img
                          src={imgSrc}
                          alt={listing.title}
                          className="card-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/placeholder-property.svg';
                          }}
                        />
                        {listing.verified === 1 && (
                          <span className="badge-verified">
                            <i className="fas fa-check-circle"></i> Verified
                          </span>
                        )}
                        <span
                          className="badge-featured"
                          style={{
                            top: '12px',
                            left: '12px',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            textTransform: 'capitalize'
                          }}
                        >
                          {propType}
                        </span>
                      </div>

                      <div className="card-body" style={{ flex: 1 }}>
                        <div className="card-price">{priceStr}</div>
                        <h3 className="card-title">{listing.title}</h3>
                        <div className="card-location">
                          <i className="fas fa-map-marker-alt"></i> {listing.location}
                        </div>
                        <div className="card-features" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                          Owner: <strong>{listing.owner_name}</strong> ({listing.owner_role || 'Owner'})
                        </div>
                        <div className="card-footer card-footer-actions">
                          <button
                            type="button"
                            className="btn-view"
                            onClick={() => onNavigate('listing-detail', listing.id)}
                            style={{ flex: 1, textAlign: 'center' }}
                          >
                            <i className="fas fa-info-circle"></i> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
