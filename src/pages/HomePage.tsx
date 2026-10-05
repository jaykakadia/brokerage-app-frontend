import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { getWishlist, toggleWishlist, getApiErrorMessage, getListingStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cardImageBackdrop, formatListingPrice, getFirstImageUrl } from '../utils/formatters';
import { getListingCity, getListingDeal, isBusinessListing, isNewListing } from '../utils/listingKind';
import type { Listing, ListingStatsResponse, NavigateFunction } from '../types';

export { formatListingPrice, getFirstImageUrl };

export interface AuthModalOptions {
  title?: string;
  subtitle?: string;
  icon?: string;
  onSuccess?: () => void;
}

export interface HomePageProps {
  activeCity?: string;
  onCitySelect?: (city: string) => void;
  onNavigate: NavigateFunction;
  onOpenAuth?: (options?: AuthModalOptions) => void;
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

// Same types (values and labels) as "Select Property Type" in the Post Listing form.
const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: '', label: 'All Property Types', icon: 'fa-shapes' },
  { value: 'flat', label: 'Flat / Builder Floor / House / Villa', icon: 'fa-building' },
  { value: 'plot', label: 'Plot', icon: 'fa-vector-square' },
  { value: 'agriculture', label: 'Agriculture Land', icon: 'fa-seedling' },
  { value: 'commercial', label: 'Commercial - Shop/ Showroom/ Warehouse', icon: 'fa-store' },
  { value: 'pg', label: 'PG/ Guest House', icon: 'fa-bed' }
];

const BUDGET_PRESETS: BudgetPreset[] = [
  { label: 'Under ₹20 Lakh', min: '0', max: '2000000' },
  { label: '₹20L - ₹50 Lakh', min: '2000000', max: '5000000' },
  { label: '₹50L - ₹1 Crore', min: '5000000', max: '10000000' },
  { label: '₹1 Cr - ₹2 Crore', min: '10000000', max: '20000000' },
  { label: 'Above ₹2 Crore', min: '20000000', max: '' }
];

export const DEFAULT_FEATURED_LISTINGS: Listing[] = [
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

const LISTINGS_PER_PAGE = 8;

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

  const newListingsCount = useMemo(() => listings.filter(isNewListing).length, [listings]);

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
      if (onOpenAuth) {
        onOpenAuth({
          title: 'Sign In to Save Properties',
          subtitle: 'Please sign in or create an account to save properties to your wishlist.',
          icon: 'fa-heart',
          onSuccess: async () => {
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
              console.error('Failed to save to wishlist after sign-in:', err);
            }
          }
        });
      } else {
        alert('Please sign in to save properties to your wishlist.');
      }
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
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'sale' | 'rent' | 'buy' | 'verified'>('all');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [newOnly, setNewOnly] = useState(false);
  const [showCitiesPanel, setShowCitiesPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Set when the user explicitly picks the "All …" / "Any …" option, so the box shows it instead of the placeholder
  const [allCitiesPicked, setAllCitiesPicked] = useState(false);
  const [allTypesPicked, setAllTypesPicked] = useState(false);
  const [anyBudgetPicked, setAnyBudgetPicked] = useState(false);
  const citiesPanelRef = useRef<HTMLDivElement>(null);

  // Featured Listings are hidden while the user is filtering or searching
  const hasActiveFilters = !!(heroCity || heroType || budgetMin || budgetMax || heroKeyword.trim()
    || selectedCities.length > 0 || newOnly || activeCategoryTab !== 'all');

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
      if (target && citiesPanelRef.current && !citiesPanelRef.current.contains(target)) {
        setShowCitiesPanel(false);
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
    setAllCitiesPicked(city === 'All Cities');
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
    const val = allCitiesPicked ? e.target.value.replace(/^All Cities/, '') : e.target.value;
    setAllCitiesPicked(false);
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
    setAllTypesPicked(!!typeObj && !typeObj.value);
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
    const val = allTypesPicked ? e.target.value.replace(/^All Property Types/, '') : e.target.value;
    setAllTypesPicked(false);
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
    setAnyBudgetPicked(false);
    setShowBudgetDropdown(false);
  };

  const handleClearBudget = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setBudgetMin('');
    setBudgetMax('');
    setAnyBudgetPicked(false);
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
        // Business listings are shown only in the Business Directory
        setListings(res.data.data.filter((l) => !isBusinessListing(l)));
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

  // Only listings featured by the server (paid featured plan or admin) — never a fallback to the latest ones
  const featuredListings = useMemo(() => listings.filter((l) => l.is_featured), [listings]);
  // The 4 newest listings, shown in one row just after Featured Listings
  const recentListings = useMemo(
    () => [...listings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id)
      .slice(0, 4),
    [listings]
  );

  // Cities with listing counts, from the same listings shown below so the numbers match what a click shows
  const cityCounts = useMemo(() => {
    const byKey = new Map<string, { name: string; count: number }>();
    listings.forEach((item) => {
      const name = getListingCity(item);
      if (!name) return;
      const key = name.toLowerCase();
      const entry = byKey.get(key);
      if (entry) entry.count += 1;
      else byKey.set(key, { name, count: 1 });
    });
    return Array.from(byKey.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [listings]);

  // Until the listings load, show the site-wide stats
  const listingsLoaded = !loading && !error;
  const activeListingsCount = listingsLoaded ? listings.length : (stats?.active_listings ?? 0);
  const featuredCount = listingsLoaded ? featuredListings.length : (stats?.featured_listings ?? 0);
  const citiesCoveredCount = listingsLoaded ? cityCounts.length : (stats?.cities_covered ?? 0);
  const newCount = listingsLoaded ? newListingsCount : 0;

  // Waits a frame so the filtered list has rendered before scrolling to it
  const scrollToSection = (id: string): void => {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  };

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
    if (featuredListings.length <= 1 || isCarouselHovered || hasActiveFilters) return;
    const interval = setInterval(() => {
      setWithTransition(true);
      setCarouselIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredListings.length, isCarouselHovered, hasActiveFilters]);

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
    setNewOnly(false);
    setAllCitiesPicked(false);
    setAllTypesPicked(false);
    setAnyBudgetPicked(false);
    if (onCitySelect) onCitySelect('');
  };

  const showAllListings = (): void => {
    handleClearFilters();
    scrollToSection('listings');
  };

  const showNewListings = (): void => {
    handleClearFilters();
    setNewOnly(true);
    scrollToSection('listings');
  };

  const showCityListings = (city: string): void => {
    handleClearFilters();
    handleSelectCity(city);
    setShowCitiesPanel(false);
    scrollToSection('listings');
  };

  // Filter listings
  const filteredListings = listings.filter((item) => {
    const loc = (item.location || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const price = Number(item.price) || 0;

    if (newOnly && !isNewListing(item)) return false;

    // City filter: either from selected checkboxes or heroCity
    const city = getListingCity(item).toLowerCase();
    const matchesCity = (c: string): boolean => loc.includes(c.toLowerCase()) || city === c.toLowerCase();
    if (selectedCities.length > 0) {
      if (!selectedCities.some(matchesCity)) return false;
    } else if (heroCity) {
      if (!matchesCity(heroCity)) return false;
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
      if (!matches && heroType === 'flat') {
        // Older listings used a separate "house" type
        matches = formType === 'house';
      }
      if (!matches && heroType === 'commercial') {
        matches = text.includes('shop') || text.includes('office') || text.includes('retail')
          || text.includes('showroom') || text.includes('warehouse');
      }
      if (!matches) return false;
    }

    // Category Tabs: all, sale, rent, buy, verified
    if (activeCategoryTab === 'verified') {
      if (Number(item.verified) !== 1) return false;
    } else if (activeCategoryTab !== 'all') {
      if (getListingDeal(item) !== activeCategoryTab) return false;
    }

    // Budget
    const min = parseFloat(budgetMin) || 0;
    const max = parseFloat(budgetMax) || Infinity;
    if (price < min || price > max) return false;

    return true;
  });

  // Back to the first page whenever the filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [newOnly, selectedCities, heroCity, heroKeyword, heroType, activeCategoryTab, budgetMin, budgetMax]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / LISTINGS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const pagedListings = filteredListings.slice((page - 1) * LISTINGS_PER_PAGE, page * LISTINGS_PER_PAGE);

  const goToPage = (next: number): void => {
    setCurrentPage(next);
    scrollToSection('listings');
  };

  const renderListingCard = (listing: Listing, asList = false) => {
    const imgSrc = getFirstImageUrl(listing);
    const priceStr = formatListingPrice(listing.price);
    const pType = listing.form_data?.propType || 'Property';

    return (
      <div
        key={listing.id}
        className="listing-card"
        style={asList ? { display: 'flex', flexDirection: 'row' } : {}}
      >
        <div
          className="card-img-wrap"
          style={{ ...cardImageBackdrop(imgSrc), ...(asList ? { width: '280px', flexShrink: 0 } : {}) }}
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
              onClick={() => onNavigate('listing-detail', listing)}
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
  };

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
                    value={typeInput || (allTypesPicked ? 'All Property Types' : '')}
                    onChange={handleTypeInputChange}
                    onFocus={(e) => { if (allTypesPicked) e.target.select(); setShowTypeSuggestions(true); }}
                    onKeyDown={handleTypeKeyDown}
                    autoComplete="off"
                  />
                  {heroType || allTypesPicked ? (
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
                    value={getBudgetLabel() || (anyBudgetPicked ? 'Any Budget' : '')}
                    readOnly
                  />
                  {(budgetMin || budgetMax || anyBudgetPicked) ? (
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
                        onClick={() => { setBudgetMin(''); setBudgetMax(''); setAnyBudgetPicked(true); setShowBudgetDropdown(false); }}
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
            <button type="button" className="metric-item metric-clickable" onClick={showAllListings} title="Show all active listings">
              <span className="metric-icon"><i className="fas fa-list-ul"></i></span>
              <div>
                <span className="metric-num">{activeListingsCount}</span>
                <div className="metric-label">Active Listings</div>
              </div>
            </button>
            <button type="button" className="metric-item metric-clickable" onClick={() => { handleClearFilters(); scrollToSection('featured'); }} title="Show featured listings">
              <span className="metric-icon"><i className="fas fa-star" style={{ color: 'rgb(245, 158, 11)' }}></i></span>
              <div>
                <span className="metric-num">{featuredCount}</span>
                <div className="metric-label">Featured Listings</div>
              </div>
            </button>
            <div className="metric-cities-wrap" ref={citiesPanelRef}>
              <button
                type="button"
                className="metric-item metric-clickable"
                onClick={() => setShowCitiesPanel((v) => !v)}
                title="Show cities covered"
                aria-expanded={showCitiesPanel}
              >
                <span className="metric-icon"><i className="fas fa-map-marker-alt"></i></span>
                <div>
                  <span className="metric-num">{citiesCoveredCount}</span>
                  <div className="metric-label">Cities Covered <i className="fas fa-chevron-down" style={{ fontSize: '9px' }}></i></div>
                </div>
              </button>
              {showCitiesPanel && (
                <ul className="metric-cities-panel">
                  {cityCounts.length === 0 ? (
                    <li className="metric-cities-empty">No cities yet</li>
                  ) : cityCounts.map((c) => (
                    <li key={c.name}>
                      <button type="button" onClick={() => showCityListings(c.name)}>
                        <span><i className="fas fa-map-marker-alt"></i> {c.name}</span>
                        <span className="metric-cities-count">{c.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" className="metric-item metric-clickable" onClick={showNewListings} title="Show listings posted today">
              <span className="metric-icon"><i className="fas fa-chart-line"></i></span>
              <div>
                <span className="metric-num">{newCount}</span>
                <div className="metric-label">New Today</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      {!hasActiveFilters && (
      <section className="featured-section" id="featured">
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

            <div className="carousel-viewport">
            {featuredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', width: '100%' }}>
                No featured listings yet
              </div>
            ) : (
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
                    <div className="card-img-wrap" style={cardImageBackdrop(imgSrc)}>
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
                          onClick={() => onNavigate('listing-detail', listing)}
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
            )}
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
        </div>
      </section>
      )}

      {/* Recent Listings Section */}
      {!hasActiveFilters && recentListings.length > 0 && (
      <section className="recent-section" id="recent">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>
                <i className="fas fa-clock" style={{ color: '#0d7a5f', marginRight: '8px' }}></i>
                Recent Listings
              </h2>
              <p>Latest properties posted on TradeCall</p>
            </div>
          </div>
          <div className="recent-grid">
            {recentListings.map((listing) => renderListingCard(listing))}
          </div>
        </div>
      </section>
      )}

      {/* Listings Section */}
      <section className="listings-section" id="listings">
        <div className="container">
          <div className="listings-main">
            <div className="listings-controls">
              <div className="listing-count" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span><strong>{filteredListings.length}</strong> listings found</span>
                {newOnly && (
                  <span className="listing-filter-chip">
                    New today
                    <button type="button" onClick={() => setNewOnly(false)} title="Show all listings">
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                )}
                {hasActiveFilters && (
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
                    className={`cat-tab ${activeCategoryTab === 'buy' ? 'active' : ''}`}
                    onClick={() => setActiveCategoryTab('buy')}
                  >
                    For Buy
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
                {pagedListings.map((listing) => renderListingCard(listing, viewType === 'list'))}
              </div>
            )}
            {!loading && !error && totalPages > 1 && (
              <div className="pagination">
                <button type="button" className="page-btn" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                  <i className="fas fa-chevron-left"></i> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`page-btn ${n === page ? 'active' : ''}`}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" className="page-btn" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
