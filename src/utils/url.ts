import { getCityFromSlug } from '../config/cities';

export function slugify(text?: string | null): string {
  if (!text) return '';
  let s = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  s = s.replace(/panchwati-raod/g, 'panchwati-road')
       .replace(/palwal-nuh-roa(?=-|$)/g, 'palwal-nuh-road')
       .replace(/hospitcal/g, 'hospital');
  return s;
}

/**
 * Generates Justdial-style unique ID for listings/businesses, e.g. TC011P-12.
 * Always derived from the listing id: reference_code is the associate's code and
 * is shared by every listing that associate posts, so it cannot identify one.
 */
export function getListingUniqueId(listing: { id: number | string }): string {
  return `TC011P-${listing.id}`;
}

/** True when a listing URL id is an old associate-code link (e.g. KPSKC6) rather than a listing id. */
export function isLegacyListingCode(id: string | number | null): boolean {
  if (id === null) return false;
  return !/^\d+$/.test(String(id).replace(/^(TC011P-|TC-)/i, ''));
}

/**
 * Generates Justdial-style URL path for property & business listings:
 * Format: /<City>/<Title-Locality-Slug>/<Unique-ID>
 * Example: /greater-noida/nectorflare-pvt-ltd-gaur-city-mall/TC011P-12
 */
export function getListingUrl(listing: {
  id: number | string;
  title?: string;
  location?: string;
  form_data?: any;
}): string {
  const city = slugify(listing.location?.split(',')[0] || listing.form_data?.city || 'NCR') || 'ncr';
  const title = slugify(listing.title) || 'property-listing';
  const uniqueId = getListingUniqueId(listing);
  return `/${city}/${title}/${uniqueId}`;
}

export interface ParsedRoute {
  page: string;
  param: string | number | null;
}

export function parseAppRoute(pathname: string, hash: string): ParsedRoute {
  // If a legacy hash exists, handle it
  if (hash && hash.length > 1) {
    const cleanHash = hash.replace(/^#\/?/, '');
    if (cleanHash.startsWith('listing/')) {
      return { page: 'listing-detail', param: cleanHash.replace('listing/', '') };
    }
    if (cleanHash.startsWith('blog/')) {
      return { page: 'blog-detail', param: cleanHash.replace('blog/', '') };
    }
    if (cleanHash === 'terms' || cleanHash === 'terms-of-use' || cleanHash.toLowerCase() === 'terms-of-use-tradecall-india') {
      return { page: 'terms', param: null };
    }
    if (cleanHash === 'privacy') {
      return { page: 'privacy', param: null };
    }
    if (['admin-login', 'admin-login.php'].includes(cleanHash.toLowerCase())) {
      return { page: 'admin-login', param: null };
    }
    if (['home', 'business-directory', 'advertise', 'blog', 'about', 'contact', 'post-listing', 'account', 'admin', 'login', 'faq'].includes(cleanHash)) {
      return { page: cleanHash, param: null };
    }
    if (cleanHash === 'faqs' || cleanHash === 'frequently-asked-questions') {
      return { page: 'faq', param: null };
    }
  }

  // Handle pathname
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'home' || cleanPath === 'index.html' || cleanPath === 'index.php') {
    return { page: 'home', param: null };
  }

  // Exact Terms of Use match
  if (cleanPath.toLowerCase() === 'terms-of-use' || cleanPath.toLowerCase() === 'terms-of-use-tradecall-india' || cleanPath.toLowerCase() === 'terms') {
    return { page: 'terms', param: null };
  }
  if (cleanPath.toLowerCase() === 'privacy' || cleanPath.toLowerCase() === 'privacy-policy') {
    return { page: 'privacy', param: null };
  }

  // Login & Register routes
  if (['login', 'login.php', 'signin'].includes(cleanPath.toLowerCase())) {
    return { page: 'login', param: 'signin' };
  }
  if (['register', 'signup'].includes(cleanPath.toLowerCase())) {
    return { page: 'login', param: 'register' };
  }
  if (['admin-login', 'admin-login.php'].includes(cleanPath.toLowerCase())) {
    return { page: 'admin-login', param: null };
  }

  // Direct single routes
  const singleRoutes: Record<string, string> = {
    'advertise': 'advertise',
    'business-directory': 'business-directory',
    'businesses': 'business-directory',
    'cities': 'cities',
    'all-cities': 'cities',
    'blog': 'blog',
    'about': 'about',
    'about-us': 'about',
    'contact': 'contact',
    'contact-us': 'contact',
    'post-listing': 'post-listing',
    'post-free': 'post-listing',
    'account': 'account',
    'admin': 'admin',
    'dashboard': 'admin',
    'faq': 'faq',
    'faqs': 'faq',
    'frequently-asked-questions': 'faq'
  };

  if (singleRoutes[cleanPath.toLowerCase()]) {
    return { page: singleRoutes[cleanPath.toLowerCase()], param: null };
  }

  const parts = cleanPath.split('/');

  // Properties by city: /properties/:city
  if (parts.length === 2 && (parts[0].toLowerCase() === 'properties' || parts[0].toLowerCase() === 'city')) {
    const citySlug = parts[1].toLowerCase();
    const resolvedCity = getCityFromSlug(citySlug);
    if (!resolvedCity) {
      return { page: 'not-found', param: citySlug };
    }
    return { page: 'properties-city', param: citySlug };
  }

  // Hindi Pilot Hub: /hi/properties/:city
  if (parts.length === 3 && parts[0].toLowerCase() === 'hi' && parts[1].toLowerCase() === 'properties') {
    const citySlug = parts[2].toLowerCase();
    const resolvedCity = getCityFromSlug(citySlug);
    if (!resolvedCity) {
      return { page: 'not-found', param: citySlug };
    }
    return { page: 'properties-city', param: citySlug };
  }

  // Sub-locality Hub: /:city/:locality (e.g. /palwal/omaxe-city-phase-ii)
  if (parts.length === 2 && getCityFromSlug(parts[0].toLowerCase())) {
    const citySlug = parts[0].toLowerCase();
    const localitySlug = parts[1].toLowerCase();
    return { page: 'properties-city', param: `${citySlug}/${localitySlug}` };
  }

  // Blog detail: /blog/:slug
  if (parts.length === 2 && parts[0].toLowerCase() === 'blog') {
    return { page: 'blog-detail', param: parts[1] };
  }

  // Legacy listing detail: /listing/:id
  if (parts.length === 2 && (parts[0].toLowerCase() === 'listing' || parts[0].toLowerCase() === 'property')) {
    return { page: 'listing-detail', param: parts[1] };
  }

  // Justdial style: /:city/:slug/:uniqueId (3 parts)
  if (parts.length === 3) {
    const uniqueId = parts[2];
    const isCode = uniqueId.toUpperCase().startsWith('TC011P-') || uniqueId.toUpperCase().startsWith('TC-') || /^\d+$/.test(uniqueId);
    if (isCode) {
      let resolvedId = uniqueId;
      if (uniqueId.toUpperCase().startsWith('TC011P-')) {
        resolvedId = uniqueId.substring(7);
      } else if (uniqueId.toUpperCase().startsWith('TC-')) {
        resolvedId = uniqueId.substring(3);
      }
      return { page: 'listing-detail', param: resolvedId };
    }
  }

  return { page: 'not-found', param: null };
}

/** Accepts "facebook.com/x" as well as full URLs; returns '' for blank input and null when invalid. */
export const normalizeExternalUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return '';
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
};
