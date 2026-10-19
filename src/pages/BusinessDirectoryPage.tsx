import { useEffect, useMemo, useRef, useState } from 'react';
import api, { getApiErrorMessage, getListingStats, getWishlist, toggleWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cardImageBackdrop, getFirstImageUrl } from '../utils/formatters';
import { cityNameVariants, getBusinessCategories, getListingCity, isBusinessListing, isNewListing } from '../utils/listingKind';
import { POPULAR_BROWSE_CITIES } from '../config/cities';
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

export default function BusinessDirectoryPage({ onNavigate, onOpenAuth }: BusinessDirectoryPageProps) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<ListingStatsResponse | null>(null);
  const [showCitiesPanel, setShowCitiesPanel] = useState(false);
  const citiesPanelRef = useRef<HTMLDivElement>(null);

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
  const [businesses, setBusinesses] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [newOnly, setNewOnly] = useState(false);

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
  }).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));

  const hasFilters = Boolean(search || category || city || newOnly);

  const clearAllFilters = () => {
    setSearch('');
    setCategory('');
    setCity('');
    setNewOnly(false);
  };

  const handleCitySelect = (selectedCityName: string) => {
    const matched = rawCityOptions.find((c) => c.toLowerCase() === selectedCityName.toLowerCase()) || selectedCityName;
    setCity(matched);
    setShowCitiesPanel(false);
    const el = document.getElementById('business-listings-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

      <section id="business-listings-section" style={{ background: '#f4f6f9', minHeight: '60vh', padding: '24px 0 48px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ color: '#111827' }}>
              {loading ? 'Loading businesses...' : `${visible.length} ${visible.length === 1 ? 'business' : 'businesses'} found`}
              {newOnly && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0c6253', fontWeight: 600 }}>(Filtered: Posted Today)</span>}
            </strong>
            {hasFilters && (
              <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={clearAllFilters}>
                <i className="fas fa-times"></i> Clear filters
              </button>
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
            <div className="listings-grid">
              {visible.map((b) => {
                const info = businessInfo(b);
                return (
                  <div key={b.id} className="listing-card business-dir-card">
                    <div className="card-img-wrap" style={cardImageBackdrop(getFirstImageUrl(b))}>
                      <img
                        src={getFirstImageUrl(b)}
                        alt={b.title}
                        className="card-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-property.svg'; }}
                      />
                      {b.verified === 1 && (
                        <span className="badge-verified"><i className="fas fa-check-circle"></i> Verified</span>
                      )}
                      {b.is_featured && (
                        <span
                          className="badge-featured"
                          style={{
                            top: '12px',
                            left: '12px',
                            background: '#0d7a5f',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="fas fa-crown" style={{ color: '#fbbf24', fontSize: '10px' }}></i> Featured
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
                        <button type="button" className="btn-view" onClick={() => onNavigate('listing-detail', b)}>
                          <i className="fas fa-info-circle"></i> Details
                        </button>
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
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
