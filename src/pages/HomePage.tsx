import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { getWishlist, toggleWishlist, getApiErrorMessage, getListingStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cardImageBackdrop, formatListingPrice, getFirstImageUrl } from '../utils/formatters';
import { cityNameVariants, getBusinessCategories, getListingCity, getListingDeal, isBusinessListing, isNewListing, publicListingTitle } from '../utils/listingKind';
import { ALL_INDIAN_CITIES, POPULAR_BROWSE_CITIES, getCitySlug } from '../config/cities';
import ALL_CITIES_DATA from '../config/allCities.json';
import { setSeo } from '../utils/seo';
import { propTypeLabel } from './post-listing/propertyForm';
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

// Same types (values and labels) as "Select Property Type" in the Post Listing form.
const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: '', label: 'All Property Types', icon: 'fa-shapes' },
  { value: 'flat', label: 'Flat / Builder Floor', icon: 'fa-building' },
  { value: 'house', label: 'House / Villa', icon: 'fa-home' },
  { value: 'plot', label: 'Plot', icon: 'fa-vector-square' },
  { value: 'agriculture', label: 'Agriculture Land', icon: 'fa-seedling' },
  { value: 'industrial_land', label: 'Industrial Land', icon: 'fa-industry' },
  { value: 'r_zone_land', label: 'R - Zone Land', icon: 'fa-map' },
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
// Featured cards visible at once on desktop (matches the Recent Listings row)
const FEATURED_PER_VIEW = 4;

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

export default function HomePage({ activeCity, onCitySelect, onNavigate, onOpenAuth }: HomePageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [businesses, setBusinesses] = useState<Listing[]>([]);
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

  // Filter city suggestions based on user input - searches all 5,000+ Indian cities
  const citySuggestions = useMemo(() => {
    const q = cityInput.trim().toLowerCase();
    const all = ALL_CITIES_DATA as string[];
    if (!q) {
      return all.slice(0, 100);
    }
    return all.filter((name) => name.toLowerCase().includes(q)).slice(0, 100);
  }, [cityInput]);

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
    } else {
      setSelectedCities([val.trim()]);
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
      } else if (citySuggestions.length > 0) {
        const exact = citySuggestions.find((c) => c.toLowerCase() === cityInput.trim().toLowerCase());
        e.preventDefault();
        handleSelectCity(exact || citySuggestions[0]);
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
        const all = res.data.data;
        setListings(all.filter((l) => !isBusinessListing(l)));
        setBusinesses(all.filter(isBusinessListing));
      } else {
        setListings([]);
        setBusinesses([]);
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
  // Featured businesses promoted on TradeCall
  const featuredBusinesses = useMemo(() => businesses.filter((b) => b.is_featured), [businesses]);

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

  // Popular cities: list ONLY cities with at least 1 listing, sorted by listing count descending
  const sortedBrowseCities = useMemo(() => {
    if (cityCounts.length > 0) {
      const items: Array<{ name: string; slug: string; state: string; count: number }> = [];
      cityCounts.forEach((c) => {
        if (c.count <= 0) return;
        const slug = getCitySlug(c.name);
        if (!slug) return;
        const known = ALL_INDIAN_CITIES.find((ci) => ci.slug === slug);
        items.push({
          name: known?.name || c.name,
          slug,
          state: known?.state || '',
          count: c.count,
        });
      });
      return items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }

    // Baseline fallback before listings load (only active cities)
    return [
      { name: 'Palwal', slug: 'palwal', state: 'Haryana', count: 80 },
      { name: 'Faridabad', slug: 'faridabad', state: 'Haryana', count: 18 },
      { name: 'Hodal', slug: 'hodal', state: 'Haryana', count: 10 },
      { name: 'Greater Noida', slug: 'greater-noida', state: 'Uttar Pradesh', count: 5 },
      { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', count: 2 },
      { name: 'Delhi NCR', slug: 'delhi-ncr', state: 'Delhi', count: 2 },
    ];
  }, [cityCounts]);

  // Ensure client-side setSeo is consistent with server: noindex for cities with 0 listings
  useEffect(() => {
    if (activeCity && !loading) {
      const slug = getCitySlug(activeCity);
      const variants = [
        activeCity.toLowerCase(),
        slug.toLowerCase(),
        ...(activeCity.toLowerCase() === 'bangalore' ? ['bengaluru'] : []),
        ...(activeCity.toLowerCase() === 'delhi ncr' ? ['delhi', 'new delhi', 'ncr'] : []),
        ...(activeCity.toLowerCase() === 'gurugram' ? ['gurgaon'] : []),
      ];
      const match = cityCounts.find((c) => {
        const lower = c.name.toLowerCase();
        return variants.some((v) => lower === v || lower.includes(v));
      });
      const count = match?.count ?? 0;
      setSeo({
        title: `Properties in ${activeCity} | Buy, Rent & Commercial | Tradecall`,
        description: count > 0
          ? `${count} properties for sale and rent in ${activeCity}. Explore verified flats, plots and houses with zero brokerage on TradeCall India.`
          : `Explore properties in ${activeCity}. Contact verified owners directly on TradeCall India.`,
        path: `/properties/${slug}`,
        noindex: count === 0,
      });
    }
  }, [activeCity, loading, cityCounts]);

  // Until the listings load, show the site-wide stats
  const listingsLoaded = !loading && !error;
  const activeListingsCount = listingsLoaded ? listings.length : (stats?.active_listings ?? 0);
  const activeUsersCount = stats && stats.registered_users > 0 ? `${stats.registered_users}+` : '70+';
  const citiesCoveredCount = listingsLoaded ? cityCounts.length : (stats?.cities_covered ?? 0);
  const newCount = listingsLoaded ? newListingsCount : 0;

  // Waits a frame so the filtered list has rendered before scrolling to it
  const scrollToSection = (id: string): void => {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
  };

  // Featured cards slide only when there are more than fit in one row; otherwise they sit still in one row
  const featuredSlides = featuredListings.length > FEATURED_PER_VIEW;

  // Circular carousel: triplicate list so after the last card, the first card appears seamlessly
  const circularListings = useMemo(() => {
    if (!featuredSlides) return featuredListings;
    return [...featuredListings, ...featuredListings, ...featuredListings];
  }, [featuredListings, featuredSlides]);

  // Start at the beginning of the middle clone
  useEffect(() => {
    setWithTransition(false);
    setCarouselIndex(featuredSlides ? featuredListings.length : 0);
  }, [featuredListings.length, featuredSlides]);

  // Once a slide has moved out of the middle clone, snap back into it without animation.
  // Timed rather than tied to transitionend, which never fires in a background tab and let the index run off into blank space.
  useEffect(() => {
    const n = featuredListings.length;
    if (!featuredSlides || (carouselIndex >= n && carouselIndex < 2 * n)) return;
    const id = window.setTimeout(() => {
      setWithTransition(false);
      setCarouselIndex((prev) => (((prev - n) % n) + n) % n + n);
    }, 500);
    return () => window.clearTimeout(id);
  }, [carouselIndex, featuredListings.length, featuredSlides]);

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
    if (!featuredSlides || isCarouselHovered || hasActiveFilters) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      setWithTransition(true);
      setCarouselIndex((prev) => prev + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [featuredSlides, isCarouselHovered, hasActiveFilters]);

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
    const title = publicListingTitle(item).toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const price = Number(item.price) || 0;

    if (newOnly && !isNewListing(item)) return false;

    // City filter: either from selected checkboxes or heroCity
    const city = getListingCity(item).toLowerCase();
    const matchesCity = (c: string): boolean => {
      const cLower = c.toLowerCase().trim();
      const variants = [
        cLower,
        ...(cLower === 'vrindavan' ? ['mathura-vrindavan', 'vrindaban', 'mathura'] : []),
        ...(cLower === 'mathura' ? ['mathura-vrindavan', 'vrindavan'] : []),
        ...(cLower === 'mathura-vrindavan' ? ['mathura', 'vrindavan'] : []),
        ...(cLower === 'delhi' ? ['delhi-ncr', 'ncr', 'new delhi'] : []),
        ...(cLower === 'delhi ncr' ? ['delhi', 'ncr', 'new delhi'] : []),
        ...(cLower === 'bangalore' ? ['bengaluru'] : []),
        ...(cLower === 'gurugram' ? ['gurgaon'] : []),
        ...(cLower === 'nuh' || cLower === 'mewat' || cLower === 'nuh mewat' ? ['nuh', 'mewat', 'nuh mewat'] : []),
        ...(cLower === 'ballabgarh' ? ['ballabhgarh'] : []),
        ...cityNameVariants(c).map((n) => n.toLowerCase()),
      ];
      return variants.some((needle) => loc.includes(needle) || city === needle || city.includes(needle));
    };
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
      const formType = (item.form_data?.propType || '').toLowerCase().trim();
      const target = heroType.toLowerCase().trim();

      let matches = false;
      if (formType) {
        if (formType === target) {
          matches = true;
        } else if (target === 'flat' && (formType === 'apartment' || formType === 'builder_floor')) {
          matches = true;
        } else if (target === 'house' && (formType === 'villa' || formType === 'kothi')) {
          matches = true;
        } else if (target === 'plot' && formType === 'plots') {
          matches = true;
        } else if (target === 'agriculture' && (formType === 'agricultural' || formType === 'farm_land')) {
          matches = true;
        } else if (target === 'industrial_land' && formType === 'industrial') {
          matches = true;
        } else if (target === 'r_zone_land' && (formType === 'r_zone' || formType === 'r-zone')) {
          matches = true;
        } else if (target === 'commercial' && ['shop', 'office', 'showroom', 'warehouse'].includes(formType)) {
          matches = true;
        } else if (target === 'pg' && formType === 'guest_house') {
          matches = true;
        }
      } else {
        // Fallback for legacy listings without form_data.propType using strict word boundaries on title
        if (target === 'flat') {
          matches = /\b(flat|apartment|builder\s+floor)\b/i.test(title);
        } else if (target === 'house') {
          matches = /\b(house|villa|villas|kothi|bungalow|duplex)\b/i.test(title);
        } else if (target === 'plot') {
          matches = /\b(plot|plots)\b/i.test(title);
        } else if (target === 'agriculture') {
          matches = /\b(agriculture|agricultural|khet|farm\s+land)\b/i.test(title);
        } else if (target === 'industrial_land') {
          matches = /\b(industrial)\b/i.test(title);
        } else if (target === 'r_zone_land') {
          matches = /\b(r[\s_-]?zone)\b/i.test(title);
        } else if (target === 'commercial') {
          matches = /\b(commercial|shop|showroom|warehouse|office)\b/i.test(title);
        } else if (target === 'pg') {
          matches = /\b(pg|guest\s+house)\b/i.test(title);
        }
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

  const openListing = (listing: Listing): void => {
    onNavigate('listing-detail', listing);
  };

  const listingCardProps = (listing: Listing): React.HTMLAttributes<HTMLDivElement> => ({
    role: 'link',
    tabIndex: 0,
    onClick: () => openListing(listing),
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openListing(listing);
      }
    }
  });

  const renderListingCard = (listing: Listing, asList = false) => {
    const imgSrc = getFirstImageUrl(listing);
    const priceStr = formatListingPrice(listing.price);
    const pType = propTypeLabel(listing.form_data?.propType || '') || 'Property';
    const title = publicListingTitle(listing);

    return (
      <div
        key={listing.id}
        className="listing-card"
        style={asList ? { display: 'flex', flexDirection: 'row' } : {}}
        {...listingCardProps(listing)}
      >
        <div
          className="card-img-wrap"
          style={{ ...cardImageBackdrop(imgSrc), ...(asList ? { width: '280px', flexShrink: 0 } : {}) }}
        >
          <img
            src={imgSrc}
            alt={title}
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
          <h3 className="card-title">{title}</h3>
          <div className="card-location">
            <i className="fas fa-map-marker-alt"></i>
            <span>{listing.location}</span>
          </div>
          <div className="card-features" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            Owner: <strong>{listing.owner_name}</strong> ({listing.owner_role || 'Owner'})
          </div>
          <div className="card-footer card-footer-actions">
            <button
              type="button"
              className="btn-view"
              onClick={(e) => { e.stopPropagation(); openListing(listing); }}
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

  const renderBusinessCard = (business: Listing) => {
    const imgSrc = getFirstImageUrl(business);
    const categories = getBusinessCategories(business);
    const categoryName: string = categories[0] || (typeof business.form_data?.categoryName === 'string' ? business.form_data.categoryName : '') || 'Business';
    const isSaved = wishlistIds.has(business.id);

    return (
      <div
        key={`business-${business.id}`}
        className="listing-card business-featured-card"
        {...listingCardProps(business)}
      >
        <div className="card-img-wrap" style={cardImageBackdrop(imgSrc)}>
          <img
            src={imgSrc}
            alt={business.title}
            className="card-img"
            onError={(e) => {
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/placeholder-property.svg';
            }}
          />
          {business.verified === 1 && (
            <span className="badge-verified">
              <i className="fas fa-check-circle"></i> Verified
            </span>
          )}
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
            <i className="fas fa-crown" style={{ color: '#fbbf24', fontSize: '10px' }}></i> Featured Business
          </span>

          <button
            type="button"
            onClick={(e) => void handleToggleWishlist(e, business.id)}
            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
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
              color: isSaved ? '#dc2626' : '#9ca3af',
              fontSize: '15px',
              zIndex: 2,
              transition: 'transform 0.15s ease'
            }}
          >
            <i className={isSaved ? 'fas fa-heart' : 'far fa-heart'}></i>
          </button>
        </div>

        <div className="card-body">
          <div
            className="card-price"
            style={{
              fontSize: '14px',
              color: '#0d7a5f',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'capitalize'
            }}
          >
            <i className="fas fa-store" style={{ fontSize: '12px', color: '#0d7a5f' }}></i>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {categoryName}
            </span>
          </div>
          <h3 className="card-title" title={business.title}>{business.title}</h3>
          <div className="card-location">
            <i className="fas fa-map-marker-alt"></i>
            <span>{business.location}</span>
          </div>
          <div className="card-features" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            Contact: <strong>{business.owner_name}</strong>
          </div>
          <div className="card-footer card-footer-actions">
            <button
              type="button"
              className="btn-view"
              onClick={(e) => { e.stopPropagation(); openListing(business); }}
            >
              <i className="fas fa-info-circle"></i> Details
            </button>
            <button
              type="button"
              className={`btn-wishlist ${isSaved ? 'active' : ''}`}
              onClick={(e) => void handleToggleWishlist(e, business.id)}
            >
              <i className={isSaved ? 'fas fa-heart' : 'far fa-heart'}></i>
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
          <h1>{activeCity ? `Properties in ${activeCity}` : 'Find Properties & Related Businesses'}</h1>

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
            <button
              type="button"
              className="metric-item metric-clickable"
              onClick={() => {
                if (!user && onOpenAuth) {
                  onOpenAuth({
                    title: 'Join TradeCall India',
                    subtitle: 'Create a free account to post properties or contact owners directly.',
                    icon: 'fa-users'
                  });
                } else if (onNavigate) {
                  onNavigate('about');
                }
              }}
              title="Active registered users on TradeCall India"
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

      {/* Popular Cities Section (Magicbricks style) */}
      {!hasActiveFilters && (
      <section className="popular-cities-section" id="popular-cities">
        <div className="container">
          <div className="section-header">
            <div>
              <h2>
                <i className="fas fa-city" style={{ color: '#0d7a5f', marginRight: '8px' }}></i>
                Explore Properties in Popular Cities
              </h2>
              <p>Verified residential and commercial properties with zero brokerage in top hubs</p>
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
            {POPULAR_BROWSE_CITIES.map((city) => {
              const cVariants = [
                city.name.toLowerCase(),
                city.slug.toLowerCase(),
                ...(city.name.toLowerCase() === 'ballabgarh' ? ['ballabhgarh'] : []),
              ];
              const count = cityCounts.find((c) => {
                const lower = c.name.toLowerCase();
                return cVariants.some((v) => lower === v || lower.includes(v));
              })?.count;

              return (
                <a
                  key={city.slug}
                  href={`/properties/${city.slug}`}
                  className="city-browse-card"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', city.slug);
                  }}
                >
                  <span className="city-browse-name">
                    <i className="fas fa-map-marker-alt" style={{ color: '#0d7a5f', fontSize: '12px' }}></i>
                    {city.name}
                  </span>
                  <span className="city-browse-state">{city.state}</span>
                  {count !== undefined && count > 0 ? (
                    <span className="city-browse-count">{count} {count === 1 ? 'listing' : 'listings'}</span>
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
            {featuredSlides && (
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
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280', width: '100%' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '12px' }}></i>
                <div>Loading featured listings...</div>
              </div>
            ) : featuredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', width: '100%' }}>
                No featured listings yet
              </div>
            ) : (
            <div
              className={`carousel-track ${featuredSlides ? '' : 'static'}`}
              id="carouselTrack"
              style={featuredSlides ? {
                // One step = one card plus the gap; the track's 4px side padding is taken off its width
                transform: `translateX(calc(${-carouselIndex} * (100% + 12px) / var(--per-view)))`,
                transition: withTransition ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
              } : undefined}
            >
              {circularListings.map((listing, index) => {
                const imgSrc = getFirstImageUrl(listing);
                const priceStr = formatListingPrice(listing.price);
                const pType = propTypeLabel(listing.form_data?.propType || '') || 'Plot';
                const title = publicListingTitle(listing);
                const isSaved = wishlistIds.has(listing.id);

                return (
                  <div
                    key={`featured-${listing.id}-${index}`}
                    className="listing-card featured-card"
                    {...listingCardProps(listing)}
                  >
                    <div className="card-img-wrap" style={cardImageBackdrop(imgSrc)}>
                      <img
                        src={imgSrc}
                        alt={title}
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
                      <h3 className="card-title">{title}</h3>
                      <div className="card-location">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{listing.location}</span>
                      </div>
                      <div className="card-features" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                        Owner: <strong>{listing.owner_name}</strong> ({listing.owner_role || 'Owner'})
                      </div>
                      <div className="card-footer card-footer-actions">
                        <button
                          type="button"
                          className="btn-view"
                          onClick={(e) => { e.stopPropagation(); openListing(listing); }}
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

            {featuredSlides && (
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

      {/* TC Favourite Businesses Section */}
      {!hasActiveFilters && featuredBusinesses.length > 0 && (
      <section className="recent-section tc-favourite-businesses-section" id="favourite-businesses">
        <div className="container">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2>
                <i className="fas fa-crown" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                TC Favourite Businesses
              </h2>
              <p>Handpicked &amp; featured local businesses on TradeCall</p>
            </div>
            <button
              type="button"
              className="btn-outline-green"
              onClick={() => onNavigate('business-directory')}
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              Explore Business Directory <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="recent-grid">
            {featuredBusinesses.slice(0, 4).map((business) => renderBusinessCard(business))}
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
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  Recent Listings
                </span>
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
                  padding: '50px 24px',
                  color: '#6b7280',
                  fontSize: '16px',
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1'
                }}
              >
                <i className="fas fa-city" style={{ fontSize: '36px', color: '#0d7a5f', marginBottom: '14px', display: 'block' }}></i>
                {activeCity ? (
                  <div>
                    <h3 style={{ fontSize: '20px', color: '#1e293b', fontWeight: 700, marginBottom: '8px' }}>
                      Currently 0 active listings in {activeCity}
                    </h3>
                    <p style={{ color: '#64748b', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                      Be the first owner or agent to list in {activeCity}! You can also explore verified properties in nearby active cities:
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
                      {sortedBrowseCities.slice(0, 6).map((c) => (
                        <a
                          key={c.slug}
                          href={`/properties/${c.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate('properties-city', c.slug);
                          }}
                          style={{
                            padding: '8px 16px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#0c6253',
                            borderRadius: '20px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '13px'
                          }}
                        >
                          Properties in {c.name} ({c.count})
                        </a>
                      ))}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => onNavigate('post-listing')}
                        className="btn-primary"
                        style={{ padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 700 }}
                      >
                        <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
                        Post Free Listing in {activeCity}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    No listings matching your selected filters. Try broadening your search or{' '}
                    <a
                      href="#post"
                      onClick={(e) => { e.preventDefault(); onNavigate('post-listing'); }}
                      style={{ color: '#0c6253', fontWeight: 'bold' }}
                    >
                      post a new listing!
                    </a>
                  </div>
                )}
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
                {getPaginationItems(page, totalPages).map((item, idx) =>
                  item === '...' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      style={{
                        padding: '6px 8px',
                        color: '#9ca3af',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
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
          </div>
        </div>
      </section>
    </div>
  );
}
