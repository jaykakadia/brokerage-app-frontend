import { useEffect, useMemo, useRef, useState } from 'react';
import api, { getApiErrorMessage, getListingStats, getWishlist, toggleWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cardImageBackdrop, getFirstImageUrl } from '../utils/formatters';
import { cityNameVariants, getBusinessCategories, getListingCity, isBusinessListing, isNewListing } from '../utils/listingKind';
import { POPULAR_BROWSE_CITIES } from '../config/cities';
import { getListingUrl } from '../utils/url';
import type { AuthModalOptions } from './ListingDetailPage';
import type { Listing, ListingStatsResponse, NavigateFunction } from '../types';

export interface BusinessDirectoryPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: (options?: AuthModalOptions) => void;
}

interface BusinessInfo {
  categories: string[];
  city: string;
}

function businessInfo(listing: Listing): BusinessInfo {
  const data = listing.form_data || {};
  return {
    categories: getBusinessCategories(listing),
    city: (typeof data.city === 'string' && data.city) || listing.location.split(',').pop()?.trim() || ''
  };
}

const BUSINESSES_PER_PAGE = 8; // 2 rows of 4 cards on desktop

function getPaginationItems(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function BusinessDirectoryPage({ onNavigate, onOpenAuth }: BusinessDirectoryPageProps) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<ListingStatsResponse | null>(null);
  const [showCitiesPanel, setShowCitiesPanel] = useState(false);
  const citiesPanelRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    getWishlist(true)
      .then((res) => {
        if (Array.isArray(res.data?.data)) setWishlistIds(new Set(res.data.data));
      })
      .catch(() => {});
  }, [user]);

  // Click outside listener for cities covered dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (citiesPanelRef.current && !citiesPanelRef.current.contains(target)) {
        setShowCitiesPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSaved = async (listingId: number): Promise<void> => {
    if (!user) {
      onOpenAuth?.({
        title: 'Sign In to Save Businesses',
        subtitle: 'Please sign in or create an account to save businesses to your wishlist.',
        icon: 'fa-heart',
        onSuccess: () => { void toggleSaved(listingId); }
      });
      return;
    }
    try {
      const res = await toggleWishlist(listingId);
      const added = res.data?.action === 'added';
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (added) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    } catch {
      // leave the heart as it was
    }
  };
  // Read initial filter values from URL query parameters (if present) to support shared links
  const initialUrlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [businesses, setBusinesses] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => initialUrlParams.get('q') || initialUrlParams.get('search') || '');
  const [category, setCategory] = useState(() => initialUrlParams.get('category') || '');
  const [city, setCity] = useState(() => initialUrlParams.get('city') || '');
  const [newOnly, setNewOnly] = useState(() => initialUrlParams.get('new') === '1' || initialUrlParams.get('new') === 'true');
  const [copiedFilters, setCopiedFilters] = useState(false);

  // Keep URL query params synchronized with active filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (category) params.set('category', category);
    if (city) params.set('city', city);
    if (newOnly) params.set('new', '1');

    const searchStr = params.toString();
    const newPathAndSearch = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
    const currentPathAndSearch = `${window.location.pathname}${window.location.search}`;

    if (newPathAndSearch !== currentPathAndSearch) {
      window.history.replaceState(null, '', newPathAndSearch);
    }
  }, [search, category, city, newOnly]);

  // Support browser Back/Forward navigation with filters
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setSearch(sp.get('q') || sp.get('search') || '');
      setCategory(sp.get('category') || '');
      setCity(sp.get('city') || '');
      setNewOnly(sp.get('new') === '1' || sp.get('new') === 'true');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ status: string; data: Listing[] }>('/api/v1/listings', { params: { status: 'approved' } });
        setBusinesses((res.data?.data || []).filter(isBusinessListing));
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Unable to load businesses right now. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
    getListingStats()
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {});
  }, []);

  // Compute business counts per city from approved businesses only
  const cityCounts = useMemo(() => {
    const byKey = new Map<string, { name: string; count: number }>();
    businesses.forEach((item) => {
      const info = businessInfo(item);
      const name = info.city || getListingCity(item);
      if (!name) return;
      const key = name.toLowerCase();
      const entry = byKey.get(key);
      if (entry) entry.count += 1;
      else byKey.set(key, { name, count: 1 });
    });
    return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
  }, [businesses]);


  const activeBusinessesCount = businesses.length;
  const activeUsersCount = stats?.registered_users ? `${stats.registered_users}+` : '73+';
  const citiesCoveredCount = cityCounts.length;
  const newBusinessesCount = useMemo(() => businesses.filter(isNewListing).length, [businesses]);

  const categoryOptions = useMemo(
    () => [...new Set(businesses.flatMap((b) => businessInfo(b).categories))].sort(),
    [businesses]
  );
  const rawCityOptions = useMemo(
    () => [...new Set(businesses.map((b) => businessInfo(b).city || getListingCity(b)).filter(Boolean))].sort(),
    [businesses]
  );
  const cityOptions = useMemo(() => {
    if (city && !rawCityOptions.includes(city)) {
      return [city, ...rawCityOptions].sort();
    }
    return rawCityOptions;
  }, [city, rawCityOptions]);

  const featuredBusinesses = useMemo(() => businesses.filter((b) => b.is_featured), [businesses]);

  const visible = businesses.filter((b) => {
    const info = businessInfo(b);
    if (newOnly && !isNewListing(b)) return false;
    if (category && !info.categories.includes(category)) return false;
    if (city) {
      const bCity = (info.city || getListingCity(b)).toLowerCase();
      const targetVariants = cityNameVariants(city).map((v) => v.toLowerCase());
      if (!targetVariants.some((v) => bCity === v || bCity.includes(v))) return false;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [b.title, b.location, b.description || '', ...info.categories].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = Boolean(search || category || city || newOnly);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, city, newOnly]);

  const totalPages = Math.max(1, Math.ceil(visible.length / BUSINESSES_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pagedBusinesses = visible.slice((page - 1) * BUSINESSES_PER_PAGE, page * BUSINESSES_PER_PAGE);

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const el = document.getElementById('business-listings-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setCity('');
    setNewOnly(false);
    setCurrentPage(1);
  };

  const handleCitySelect = (selectedCityName: string) => {
    const matched = rawCityOptions.find((c) => c.toLowerCase() === selectedCityName.toLowerCase()) || selectedCityName;
    setCity(matched);
    setCurrentPage(1);
    setShowCitiesPanel(false);
    const el = document.getElementById('business-listings-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Industry standard navigation handler: preserves native browser right-click & middle-click
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, item: Listing): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
      return;
    }
    e.preventDefault();
    onNavigate('listing-detail', item);
  };

  const renderBusinessCard = (b: Listing) => {
    const info = businessInfo(b);
    const bUrl = getListingUrl(b);
    return (
      <div key={b.id} className="listing-card business-dir-card">
        <a
          href={bUrl}
          className="card-stretched-link"
          aria-label={b.title}
          onClick={(e) => handleLinkClick(e, b)}
        />
        <div className="card-img-wrap" style={cardImageBackdrop(getFirstImageUrl(b))}>
          <img
            src={getFirstImageUrl(b)}
            alt={b.title}
            className="card-img"
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-property.svg'; }}
          />
          {b.verified === 1 && (
            <span
              className="badge-verified"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 2,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i className="fas fa-check-circle"></i> Verified
            </span>
          )}
        </div>
        <div className="card-body">
          <h3 className="card-title business-dir-title">
            {b.title}
            {info.categories[0] && <> <span className="title-category">-&nbsp;{info.categories[0]}</span></>}
          </h3>
          <div className="card-location"><i className="fas fa-map-marker-alt"></i> <span>{b.location}</span></div>
          <div className="card-footer card-footer-actions">
            <a
              href={bUrl}
              className="btn-view"
              onClick={(e) => handleLinkClick(e, b)}
            >
              <i className="fas fa-info-circle"></i> Details
            </a>
            <button
              type="button"
              className={`btn-wishlist ${wishlistIds.has(b.id) ? 'active' : ''}`}
              onClick={() => void toggleSaved(b.id)}
            >
              <i className={wishlistIds.has(b.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
              <span>Wishlist</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="page-hero green-hero">
        <div className="container">
          <h1><i className="fas fa-store"></i> Business Directory</h1>
          <p>Find trusted local businesses, services and shops near you</p>

          <div className="business-dir-filters" style={{ margin: '24px auto 24px', maxWidth: '1000px', textAlign: 'left' }}>
            <input
              type="text"
              placeholder="Search business name, category or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => onNavigate('post-listing')}>
              <i className="fas fa-plus"></i> List Your Business
            </button>
          </div>

          {/* Business Directory Metrics Bar (Derived from business listings only) */}
          <div className="metrics-inner">
            <button
              type="button"
              className="metric-item metric-clickable"
              onClick={clearAllFilters}
              title="Show all active businesses"
            >
              <span className="metric-icon"><i className="fas fa-store"></i></span>
              <div>
                <span className="metric-num">{activeBusinessesCount}</span>
                <div className="metric-label">Active Businesses</div>
              </div>
            </button>

            <button
              type="button"
              className="metric-item metric-clickable"
              onClick={() => {
                if (!user && onOpenAuth) {
                  onOpenAuth({
                    title: 'Join TradeCall India',
                    subtitle: 'Create a free account to list your business or connect with local customers.',
                    icon: 'fa-users'
                  });
                } else if (onNavigate) {
                  onNavigate('about');
                }
              }}
              title="Active registered users and business owners"
            >
              <span className="metric-icon"><i className="fas fa-users"></i></span>
              <div>
                <span className="metric-num">{activeUsersCount}</span>
                <div className="metric-label">Active Users</div>
              </div>
            </button>

            <div className="metric-cities-wrap" ref={citiesPanelRef}>
              <button
                type="button"
                className="metric-item metric-clickable"
                onClick={() => setShowCitiesPanel((v) => !v)}
                title="Show cities with active businesses"
                aria-expanded={showCitiesPanel}
              >
                <span className="metric-icon"><i className="fas fa-map-marker-alt"></i></span>
                <div>
                  <span className="metric-num">{citiesCoveredCount}</span>
                  <div className="metric-label">
                    Cities Covered <i className="fas fa-chevron-down" style={{ fontSize: '9px' }}></i>
                  </div>
                </div>
              </button>
              {showCitiesPanel && (
                <ul className="metric-cities-panel">
                  {cityCounts.length === 0 ? (
                    <li className="metric-cities-empty">No cities yet</li>
                  ) : (
                    cityCounts.map((c) => (
                      <li key={c.name}>
                        <button type="button" onClick={() => handleCitySelect(c.name)}>
                          <span><i className="fas fa-map-marker-alt"></i> {c.name}</span>
                          <span className="metric-cities-count">{c.count}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <button
              type="button"
              className="metric-item metric-clickable"
              onClick={() => setNewOnly((v) => !v)}
              title={newOnly ? 'Click to show all businesses' : 'Show businesses posted today'}
              style={newOnly ? { background: 'rgba(255, 255, 255, 0.2)' } : undefined}
            >
              <span className="metric-icon"><i className="fas fa-chart-line"></i></span>
              <div>
                <span className="metric-num">{newBusinessesCount}</span>
                <div className="metric-label">{newOnly ? 'New Today (Active)' : 'New Today'}</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Explore Businesses in Popular Cities Section */}
      {!hasFilters && (
        <section className="popular-cities-section" id="popular-business-cities">
          <div className="container">
            <div className="section-header">
              <div>
                <h2>
                  <i className="fas fa-city" style={{ color: '#0d7a5f', marginRight: '8px' }}></i>
                  Explore Businesses in Popular Cities
                </h2>
                <p>Verified local businesses and services across top hubs</p>
              </div>
              <a
                href="/cities"
                className="btn-outline-green"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('cities');
                }}
              >
                All Indian Cities <i className="fas fa-arrow-right"></i>
              </a>
            </div>

            <div className="popular-cities-grid">
              {POPULAR_BROWSE_CITIES.map((cityItem) => {
                const cVariants = [
                  cityItem.name.toLowerCase(),
                  cityItem.slug.toLowerCase(),
                  ...(cityItem.name.toLowerCase() === 'ballabgarh' ? ['ballabhgarh'] : []),
                ];
                const count = cityCounts.find((c) => {
                  const lower = c.name.toLowerCase();
                  return cVariants.some((v) => lower === v || lower.includes(v));
                })?.count;

                return (
                  <a
                    key={cityItem.slug}
                    href={`#city-${cityItem.slug}`}
                    className="city-browse-card"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCitySelect(cityItem.name);
                    }}
                  >
                    <span className="city-browse-name">
                      <i className="fas fa-map-marker-alt" style={{ color: '#0d7a5f', fontSize: '12px' }}></i>
                      {cityItem.name}
                    </span>
                    <span className="city-browse-state">{cityItem.state}</span>
                    {count !== undefined && count > 0 ? (
                      <span className="city-browse-count">{count} {count === 1 ? 'business' : 'businesses'}</span>
                    ) : (
                      <span className="city-browse-count" style={{ background: '#f1f5f9', color: '#64748b' }}>Explore</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Featured Businesses Section (Matches Home Page Featured section) */}
      {!hasFilters && featuredBusinesses.length > 0 && (
        <section className="featured-section" id="featured-businesses" style={{ padding: '28px 0 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div className="container">
            <div className="section-header" style={{ marginBottom: '18px' }}>
              <div>
                <h2>
                  <i className="fas fa-star" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                  Featured Businesses
                </h2>
                <p>Promoted businesses across all cities</p>
              </div>
            </div>
            <div className="listings-grid">
              {featuredBusinesses.map((b) => renderBusinessCard(b))}
            </div>
          </div>
        </section>
      )}

      <section id="business-listings-section" style={{ background: '#f4f6f9', minHeight: '60vh', padding: '28px 0 48px' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div>
              <h2>
                <i className="fas fa-clock" style={{ color: '#0d7a5f', marginRight: '8px' }}></i>
                {hasFilters ? 'Filtered Businesses' : 'Recent Businesses'}
              </h2>
              <p>{hasFilters ? 'Businesses matching your search and filter criteria' : 'Latest verified businesses posted on TradeCall'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ color: '#111827' }}>
              {loading ? 'Loading businesses...' : `${visible.length} ${visible.length === 1 ? 'business' : 'businesses'} found`}
              {!loading && visible.length > BUSINESSES_PER_PAGE && (
                <span style={{ marginLeft: '8px', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                  (Page {page} of {totalPages})
                </span>
              )}
              {newOnly && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0c6253', fontWeight: 600 }}>(Filtered: Posted Today)</span>}
            </strong>
            {hasFilters && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={async () => {
                    const url = window.location.href;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Businesses on TradeCall',
                          text: 'Check out these businesses on TradeCall',
                          url,
                        });
                        return;
                      } catch {
                        // ignore share cancel
                      }
                    }
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopiedFilters(true);
                      setTimeout(() => setCopiedFilters(false), 2500);
                    } catch {
                      window.prompt('Copy this link to share with filters applied:', url);
                    }
                  }}
                  title="Share or copy link with active filters"
                  style={{
                    background: '#e6f4ea',
                    color: '#0c6253',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i className={copiedFilters ? "fas fa-check" : "fas fa-share-alt"}></i>
                  {copiedFilters ? 'Link Copied!' : 'Share'}
                </button>
                <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}
                  onClick={clearAllFilters}>
                  <i className="fas fa-times"></i> Clear filters
                </button>
              </div>
            )}
          </div>

          {error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10 }}>{error}</div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253' }}></i>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280', background: '#fff', borderRadius: 14 }}>
              <i className="fas fa-store-slash fa-3x" style={{ color: '#cbd5e1', marginBottom: 14, display: 'block' }}></i>
              {hasFilters ? 'No businesses match your search.' : 'No businesses listed yet.'}
            </div>
          ) : (
            <>
              <div className="listings-grid">
                {pagedBusinesses.map((b) => renderBusinessCard(b))}
              </div>

              {!loading && !error && totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '32px' }}>
                  <button type="button" className="page-btn" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                    <i className="fas fa-chevron-left"></i> Prev
                  </button>
                  {getPaginationItems(page, totalPages).map((item, idx) =>
                    item === '...' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="pagination-ellipsis"
                        style={{
                          padding: '0 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                          fontSize: '14px',
                          fontWeight: 600,
                          userSelect: 'none'
                        }}
                      >
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`page-btn ${item === page ? 'active' : ''}`}
                        onClick={() => goToPage(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button type="button" className="page-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
