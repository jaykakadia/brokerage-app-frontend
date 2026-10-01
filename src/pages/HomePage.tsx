import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { getWishlist, toggleWishlist, getApiErrorMessage, getListingStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice, getFirstImageUrl } from '../utils/formatters';
import type { Listing, ListingStatsResponse } from '../types';

export { formatListingPrice, getFirstImageUrl };

export interface HomePageProps {
  activeCity?: string;
  onCitySelect?: (city: string) => void;
  onNavigate: (page: string, params?: Record<string, string> | string | number) => void;
  onOpenAuth?: () => void;
}

interface PropertyTypeOption {
  value: string;
  label: string;
  icon: string;
}

interface BudgetPreset {
  label: string;
  min: string;
  max: string;
}

const ALL_CITIES = [
  'Ahmedabad', 'Agra', 'Ajmer', 'Aligarh', 'Ambala', 'Amritsar', 'Aurangabad',
  'Bangalore', 'Bengaluru', 'Bhopal', 'Bhubaneswar', 'Bikaner',
  'Chandigarh', 'Chennai', 'Coimbatore', 'Dehradun', 'Delhi', 'Dhanbad',
  'Faridabad', 'Ghaziabad', 'Gorakhpur', 'Gurugram', 'Guwahati', 'Gwalior',
  'Hathras', 'Hathin', 'Hisar', 'Hodal', 'Hyderabad',
  'Indore', 'Jabalpur', 'Jaipur', 'Jalandhar', 'Jamnagar', 'Jamshedpur', 'Jodhpur',
  'Kanpur', 'Karnal', 'Kochi', 'Kolkata', 'Kota',
  'Lucknow', 'Ludhiana', 'Madurai', 'Meerut', 'Moradabad', 'Mumbai', 'Mysore',
  'Nagpur', 'Nashik', 'Navi Mumbai', 'Noida',
  'Palwal', 'Panchkula', 'Panipat', 'Patna', 'Pune',
  'Raipur', 'Rajkot', 'Ranchi', 'Rewari', 'Rohtak', 'Rourkela',
  'Salem', 'Siliguri', 'Solapur', 'Sonipat', 'Surat',
  'Thane', 'Thiruvananthapuram', 'Udaipur', 'Ujjain', 'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam'
];

const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: '', label: 'All Property Types', icon: 'fa-shapes' },
  { value: 'flat', label: 'Flat / Apartment', icon: 'fa-building' },
  { value: 'house', label: 'House / Villa / Kothi', icon: 'fa-house' },
  { value: 'plot', label: 'Plot / Land', icon: 'fa-vector-square' },
  { value: 'floor', label: 'Builder Floor', icon: 'fa-layer-group' },
  { value: 'commercial', label: 'Commercial - Shop / Office', icon: 'fa-store' },
  { value: 'agriculture', label: 'Agricultural Land / Farm House', icon: 'fa-seedling' },
  { value: 'pg', label: 'PG / Guest House', icon: 'fa-bed' }
];

const BUDGET_PRESETS: BudgetPreset[] = [
  { label: 'Under ₹20 Lakh', min: '0', max: '2000000' },
  { label: '₹20L - ₹50 Lakh', min: '2000000', max: '5000000' },
  { label: '₹50L - ₹1 Crore', min: '5000000', max: '10000000' },
  { label: '₹1 Cr - ₹2 Crore', min: '10000000', max: '20000000' },
  { label: 'Above ₹2 Crore', min: '20000000', max: '' }
];

const DEFAULT_FEATURED_LISTINGS: Listing[] = [
  {
    id: 9001,
    title: 'Plot for Sale at RPS Society',
    location: 'RPS Society, Faridabad, Haryana',
    price: 7080000,
    owner_name: 'DP',
    owner_role: 'Owner',
    user_id: 1,
    status: 'approved',
    verified: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
    images: [],
    form_data: { propType: 'Plot' }
  },
  {
    id: 9002,
    title: 'Plot for Sale at Tarang Residency – Sohna Road',
    location: 'Tarang Residency – Sohna Road, Faridabad, Haryana',
    price: 11000000,
    owner_name: 'DP',
    owner_role: 'Owner',
    user_id: 1,
    status: 'approved',
    verified: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
    images: [],
    form_data: { propType: 'Plot' }
  },
  {
    id: 9003,
    title: 'Plot for Sale at Omaxe City Phase-I',
    location: 'Omaxe City Phase-I, Palwal, Haryana',
    price: 18800000,
    owner_name: 'Satyavir Singh',
    owner_role: 'Owner',
    user_id: 2,
    status: 'approved',
    verified: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
    images: [],
    form_data: { propType: 'Plot' }
  },
  {
    id: 9004,
    title: 'Plot for Sale at Omaxe City Phase-I',
    location: 'Omaxe City Phase-I, Palwal, Haryana',
    price: 9750000,
    owner_name: 'Satyavir Singh',
    owner_role: 'Owner',
    user_id: 2,
    status: 'approved',
    verified: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
    images: [],
    form_data: { propType: 'Plot' }
  }
];

export default function HomePage({ activeCity, onCitySelect, onNavigate, onOpenAuth }: HomePageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<ListingStatsResponse | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [withTransition, setWithTransition] = useState<boolean>(true);
  const [isCarouselHovered, setIsCarouselHovered] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const newTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return listings.filter((l) => {
      if (!l.created_at) return false;
      try {
        return new Date(l.created_at).toDateString() === today;
      } catch {
        return false;
      }
    }).length;
  }, [listings]);

  // Load wishlist IDs when authenticated
  useEffect(() => {
    if (user) {
      getWishlist(true)
        .then((res) => {
          const arr = res.data?.data;
          if (Array.isArray(arr)) {
            setWishlistIds(new Set(arr));
          }
        })
        .catch((err: unknown) => {
          console.error('Failed to load wishlist IDs', err);
        });
    } else {
      setWishlistIds(new Set());
    }
  }, [user]);

  const handleToggleWishlist = async (e: React.MouseEvent, listingId: number): Promise<void> => {
    e.stopPropagation();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      else alert('Please sign in to save properties to your wishlist.');
      return;
    }
    try {
      const res = await toggleWishlist(listingId);
      const action = res.data?.action;
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (action === 'added') next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    } catch (err: unknown) {
      console.error('Failed to toggle wishlist:', err);
    }
  };

  // Search & filter state
  const [heroCity, setHeroCity] = useState(activeCity || '');
  const [cityInput, setCityInput] = useState(activeCity || '');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cityWrapperRef = useRef<HTMLDivElement>(null);

  const [heroType, setHeroType] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [typeHighlightedIndex, setTypeHighlightedIndex] = useState(-1);
  const typeWrapperRef = useRef<HTMLDivElement>(null);

  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const budgetWrapperRef = useRef<HTMLDivElement>(null);

  const [heroKeyword, setHeroKeyword] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'sale' | 'rent' | 'verified'>('all');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  const citiesList = useMemo(() => [
    'Palwal', 'Faridabad', 'Gurugram', 'Sonipat', 'Panipat',
    'Hodal', 'Hathin', 'Delhi', 'Noida'
  ], []);

  // Sync cityInput when heroCity changes (from pills or resets)
  useEffect(() => {
    setCityInput(heroCity || '');
  }, [heroCity]);

  // Sync typeInput when heroType changes
  useEffect(() => {
    if (!heroType) {
      setTypeInput('');
    } else {
      const found = PROPERTY_TYPES.find((t) => t.value === heroType);
      setTypeInput(found ? found.label : heroType);
    }
  }, [heroType]);

  // Sync heroCity with activeCity from Header
  useEffect(() => {
    if (activeCity) {
      setHeroCity(activeCity);
      setSelectedCities([activeCity]);
    } else {
      setSelectedCities([]);
    }
  }, [activeCity]);

  // Click outside listener for suggestions dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target instanceof Node ? e.target : null;
      if (target && cityWrapperRef.current && !cityWrapperRef.current.contains(target)) {
        setShowCitySuggestions(false);
      }
      if (target && typeWrapperRef.current && !typeWrapperRef.current.contains(target)) {
        setShowTypeSuggestions(false);
      }
      if (target && budgetWrapperRef.current && !budgetWrapperRef.current.contains(target)) {
        setShowBudgetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter city suggestions based on user input
  const citySuggestions = useMemo(() => {
    const q = cityInput.trim().toLowerCase();
    if (!q) {
      return citiesList;
    }
    // Gather all available cities including any extra locations in current listings
    const set = new Set<string>(ALL_CITIES);
    listings.forEach((item) => {
      if (item.location) {
        item.location.split(',').forEach((part) => {
          const trimmed = part.trim();
          if (trimmed.length > 2 && trimmed.length < 25) set.add(trimmed);
        });
      }
    });
    return Array.from(set).filter((c) => c.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b));
  }, [cityInput, citiesList, listings]);

  const handleSelectCity = (city: string): void => {
    if (city === 'All Cities') {
      setCityInput('');
      setHeroCity('');
      setSelectedCities([]);
      if (onCitySelect) onCitySelect('');
    } else {
      setCityInput(city);
      setHeroCity(city);
      setSelectedCities([city]);
      if (onCitySelect) onCitySelect(city);
    }
    setShowCitySuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setCityInput(val);
    setHeroCity(val.trim());
    if (!val.trim()) {
      setSelectedCities([]);
      if (onCitySelect) onCitySelect('');
    } else {
      setSelectedCities([val.trim()]);
      if (onCitySelect) onCitySelect(val.trim());
    }
    setShowCitySuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showCitySuggestions) {
      if (e.key === 'ArrowDown') setShowCitySuggestions(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < citySuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : citySuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < citySuggestions.length) {
        e.preventDefault();
        handleSelectCity(citySuggestions[highlightedIndex]);
      } else {
        setShowCitySuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowCitySuggestions(false);
    }
  };

  // Property type suggestions
  const typeSuggestions = useMemo(() => {
    const q = typeInput.trim().toLowerCase();
    const current = PROPERTY_TYPES.find((t) => t.value === heroType);
    if (!q || (current && q === current.label.toLowerCase())) {
      return PROPERTY_TYPES;
    }
    return PROPERTY_TYPES.filter(
      (t) => t.value !== '' && (t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q))
    );
  }, [typeInput, heroType]);

  const handleSelectType = (typeObj: PropertyTypeOption | null): void => {
    if (!typeObj || !typeObj.value) {
      setHeroType('');
      setTypeInput('');
    } else {
      setHeroType(typeObj.value);
      setTypeInput(typeObj.label);
    }
    setShowTypeSuggestions(false);
    setTypeHighlightedIndex(-1);
  };

  const handleTypeInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setTypeInput(val);
    if (!val.trim()) {
      setHeroType('');
    }
    setShowTypeSuggestions(true);
    setTypeHighlightedIndex(-1);
  };

  const handleTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showTypeSuggestions) {
      if (e.key === 'ArrowDown') setShowTypeSuggestions(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setTypeHighlightedIndex((prev) => (prev < typeSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setTypeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : typeSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (typeHighlightedIndex >= 0 && typeHighlightedIndex < typeSuggestions.length) {
        e.preventDefault();
        handleSelectType(typeSuggestions[typeHighlightedIndex]);
      } else {
        setShowTypeSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowTypeSuggestions(false);
    }
  };

  const getBudgetLabel = (): string => {
    if (!budgetMin && !budgetMax) return '';
    const found = BUDGET_PRESETS.find((p) => p.min === budgetMin && p.max === budgetMax);
    if (found) return found.label;

    const fmt = (val: string): string => {
      const n = Number(val);
      if (isNaN(n) || n <= 0) return '';
      if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')} Cr`;
      if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
      return `₹${n}`;
    };

    if (budgetMin && budgetMax) {
      if (Number(budgetMin) === 0) return `Under ${fmt(budgetMax)}`;
      return `${fmt(budgetMin)} - ${fmt(budgetMax)}`;
    }
    if (budgetMin) return `Above ${fmt(budgetMin)}`;
    if (budgetMax) return `Under ${fmt(budgetMax)}`;
    return '';
  };

  const handleSelectBudgetPreset = (preset: BudgetPreset): void => {
    setBudgetMin(preset.min);
    setBudgetMax(preset.max);
    setShowBudgetDropdown(false);
  };

  const handleClearBudget = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setBudgetMin('');
    setBudgetMax('');
  };

  // Fetch approved listings from backend
  const fetchListings = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ status: string; data: Listing[] }>('/api/v1/listings', {
        params: { status: 'approved' }
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setListings(res.data.data);
      } else {
        setListings([]);
      }
    } catch (err: unknown) {
      console.error('Error fetching listings:', err);
      setError(getApiErrorMessage(err, 'Unable to load listings right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchListings();
    getListingStats()
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load stats', err);
      });
  }, []);

  const featuredListings = useMemo(() => {
    const marked = listings.filter((l) => l.is_featured || l.form_data?.featured || l.form_data?.is_featured);
    if (marked.length > 0) return marked;
    if (listings.length > 0) return listings.slice(0, 8);
    return DEFAULT_FEATURED_LISTINGS;
  }, [listings]);

  // Circular carousel: triplicate list so after the last card, the first card appears seamlessly
  const circularListings = useMemo(() => {
    if (featuredListings.length <= 1) return featuredListings;
    return [...featuredListings, ...featuredListings, ...featuredListings];
  }, [featuredListings]);

  // Start at the beginning of the middle clone
  useEffect(() => {
    if (featuredListings.length > 1) {
      setCarouselIndex(featuredListings.length);
      setWithTransition(false);
    }
  }, [featuredListings.length]);

  // When transition ends at outer bounds, seamlessly snap back to middle clone without transition
  const handleTransitionEnd = (): void => {
    const n = featuredListings.length;
    if (n <= 1) return;
    if (carouselIndex >= 2 * n) {
      setWithTransition(false);
      setCarouselIndex((prev) => prev - n);
    } else if (carouselIndex < n) {
      setWithTransition(false);
      setCarouselIndex((prev) => prev + n);
    }
  };

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

  // Auto slide periodically, pausing when user hovers over the carousel
  useEffect(() => {
    if (featuredListings.length <= 1 || isCarouselHovered) return;
    const interval = setInterval(() => {
      setWithTransition(true);
      setCarouselIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredListings.length, isCarouselHovered]);

  const activeDotIndex = featuredListings.length > 0
    ? ((carouselIndex % featuredListings.length) + featuredListings.length) % featuredListings.length
    : 0;

  const handleDotClick = (idx: number): void => {
    setWithTransition(true);
    setCarouselIndex(featuredListings.length + idx);
  };

  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent): void => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      slideCarousel(diff > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  const handleClearFilters = (): void => {
    setSelectedCities([]);
    setBudgetMin('');
    setBudgetMax('');
    setHeroCity('');
    setCityInput('');
    setHeroType('');
    setTypeInput('');
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
      let matches = formType.includes(heroType.toLowerCase()) || text.includes(heroType.toLowerCase());
      if (!matches && heroType === 'commercial') {
        matches = text.includes('shop') || text.includes('office') || text.includes('retail');
      }
      if (!matches) return false;
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
          <h1>Find Properties &amp; Related Businesses</h1>

          <div className="search-box">
            <div className="search-form">
              <div className="city-autocomplete-wrap" ref={cityWrapperRef}>
                <div className="city-autocomplete-box">
                  <i className="fas fa-map-marker-alt city-autocomplete-icon"></i>
                  <input
                    type="text"
                    id="heroCityInput"
                    className="city-autocomplete-input"
                    placeholder="Select City / Locality"
                    value={cityInput}
                    onChange={handleCityInputChange}
                    onFocus={() => setShowCitySuggestions(true)}
                    onKeyDown={handleCityKeyDown}
                    autoComplete="off"
                  />
                  {cityInput ? (
                    <button
                      type="button"
                      className="city-autocomplete-clear"
                      onClick={() => handleSelectCity('All Cities')}
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
                        className={`city-autocomplete-item ${!heroCity ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCity('All Cities')}
                      >
                        <i className="fas fa-globe"></i>
                        <span>All Cities</span>
                      </li>
                    )}
                    {citySuggestions.map((city, idx) => (
                      <li
                        key={city}
                        className={`city-autocomplete-item ${highlightedIndex === idx ? 'active' : ''}`}
                        onMouseDown={() => handleSelectCity(city)}
                      >
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{city}</span>
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

              {/* Property Type Searchable Autocomplete */}
              <div className="type-autocomplete-wrap" ref={typeWrapperRef}>
                <div className="type-autocomplete-box">
                  <i className="fas fa-building type-autocomplete-icon"></i>
                  <input
                    type="text"
                    id="heroTypeInput"
                    className="type-autocomplete-input"
                    placeholder="Select Property Type"
                    value={typeInput}
                    onChange={handleTypeInputChange}
                    onFocus={() => setShowTypeSuggestions(true)}
                    onKeyDown={handleTypeKeyDown}
                    autoComplete="off"
                  />
                  {heroType ? (
                    <button
                      type="button"
                      className="type-autocomplete-clear"
                      onClick={() => handleSelectType(null)}
                      title="Clear property type"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  ) : (
                    <i className="fas fa-chevron-down type-autocomplete-chevron"></i>
                  )}
                </div>

                {showTypeSuggestions && (
                  <ul className="type-autocomplete-dropdown">
                    {typeSuggestions.map((typeObj, idx) => (
                      <li
                        key={typeObj.value || 'all'}
                        className={`type-autocomplete-item ${typeHighlightedIndex === idx || (heroType === typeObj.value && (!typeObj.value ? !heroType : true)) ? 'active' : ''}`}
                        onMouseDown={() => handleSelectType(typeObj)}
                      >
                        <i className={`fas ${typeObj.icon}`}></i>
                        <span>{typeObj.label}</span>
                      </li>
                    ))}
                    {typeSuggestions.length === 0 && (
                      <li className="type-autocomplete-empty">
                        No matching property types found
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Budget Searchable Dropdown */}
              <div className="budget-dropdown-wrap" ref={budgetWrapperRef}>
                <div
                  className="budget-box"
                  onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
                >
                  <i className="fas fa-rupee-sign budget-icon"></i>
                  <input
                    type="text"
                    id="heroBudgetInput"
                    className="budget-input"
                    placeholder="Select Budget"
                    value={getBudgetLabel()}
                    readOnly
                  />
                  {(budgetMin || budgetMax) ? (
                    <button
                      type="button"
                      className="budget-clear"
                      onClick={handleClearBudget}
                      title="Clear budget"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  ) : (
                    <i className="fas fa-chevron-down budget-chevron"></i>
                  )}
                </div>

                {showBudgetDropdown && (
                  <div className="budget-menu">
                    <div className="budget-menu-title">Select Budget Range</div>
                    <div className="budget-custom-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="budget-custom-input"
                        placeholder="Min (₹)"
                        value={budgetMin}
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ''))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="budget-custom-sep">to</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="budget-custom-input"
                        placeholder="Max (₹)"
                        value={budgetMax}
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ''))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="budget-presets-list">
                      <button
                        type="button"
                        className={`budget-preset-item ${(!budgetMin && !budgetMax) ? 'active' : ''}`}
                        onClick={() => { setBudgetMin(''); setBudgetMax(''); setShowBudgetDropdown(false); }}
                      >
                        <span>Any Budget</span>
                        {(!budgetMin && !budgetMax) && <i className="fas fa-check"></i>}
                      </button>
                      {BUDGET_PRESETS.map((preset) => {
                        const isSelected = budgetMin === preset.min && budgetMax === preset.max;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            className={`budget-preset-item ${isSelected ? 'active' : ''}`}
                            onClick={() => handleSelectBudgetPreset(preset)}
                          >
                            <span>{preset.label}</span>
                            {isSelected && <i className="fas fa-check"></i>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

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

          {/* Metrics Container directly below search box */}
          <div className="container metrics-inner">
            <div className="metric-item">
              <span className="metric-icon"><i className="fas fa-list-ul"></i></span>
              <div>
                <span className="metric-num">{stats?.active_listings || listings.length || 61}</span>
                <span className="metric-plus">+</span>
                <div className="metric-label">Active Listings</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon"><i className="fas fa-star" style={{ color: 'rgb(245, 158, 11)' }}></i></span>
              <div>
                <span className="metric-num">{stats?.featured_listings || featuredListings.length || 4}</span>
                <div className="metric-label">Featured Listings</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon"><i className="fas fa-map-marker-alt"></i></span>
              <div>
                <span className="metric-num">{stats?.cities_covered || 16}</span>
                <div className="metric-label">Cities Covered</div>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-icon"><i className="fas fa-chart-line"></i></span>
              <div>
                <span className="metric-num">{newTodayCount || 0}</span>
                <div className="metric-label">New Today</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>
                <i className="fas fa-star" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                Featured Listings
              </h2>
              <p>Promoted properties across all cities</p>
            </div>
          </div>

          <div
            className="carousel-wrapper"
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {featuredListings.length > 1 && (
              <button
                type="button"
                className="carousel-btn prev"
                onClick={() => slideCarousel(-1)}
                aria-label="Previous featured listings"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}

            <div
              className="carousel-track"
              id="carouselTrack"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translateX(-${carouselIndex * 320}px)`,
                transition: withTransition ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
              }}
            >
              {circularListings.map((listing, index) => {
                const imgSrc = getFirstImageUrl(listing);
                const priceStr = formatListingPrice(listing.price);
                const pType = listing.form_data?.propType || 'Plot';
                const isSaved = wishlistIds.has(listing.id);

                return (
                  <div
                    key={`featured-${listing.id}-${index}`}
                    className="listing-card featured-card"
                  >
                    <div className="card-img-wrap">
                      <img
                        src={imgSrc}
                        alt={listing.title}
                        className="card-img"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = '/placeholder-property.svg';
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
                        {pType}
                      </span>
                    </div>

                    <div className="card-body">
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
                        >
                          <i className="fas fa-info-circle"></i> Details
                        </button>
                        <button
                          type="button"
                          className={`btn-wishlist ${isSaved ? 'active' : ''}`}
                          onClick={(e) => void handleToggleWishlist(e, listing.id)}
                        >
                          <i className={isSaved ? 'fas fa-heart' : 'far fa-heart'}></i>
                          <span>Wishlist</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {featuredListings.length > 1 && (
              <button
                type="button"
                className="carousel-btn next"
                onClick={() => slideCarousel(1)}
                aria-label="Next featured listings"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>

          {featuredListings.length > 1 && (
            <div className="carousel-dots" id="carouselDots">
              {featuredListings.map((_, idx) => (
                <span
                  key={idx}
                  className={`dot ${idx === activeDotIndex ? 'active' : ''}`}
                  onClick={() => handleDotClick(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

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
        <div className="container">
          <div className="listings-main">
            <div className="listings-controls">
              <div className="listing-count" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span><strong>{filteredListings.length}</strong> listings found</span>
                {(heroCity || heroType || budgetMin || budgetMax || heroKeyword || selectedCities.length > 0) && (
                  <button
                    type="button"
                    className="btn-clear-filter"
                    style={{ fontSize: '12.5px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    onClick={handleClearFilters}
                  >
                    <i className="fas fa-undo" style={{ marginRight: '4px' }}></i> Reset Filters
                  </button>
                )}
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
                  onClick={() => void fetchListings()}
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
                  const pType = listing.form_data?.propType || 'Property';

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
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = '/placeholder-property.svg';
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
                          {pType}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => void handleToggleWishlist(e, listing.id)}
                          title={wishlistIds.has(listing.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: wishlistIds.has(listing.id) ? '#dc2626' : '#9ca3af',
                            fontSize: '15px',
                            zIndex: 2,
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <i className={wishlistIds.has(listing.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                        </button>
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
                          >
                            <i className="fas fa-info-circle"></i> Details
                          </button>
                          <button
                            type="button"
                            className={`btn-wishlist ${wishlistIds.has(listing.id) ? 'active' : ''}`}
                            onClick={(e) => void handleToggleWishlist(e, listing.id)}
                          >
                            <i className={wishlistIds.has(listing.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
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
        </div>
      </section>
    </div>
  );
}
