import { useEffect, useMemo, useRef, useState } from 'react';
import api, { getApiErrorMessage, getListingStats, getWishlist, toggleWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cardImageBackdrop, getFirstImageUrl } from '../utils/formatters';
import { cityNameVariants, getBusinessCategories, getPrimaryBusinessCategory, getListingCity, isBusinessListing, isNewListing, publicListingTitle } from '../utils/listingKind';
import { POPULAR_BROWSE_CITIES } from '../config/cities';
import ALL_CITIES_DATA from '../config/allCities.json';
import { getListingUrl } from '../utils/url';
import { setSeo } from '../utils/seo';
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
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [withTransition, setWithTransition] = useState<boolean>(true);
  const [isCarouselHovered, setIsCarouselHovered] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setSeo({
      title: 'Local Business Directory in Palwal & NCR | TradeCall India',
      description: 'Explore verified local businesses, shops, and services across Palwal, Faridabad, and Haryana NCR. Free local business directory on TradeCall India.',
      path: '/business-directory'
    });
  }, []);

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

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (citiesPanelRef.current && !citiesPanelRef.current.contains(target)) {
        setShowCitiesPanel(false);
      }
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(target)) {
        setShowCitySuggestions(false);
      }
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(target)) {
        setShowCategorySuggestions(false);
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
  const [categoryInput, setCategoryInput] = useState(() => initialUrlParams.get('category') || '');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [categoryHighlightedIndex, setCategoryHighlightedIndex] = useState(-1);
  const [allCategoriesPicked, setAllCategoriesPicked] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [city, setCity] = useState(() => initialUrlParams.get('city') || '');
  const [cityInput, setCityInput] = useState(() => initialUrlParams.get('city') || '');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityHighlightedIndex, setCityHighlightedIndex] = useState(-1);
  const [allCitiesPicked, setAllCitiesPicked] = useState(false);
  const cityWrapperRef = useRef<HTMLDivElement>(null);

  const [newOnly, setNewOnly] = useState(() => initialUrlParams.get('new') === '1' || initialUrlParams.get('new') === 'true');
  const [copiedFilters, setCopiedFilters] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);

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
      const q = sp.get('q') || sp.get('search') || '';
      const cat = sp.get('category') || '';
      const c = sp.get('city') || '';
      setSearch(q);
      setCategory(cat);
      setCategoryInput(cat);
      setAllCategoriesPicked(false);
      setCity(c);
      setCityInput(c);
      setAllCitiesPicked(false);
      setNewOnly(sp.get('new') === '1' || sp.get('new') === 'true');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ status: string; data: Listing[]; total?: number }>('/api/v1/listings', {
          params: { status: 'approved', kind: 'business', limit: 1000 }
        });
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
    api.get<{ status: string; data: Array<{ name: string }> }>('/api/v1/categories')
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setAllCategories(res.data.data.map((c) => c.name).filter(Boolean));
        }
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

  const activeBusinessesCount = stats?.active_businesses ?? businesses.length;
  const activeUsersCount = stats?.registered_users ? `${stats.registered_users}+` : '147+';
  const citiesCoveredCount = cityCounts.length;
  const newBusinessesCount = useMemo(() => businesses.filter(isNewListing).length, [businesses]);

  const categoryOptions = useMemo(() => {
    const fromBusinesses = businesses.flatMap((b) => businessInfo(b).categories);
    const combined = [...new Set([...allCategories, ...fromBusinesses])].filter(Boolean).sort();
    return combined;
  }, [allCategories, businesses]);

  const categorySuggestions = useMemo(() => {
    const q = categoryInput.trim().toLowerCase();
    if (!q || (allCategoriesPicked && q === 'all categories')) {
      return categoryOptions;
    }
    return categoryOptions.filter((c) => c.toLowerCase().includes(q));
  }, [categoryInput, categoryOptions, allCategoriesPicked]);

  const citySuggestions = useMemo(() => {
    const q = cityInput.trim().toLowerCase();
    const all = ALL_CITIES_DATA as string[];
    if (!q || (allCitiesPicked && q === 'all cities')) {
      return all.slice(0, 100);
    }
    return all.filter((name) => name.toLowerCase().includes(q)).slice(0, 100);
  }, [cityInput, allCitiesPicked]);

  const handleSelectCity = (c: string): void => {
    const isAll = c === 'All Cities' || !c;
    setAllCitiesPicked(isAll);
    if (isAll) {
      setCityInput('');
      setCity('');
    } else {
      setCityInput(c);
      setCity(c);
    }
    setShowCitySuggestions(false);
    setCityHighlightedIndex(-1);
    setCurrentPage(1);
    setShowCitiesPanel(false);
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = allCitiesPicked ? e.target.value.replace(/^All Cities/, '') : e.target.value;
    setAllCitiesPicked(false);
    setCityInput(val);
    setCity(val.trim());
    setShowCitySuggestions(true);
    setCityHighlightedIndex(-1);
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showCitySuggestions) {
      if (e.key === 'ArrowDown') setShowCitySuggestions(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev < citySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : citySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (cityHighlightedIndex >= 0 && cityHighlightedIndex < citySuggestions.length) {
        e.preventDefault();
        handleSelectCity(citySuggestions[cityHighlightedIndex]);
      } else if (cityInput.trim()) {
        const exact = citySuggestions.find((c) => c.toLowerCase() === cityInput.trim().toLowerCase());
        e.preventDefault();
        handleSelectCity(exact || citySuggestions[0] || cityInput.trim());
      } else {
        setShowCitySuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowCitySuggestions(false);
    }
  };

  const handleSelectCategory = (cat: string): void => {
    const isAll = cat === 'All Categories' || !cat;
    setAllCategoriesPicked(isAll);
    if (isAll) {
      setCategoryInput('');
      setCategory('');
    } else {
      setCategoryInput(cat);
      setCategory(cat);
    }
    setShowCategorySuggestions(false);
    setCategoryHighlightedIndex(-1);
    setCurrentPage(1);
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = allCategoriesPicked ? e.target.value.replace(/^All Categories/, '') : e.target.value;
    setAllCategoriesPicked(false);
    setCategoryInput(val);
    setCategory(val.trim());
    setShowCategorySuggestions(true);
    setCategoryHighlightedIndex(-1);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showCategorySuggestions) {
      if (e.key === 'ArrowDown') setShowCategorySuggestions(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCategoryHighlightedIndex((prev) => (prev < categorySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCategoryHighlightedIndex((prev) => (prev > 0 ? prev - 1 : categorySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (categoryHighlightedIndex >= 0 && categoryHighlightedIndex < categorySuggestions.length) {
        e.preventDefault();
        handleSelectCategory(categorySuggestions[categoryHighlightedIndex]);
      } else if (categoryInput.trim()) {
        const exact = categorySuggestions.find((c) => c.toLowerCase() === categoryInput.trim().toLowerCase());
        e.preventDefault();
        handleSelectCategory(exact || categorySuggestions[0] || categoryInput.trim());
      } else {
        setShowCategorySuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowCategorySuggestions(false);
    }
  };

  const featuredBusinesses = useMemo(() => businesses.filter((b) => b.is_featured), [businesses]);

  const featuredSlides = featuredBusinesses.length > 1;

  // Circular carousel: triplicate list so after the last card, the first card appears seamlessly
  const circularBusinesses = useMemo(() => {
    if (!featuredSlides) return featuredBusinesses;
    return [...featuredBusinesses, ...featuredBusinesses, ...featuredBusinesses];
  }, [featuredBusinesses, featuredSlides]);

  // Start at the beginning of the middle clone
  useEffect(() => {
    setWithTransition(false);
    setCarouselIndex(featuredSlides ? featuredBusinesses.length : 0);
  }, [featuredBusinesses.length, featuredSlides]);

  // Once a slide has moved out of the middle clone, snap back into it without animation
  useEffect(() => {
    const n = featuredBusinesses.length;
    if (!featuredSlides || (carouselIndex >= n && carouselIndex < 2 * n)) return;
    const id = window.setTimeout(() => {
      setWithTransition(false);
      setCarouselIndex((prev) => (((prev - n) % n) + n) % n + n);
    }, 500);
    return () => window.clearTimeout(id);
  }, [carouselIndex, featuredBusinesses.length, featuredSlides]);

  // Re-enable CSS transition on the next frame after an instant snap
  useEffect(() => {
    if (!withTransition) {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
        });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [withTransition]);

  const slideCarousel = (dir: number): void => {
    setWithTransition(true);
    setCarouselIndex((prev) => prev + dir);
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent): void => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (featuredSlides && Math.abs(diff) > 40) {
      slideCarousel(diff > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  const hasFilters = Boolean(search.trim() || category || city || newOnly);

  // Auto slide periodically, pausing when user hovers over the carousel
  useEffect(() => {
    if (!featuredSlides || isCarouselHovered || hasFilters) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setWithTransition(true);
      setCarouselIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredSlides, isCarouselHovered, hasFilters]);

  const visible = businesses.filter((b) => {
    const info = businessInfo(b);
    if (newOnly && !isNewListing(b)) return false;
    if (category) {
      const targetCat = category.toLowerCase();
      if (!info.categories.some((c) => c.toLowerCase() === targetCat || c.toLowerCase().includes(targetCat))) return false;
    }
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
    setCategoryInput('');
    setAllCategoriesPicked(false);
    setCity('');
    setCityInput('');
    setAllCitiesPicked(false);
    setNewOnly(false);
    setCurrentPage(1);
  };

  const handleCitySelect = (selectedCityName: string) => {
    handleSelectCity(selectedCityName);
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

  const renderBusinessCard = (b: Listing, isFeatured: boolean = false, keyPrefix: string = '') => {
    const bUrl = getListingUrl(b);
    const imgSrc = getFirstImageUrl(b);
    const title = publicListingTitle(b) || b.title;
    const categoryLabel = getPrimaryBusinessCategory(b) || 'Business';

    return (
      <div key={keyPrefix ? `${keyPrefix}-${b.id}` : b.id} className={`listing-card ${isFeatured ? 'featured-card' : 'business-dir-card'}`}>
        <a
          href={bUrl}
          className="card-stretched-link"
          aria-label={title}
          onClick={(e) => handleLinkClick(e, b)}
        />
        <div className="card-img-wrap" style={cardImageBackdrop(imgSrc)}>
          <img
            src={imgSrc}
            alt={title}
            className="card-img"
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-property.svg'; }}
          />
          {b.verified === 1 && (
            <span
              className="badge-verified"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
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
          <span
            className="badge-featured"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              textTransform: 'capitalize',
              zIndex: 2
            }}
          >
            {categoryLabel}
          </span>
        </div>
        <div className="card-body">
          <h3
            className="card-price"
            title={title}
            style={{
              margin: 0,
              marginBottom: '6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </h3>
          <div
            className="card-title"
            title={categoryLabel}
            style={{ minHeight: 'auto', marginBottom: '6px' }}
          >
            {categoryLabel}
          </div>
          <div className="card-location">
            <i className="fas fa-map-marker-alt"></i> <span>{b.location}</span>
          </div>
          <div className="card-features" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            Owner: <strong>{b.owner_name || 'Business Owner'}</strong>{b.owner_role ? ` (${b.owner_role})` : ''}
          </div>
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
        <div className="container hero-content">
          <h1><i className="fas fa-store"></i> Business Directory</h1>
          <p style={{ margin: '-10px auto 24px', opacity: 0.95, fontSize: '16px', color: '#e6f4ea' }}>
            Find trusted local businesses, services and shops near you
          </p>

          <div className="search-box" style={{ margin: '24px auto 24px', maxWidth: '1100px', textAlign: 'left' }}>
            <div className="search-form">
              {/* City Searchable Autocomplete */}
              <div className="city-autocomplete-wrap" ref={cityWrapperRef}>
                <div className="city-autocomplete-box">
                  <i className="fas fa-map-marker-alt city-autocomplete-icon"></i>
                  <input
                    type="text"
                    id="businessCityInput"
                    className="city-autocomplete-input"
                    placeholder="Select City / Locality"
                    value={cityInput || (allCitiesPicked ? 'All Cities' : '')}
                    onChange={handleCityInputChange}
                    onFocus={(e) => { if (allCitiesPicked) e.target.select(); setShowCitySuggestions(true); }}
                    onKeyDown={handleCityKeyDown}
                    autoComplete="off"
                  />
                  {cityInput || allCitiesPicked ? (
                    <button
                      type="button"
                      className="city-autocomplete-clear"
                      onClick={() => { handleSelectCity('All Cities'); setAllCitiesPicked(false); }}
                      title="Clear city"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  ) : (
                    <i className="fas fa-chevron-down city-autocomplete-chevron"></i>
                  )}
                </div>

                {showCitySuggestions && (
                  <ul className="city-autocomplete-dropdown">
                    {!cityInput.trim() && (
                      <li
                        className={`city-autocomplete-item ${!city ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCity('All Cities')}
                      >
                        <i className="fas fa-globe"></i>
                        <span>All Cities</span>
                      </li>
                    )}
                    {citySuggestions.map((cityName, idx) => (
                      <li
                        key={cityName}
                        className={`city-autocomplete-item ${cityHighlightedIndex === idx || city === cityName ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCity(cityName)}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{cityName}</span>
                      </li>
                    ))}
                    {citySuggestions.length === 0 && (
                      <li className="city-autocomplete-empty">
                        No matching cities found
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Category Searchable Autocomplete */}
              <div className="type-autocomplete-wrap" ref={categoryWrapperRef}>
                <div className="type-autocomplete-box">
                  <i className="fas fa-th-large type-autocomplete-icon"></i>
                  <input
                    type="text"
                    id="businessCategoryInput"
                    className="type-autocomplete-input"
                    placeholder="Select Category"
                    value={categoryInput || (allCategoriesPicked ? 'All Categories' : '')}
                    onChange={handleCategoryInputChange}
                    onFocus={(e) => { if (allCategoriesPicked) e.target.select(); setShowCategorySuggestions(true); }}
                    onKeyDown={handleCategoryKeyDown}
                    autoComplete="off"
                  />
                  {categoryInput || allCategoriesPicked ? (
                    <button
                      type="button"
                      className="type-autocomplete-clear"
                      onClick={() => { handleSelectCategory('All Categories'); setAllCategoriesPicked(false); }}
                      title="Clear category"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  ) : (
                    <i className="fas fa-chevron-down type-autocomplete-chevron"></i>
                  )}
                </div>

                {showCategorySuggestions && (
                  <ul className="type-autocomplete-dropdown">
                    {!categoryInput.trim() && (
                      <li
                        className={`type-autocomplete-item ${!category ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCategory('All Categories')}
                      >
                        <i className="fas fa-layer-group"></i>
                        <span>All Categories</span>
                      </li>
                    )}
                    {categorySuggestions.map((catName, idx) => (
                      <li
                        key={catName}
                        className={`type-autocomplete-item ${categoryHighlightedIndex === idx || category === catName ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCategory(catName)}
                      >
                        <i className="fas fa-tag"></i>
                        <span>{catName}</span>
                      </li>
                    ))}
                    {categorySuggestions.length === 0 && (
                      <li className="type-autocomplete-empty">
                        No matching categories found
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Keyword Search Input */}
              <input
                type="text"
                className="search-input"
                placeholder="Search business name or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const el = document.getElementById('business-listings-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />

              {/* Search Button */}
              <button
                type="button"
                className="btn-search"
                onClick={() => {
                  const el = document.getElementById('business-listings-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <i className="fas fa-search"></i> Search
              </button>
            </div>
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
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px' }}>
              <div>
                <h2>
                  <i className="fas fa-star" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                  Featured Businesses
                </h2>
                <p>Promoted businesses across all cities</p>
              </div>
              {featuredSlides && (
                <div className="carousel-nav-header">
                  <button
                    type="button"
                    className="carousel-nav-btn prev"
                    onClick={() => slideCarousel(-1)}
                    aria-label="Previous featured businesses"
                    title="Previous"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    className="carousel-nav-btn next"
                    onClick={() => slideCarousel(1)}
                    aria-label="Next featured businesses"
                    title="Next"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
            <div
              className="carousel-wrapper"
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {featuredSlides && (
                <button
                  type="button"
                  className="carousel-btn prev"
                  onClick={() => slideCarousel(-1)}
                  aria-label="Previous featured businesses"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
              )}

              <div className="carousel-viewport">
                <div
                  className={`carousel-track ${featuredSlides ? '' : 'static'}`}
                  id="featuredBusinessTrack"
                  style={featuredSlides ? {
                    transform: `translateX(calc(${-carouselIndex} * (100% + 20px) / var(--per-view)))`,
                    transition: withTransition ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
                  } : undefined}
                >
                  {circularBusinesses.map((b, index) =>
                    renderBusinessCard(b, true, `featured-${index}`)
                  )}
                </div>
              </div>

              {featuredSlides && (
                <button
                  type="button"
                  className="carousel-btn next"
                  onClick={() => slideCarousel(1)}
                  aria-label="Next featured businesses"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              )}
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

          {hasFilters && (
            <div className="listings-filter-bar" style={{ marginBottom: '16px' }}>
              <div className="listings-filter-chips">
                <span className="listings-filter-label">Active filters:</span>
                {newOnly && (
                  <span className="listing-filter-chip">
                    <i className="fas fa-bolt" style={{ color: '#0c6253', marginRight: '4px' }}></i>
                    New today
                    <button type="button" onClick={() => setNewOnly(false)} title="Show all businesses">
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {city && (
                  <span className="listing-filter-chip">
                    <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>
                    {city}
                    <button type="button" onClick={() => handleSelectCity('All Cities')} title="Clear city">
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {category && (
                  <span className="listing-filter-chip">
                    <i className="fas fa-tag" style={{ marginRight: '4px' }}></i>
                    {category}
                    <button type="button" onClick={() => handleSelectCategory('All Categories')} title="Clear category">
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {search.trim() && (
                  <span className="listing-filter-chip">
                    <i className="fas fa-search" style={{ marginRight: '4px' }}></i>
                    &ldquo;{search.trim()}&rdquo;
                    <button type="button" onClick={() => setSearch('')} title="Clear keyword">
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-share-filter"
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
                    fontSize: '12px',
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
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={clearAllFilters}
                >
                  <i className="fas fa-times"></i> Clear all
                </button>
              </div>
            </div>
          )}

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
