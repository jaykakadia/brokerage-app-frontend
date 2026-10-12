export interface CityInfo {
  name: string;
  slug: string;
  state: string;
  isTop?: boolean;
}

export const TOP_CITIES: CityInfo[] = [
  { name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', isTop: true },
  { name: 'Bangalore', slug: 'bangalore', state: 'Karnataka', isTop: true },
  { name: 'Pune', slug: 'pune', state: 'Maharashtra', isTop: true },
  { name: 'Delhi NCR', slug: 'delhi-ncr', state: 'Delhi', isTop: true },
  { name: 'Hyderabad', slug: 'hyderabad', state: 'Telangana', isTop: true },
  { name: 'Chennai', slug: 'chennai', state: 'Tamil Nadu', isTop: true },
  { name: 'Ahmedabad', slug: 'ahmedabad', state: 'Gujarat', isTop: true },
  { name: 'Kolkata', slug: 'kolkata', state: 'West Bengal', isTop: true },
];

export const ALL_INDIAN_CITIES: CityInfo[] = [
  // Top Metros & Capitals
  ...TOP_CITIES,
  // Haryana & NCR Corridor
  { name: 'Palwal', slug: 'palwal', state: 'Haryana' },
  { name: 'Faridabad', slug: 'faridabad', state: 'Haryana' },
  { name: 'Gurugram', slug: 'gurugram', state: 'Haryana' },
  { name: 'Sonipat', slug: 'sonipat', state: 'Haryana' },
  { name: 'Hodal', slug: 'hodal', state: 'Haryana' },
  { name: 'Hathin', slug: 'hathin', state: 'Haryana' },
  { name: 'Panipat', slug: 'panipat', state: 'Haryana' },
  { name: 'Karnal', slug: 'karnal', state: 'Haryana' },
  { name: 'Ambala', slug: 'ambala', state: 'Haryana' },
  { name: 'Rohtak', slug: 'rohtak', state: 'Haryana' },
  { name: 'Hisar', slug: 'hisar', state: 'Haryana' },
  { name: 'Panchkula', slug: 'panchkula', state: 'Haryana' },
  { name: 'Rewari', slug: 'rewari', state: 'Haryana' },
  { name: 'Noida', slug: 'noida', state: 'Uttar Pradesh' },
  { name: 'Greater Noida', slug: 'greater-noida', state: 'Uttar Pradesh' },
  { name: 'Ghaziabad', slug: 'ghaziabad', state: 'Uttar Pradesh' },

  // Uttar Pradesh
  { name: 'Lucknow', slug: 'lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur', slug: 'kanpur', state: 'Uttar Pradesh' },
  { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh' },
  { name: 'Agra', slug: 'agra', state: 'Uttar Pradesh' },
  { name: 'Prayagraj', slug: 'prayagraj', state: 'Uttar Pradesh' },
  { name: 'Meerut', slug: 'meerut', state: 'Uttar Pradesh' },
  { name: 'Aligarh', slug: 'aligarh', state: 'Uttar Pradesh' },
  { name: 'Moradabad', slug: 'moradabad', state: 'Uttar Pradesh' },
  { name: 'Gorakhpur', slug: 'gorakhpur', state: 'Uttar Pradesh' },
  { name: 'Hathras', slug: 'hathras', state: 'Uttar Pradesh' },

  // Maharashtra
  { name: 'Nagpur', slug: 'nagpur', state: 'Maharashtra' },
  { name: 'Thane', slug: 'thane', state: 'Maharashtra' },
  { name: 'Nashik', slug: 'nashik', state: 'Maharashtra' },
  { name: 'Navi Mumbai', slug: 'navi-mumbai', state: 'Maharashtra' },
  { name: 'Aurangabad', slug: 'aurangabad', state: 'Maharashtra' },
  { name: 'Solapur', slug: 'solapur', state: 'Maharashtra' },

  // Karnataka
  { name: 'Mysore', slug: 'mysore', state: 'Karnataka' },
  { name: 'Mangalore', slug: 'mangalore', state: 'Karnataka' },
  { name: 'Hubli', slug: 'hubli', state: 'Karnataka' },
  { name: 'Belgaum', slug: 'belgaum', state: 'Karnataka' },

  // Gujarat
  { name: 'Surat', slug: 'surat', state: 'Gujarat' },
  { name: 'Vadodara', slug: 'vadodara', state: 'Gujarat' },
  { name: 'Rajkot', slug: 'rajkot', state: 'Gujarat' },
  { name: 'Bhavnagar', slug: 'bhavnagar', state: 'Gujarat' },
  { name: 'Jamnagar', slug: 'jamnagar', state: 'Gujarat' },

  // Rajasthan
  { name: 'Jaipur', slug: 'jaipur', state: 'Rajasthan' },
  { name: 'Jodhpur', slug: 'jodhpur', state: 'Rajasthan' },
  { name: 'Kota', slug: 'kota', state: 'Rajasthan' },
  { name: 'Bikaner', slug: 'bikaner', state: 'Rajasthan' },
  { name: 'Ajmer', slug: 'ajmer', state: 'Rajasthan' },
  { name: 'Udaipur', slug: 'udaipur', state: 'Rajasthan' },

  // Punjab & Chandigarh
  { name: 'Chandigarh', slug: 'chandigarh', state: 'Chandigarh' },
  { name: 'Ludhiana', slug: 'ludhiana', state: 'Punjab' },
  { name: 'Amritsar', slug: 'amritsar', state: 'Punjab' },
  { name: 'Jalandhar', slug: 'jalandhar', state: 'Punjab' },

  // Madhya Pradesh
  { name: 'Bhopal', slug: 'bhopal', state: 'Madhya Pradesh' },
  { name: 'Indore', slug: 'indore', state: 'Madhya Pradesh' },
  { name: 'Gwalior', slug: 'gwalior', state: 'Madhya Pradesh' },
  { name: 'Jabalpur', slug: 'jabalpur', state: 'Madhya Pradesh' },
  { name: 'Ujjain', slug: 'ujjain', state: 'Madhya Pradesh' },

  // Tamil Nadu
  { name: 'Coimbatore', slug: 'coimbatore', state: 'Tamil Nadu' },
  { name: 'Madurai', slug: 'madurai', state: 'Tamil Nadu' },
  { name: 'Salem', slug: 'salem', state: 'Tamil Nadu' },

  // Kerala
  { name: 'Kochi', slug: 'kochi', state: 'Kerala' },
  { name: 'Thiruvananthapuram', slug: 'thiruvananthapuram', state: 'Kerala' },
  { name: 'Kozhikode', slug: 'kozhikode', state: 'Kerala' },

  // Andhra Pradesh & Telangana
  { name: 'Visakhapatnam', slug: 'visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Vijayawada', slug: 'vijayawada', state: 'Andhra Pradesh' },
  { name: 'Warangal', slug: 'warangal', state: 'Telangana' },

  // Bihar & Jharkhand
  { name: 'Patna', slug: 'patna', state: 'Bihar' },
  { name: 'Ranchi', slug: 'ranchi', state: 'Jharkhand' },
  { name: 'Jamshedpur', slug: 'jamshedpur', state: 'Jharkhand' },
  { name: 'Dhanbad', slug: 'dhanbad', state: 'Jharkhand' },

  // Odisha, West Bengal, Assam, Uttarakhand, Chhattisgarh
  { name: 'Bhubaneswar', slug: 'bhubaneswar', state: 'Odisha' },
  { name: 'Rourkela', slug: 'rourkela', state: 'Odisha' },
  { name: 'Siliguri', slug: 'siliguri', state: 'West Bengal' },
  { name: 'Guwahati', slug: 'guwahati', state: 'Assam' },
  { name: 'Dehradun', slug: 'dehradun', state: 'Uttarakhand' },
  { name: 'Raipur', slug: 'raipur', state: 'Chhattisgarh' },
];

/** Deduplicated list of cities by slug */
const CITY_MAP = new Map<string, CityInfo>();
ALL_INDIAN_CITIES.forEach((c) => {
  if (!CITY_MAP.has(c.slug)) {
    CITY_MAP.set(c.slug, c);
  }
});

// Aliases mapping for common names / variations
const ALIASES: Record<string, string> = {
  'bengaluru': 'bangalore',
  'bengaluru-bangalore': 'bangalore',
  'delhi': 'delhi-ncr',
  'ncr': 'delhi-ncr',
  'bombay': 'mumbai',
  'calcutta': 'kolkata',
  'madras': 'chennai',
  'gurgaon': 'gurugram',
  'allahabad': 'prayagraj',
};

/** Convert city display name into clean slug */
export function getCitySlug(cityName: string): string {
  if (!cityName) return '';
  const clean = cityName.trim().toLowerCase();
  if (/^bengaluru/i.test(clean) || /^bangalore/i.test(clean)) return 'bangalore';
  if (/^delhi(\s*ncr)?$/i.test(clean) || clean === 'ncr') return 'delhi-ncr';
  if (/^gurgaon$/i.test(clean)) return 'gurugram';

  const slug = clean
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return ALIASES[slug] || slug;
}

/** Resolve slug to proper Display City Name, or null if unknown */
export function getCityFromSlug(slug: string): string | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  const resolvedSlug = ALIASES[clean] || clean;

  const found = CITY_MAP.get(resolvedSlug);
  if (found) return found.name;

  return null;
}
