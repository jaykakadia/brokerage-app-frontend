import type { Listing } from '../types';

/** Business listings (posted via the Business Owner form) belong only in the Business Directory. */
export const isBusinessListing = (listing: Pick<Listing, 'form_data'>): boolean =>
  listing.form_data?.kind === 'business';

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
