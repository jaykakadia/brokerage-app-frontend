import { getImageUrl } from '../services/api';
import type { Listing } from '../types';

export const formatListingPrice = (raw: number | string | null | undefined): string => {
  if (raw == null || raw === '') return 'Price on request';
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return '₹ ' + String(raw);

  if (num >= 10000000) {
    const cr = num / 10000000;
    const crStr = cr.toFixed(2).replace(/\.?0+$/, '');
    return `₹ ${crStr} Cr`;
  }
  if (num >= 100000) {
    const lac = num / 100000;
    const lacStr = Number.isInteger(lac) ? String(lac) : lac.toFixed(2).replace(/\.?0+$/, '');
    return `₹ ${lacStr} Lac`;
  }
  return '₹ ' + new Intl.NumberFormat('en-IN').format(Math.round(num));
};

export const getFirstImageUrl = (listing?: Partial<Listing> | null): string => {
  if (listing?.images && listing.images.length > 0 && listing.images[0].file_path) {
    return getImageUrl(listing.images[0].file_path);
  }
  return '/placeholder-property.svg';
};
