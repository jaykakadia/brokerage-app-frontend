export function slugify(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generates Justdial-style unique ID for listings/businesses
 * e.g. TC011P-12 or uses existing reference_code if present
 */
export function getListingUniqueId(listing: { id: number | string; reference_code?: string | null }): string {
  if (listing.reference_code && listing.reference_code.trim()) {
    return listing.reference_code.trim().toUpperCase();
  }
  return `TC011P-${listing.id}`;
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
  reference_code?: string | null;
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
    if (cleanHash === 'terms' || cleanHash.toLowerCase() === 'terms-of-use-tradecall-india') {
      return { page: 'terms', param: null };
    }
    if (cleanHash === 'privacy') {
      return { page: 'privacy', param: null };
    }
    if (['home', 'advertise', 'blog', 'about', 'contact', 'post-listing', 'account', 'admin', 'login'].includes(cleanHash)) {
      return { page: cleanHash, param: null };
    }
  }

  // Handle pathname
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '');
  if (!cleanPath || cleanPath === 'home' || cleanPath === 'index.html' || cleanPath === 'index.php') {
    return { page: 'home', param: null };
  }

  // Exact Terms of Use match requested by client
  if (cleanPath.toLowerCase() === 'terms-of-use-tradecall-india' || cleanPath.toLowerCase() === 'terms') {
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

  // Direct single routes
  const singleRoutes: Record<string, string> = {
    'advertise': 'advertise',
    'blog': 'blog',
    'about': 'about',
    'about-us': 'about',
    'contact': 'contact',
    'contact-us': 'contact',
    'post-listing': 'post-listing',
    'post-free': 'post-listing',
    'account': 'account',
    'admin': 'admin'
  };

  if (singleRoutes[cleanPath.toLowerCase()]) {
    return { page: singleRoutes[cleanPath.toLowerCase()], param: null };
  }

  const parts = cleanPath.split('/');

  // Blog detail: /blog/:slug
  if (parts.length === 2 && parts[0].toLowerCase() === 'blog') {
    return { page: 'blog-detail', param: parts[1] };
  }

  // Legacy listing detail: /listing/:id
  if (parts.length === 2 && (parts[0].toLowerCase() === 'listing' || parts[0].toLowerCase() === 'property')) {
    return { page: 'listing-detail', param: parts[1] };
  }

  // Justdial style: /:city/:slug/:uniqueId (3 parts)
  if (parts.length >= 3) {
    const uniqueId = parts[parts.length - 1];
    let resolvedId = uniqueId;
    if (uniqueId.toUpperCase().startsWith('TC011P-')) {
      resolvedId = uniqueId.substring(7);
    } else if (uniqueId.toUpperCase().startsWith('TC-')) {
      resolvedId = uniqueId.substring(3);
    }
    return { page: 'listing-detail', param: resolvedId };
  }

  return { page: 'home', param: null };
}
