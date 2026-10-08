import type { Listing } from '../types';

/** Business listings (posted via the Business Owner form) belong only in the Business Directory. */
export const isBusinessListing = (listing: Pick<Listing, 'form_data'>): boolean =>
  listing.form_data?.kind === 'business';

/** Categories a business picked, in the order chosen (older listings saved them as one comma list). */
export const getBusinessCategories = (listing: Pick<Listing, 'form_data'>): string[] => {
  const data = listing.form_data || {};
  const selected = Array.isArray(data.selectedCategories) ? data.selectedCategories as Array<{ name?: string }> : [];
  const categories = selected.map((c) => c.name || '').filter(Boolean);
  if (!categories.length && typeof data.categoryName === 'string' && data.categoryName) {
    categories.push(...data.categoryName.split(',').map((c) => c.trim()).filter(Boolean));
  }
  return categories;
};

/**
 * Description to show on a listing page. Business listings save a summary block (categories, address,
 * contact…) as the description, which the page already shows elsewhere; only the owner's own text is shown.
 */
export const getListingDescription = (listing: Pick<Listing, 'form_data' | 'description'>): string => {
  if (!isBusinessListing(listing)) return listing.description || '';
  const own = listing.form_data?.description;
  if (typeof own === 'string') return own.trim();
  return listing.description?.match(/^Description: ([\s\S]*)$/m)?.[1].trim() ?? '';
};

/**
 * City of a listing: the wizard's city field, else the city part of a "Locality, City, State" location.
 * Keeps "Palwal", "Palwal, Haryana" and "Omaxe City, Palwal, Haryana" counted as one city.
 */
export const getListingCity = (listing: Pick<Listing, 'form_data' | 'location'>): string => {
  const fromForm = listing.form_data?.city ? String(listing.form_data.city).trim() : '';
  if (fromForm) return fromForm;
  const parts = (listing.location || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length >= 3 ? parts[parts.length - 2] : parts[0];
};

/** Listings posted today. */
export const isNewListing = (listing: Pick<Listing, 'created_at'>): boolean => {
  if (!listing.created_at) return false;
  const created = new Date(listing.created_at);
  return !Number.isNaN(created.getTime()) && created.toDateString() === new Date().toDateString();
};

export type ListingDeal = 'sale' | 'rent' | 'buy';

/**
 * What a property listing is for: sale, rent, or a buyer's purchase requirement.
 * A buyer looking to rent is rent, same as an owner listing a rental.
 * Wizard listings store `kind` + `forWhat`; older ones used `listingType`/`purpose` or a description tag.
 */
export const getListingDeal = (listing: Pick<Listing, 'form_data' | 'description'>): ListingDeal => {
  const fd = listing.form_data || {};
  const legacy = String(fd.forWhat || fd.listingType || fd.purpose || '').toLowerCase();
  const wantsRent = legacy.includes('rent') || legacy.includes('lease');
  if (fd.kind === 'buyer') return wantsRent ? 'rent' : 'buy';
  if (wantsRent) return 'rent';
  if (legacy.includes('buy')) return 'buy';
  if ((listing.description || '').toLowerCase().includes('[listing_type: rent]')) return 'rent';
  return 'sale';
};
