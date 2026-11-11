import type { Listing } from '../types';
import { EMPTY_PROPERTY_FORM, listingTitle, type PropertyFormState } from '../pages/post-listing/propertyForm';

/** Business listings (posted via the Business Owner form) belong only in the Business Directory. */
export const isBusinessListing = (listing: Pick<Listing, 'form_data'> & { kind?: string | null }): boolean =>
  listing.kind === 'business' || listing.form_data?.kind === 'business';

/** Splits comma-joined category strings ("Real Estate Agent, Property Dealer") into separate, de-duplicated names. */
const splitCategoryNames = (names: string[]): string[] => {
  const seen = new Set<string>();
  return names
    .flatMap((n) => String(n || '').split(','))
    .map((n) => n.trim())
    .filter((n) => {
      const key = n.toLowerCase();
      if (!n || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/**
 * Categories a business picked, one entry per category, in the order chosen.
 * Listing cards send them as one comma-joined `category_name`; older listings saved one comma list in form_data.
 */
export const getBusinessCategories = (listing: Pick<Listing, 'form_data'> & { categories?: string[]; category_name?: string | null }): string[] => {
  if (Array.isArray(listing.categories) && listing.categories.length) return splitCategoryNames(listing.categories);
  if (listing.category_name) return splitCategoryNames([listing.category_name]);
  const data = listing.form_data || {};
  const selected = Array.isArray(data.selectedCategories) ? data.selectedCategories as Array<{ name?: string }> : [];
  const categories = selected.map((c) => c.name || '');
  if (!categories.some(Boolean) && typeof data.categoryName === 'string') categories.push(data.categoryName);
  return splitCategoryNames(categories);
};

export const getPrimaryBusinessCategory = (listing: Pick<Listing, 'form_data'> & { categories?: string[]; category_name?: string | null }): string => {
  if (typeof listing.category_name === 'string' && listing.category_name.trim()) {
    const first = listing.category_name.split(',')[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(listing.categories) && listing.categories.length) {
    const first = listing.categories[0];
    if (first) {
      const split = first.split(',')[0]?.trim();
      if (split) return split;
    }
  }
  const data = listing.form_data || {};
  const selected = Array.isArray(data.selectedCategories) ? data.selectedCategories as Array<{ name?: string }> : [];
  if (selected.length && selected[0]?.name?.trim()) {
    return selected[0].name.trim();
  }
  if (typeof data.categoryName === 'string' && data.categoryName.trim()) {
    const first = data.categoryName.split(',')[0]?.trim();
    if (first) return first;
  }
  return '';
};

/** Business mobile number (if available). */
export const getBusinessMobile = (listing: Pick<Listing, 'form_data' | 'owner_phone'> & { mobile?: string | null }): string => {
  if (typeof listing.mobile === 'string' && listing.mobile.trim()) {
    return listing.mobile.trim();
  }
  const fdMobile = listing.form_data?.mobile;
  if (typeof fdMobile === 'string' && fdMobile.trim()) {
    return fdMobile.trim();
  }
  if (typeof listing.owner_phone === 'string' && listing.owner_phone.trim()) {
    return listing.owner_phone.trim();
  }
  return '';
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
export const getListingCity = (listing: Pick<Listing, 'form_data' | 'location'> & { city?: string }): string => {
  if (listing.city) return String(listing.city).trim();
  const fromForm = listing.form_data?.city ? String(listing.form_data.city).trim() : '';
  if (fromForm) return fromForm;
  const parts = (listing.location || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length >= 3 ? parts[parts.length - 2] : parts[0];
};

/**
 * Names a city label should match. "Bengaluru (Bangalore)" matches Bengaluru, Bangalore, and the full label.
 */
export const cityNameVariants = (label: string): string[] => {
  const full = label.trim();
  const parts = [full];
  const alias = full.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (alias) parts.push(alias[1].trim(), alias[2].trim());
  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
export const getListingDeal = (listing: Pick<Listing, 'form_data' | 'description'> & { deal?: string | null }): ListingDeal => {
  if (listing.deal) {
    const d = listing.deal.toLowerCase();
    if (d.includes('rent') || d.includes('lease')) return 'rent';
    if (d.includes('buy')) return 'buy';
    return 'sale';
  }
  const fd = listing.form_data || {};
  const legacy = String(fd.forWhat || fd.listingType || fd.purpose || '').toLowerCase();
  const wantsRent = legacy.includes('rent') || legacy.includes('lease');
  if (fd.kind === 'buyer') return wantsRent ? 'rent' : 'buy';
  if (wantsRent) return 'rent';
  if (legacy.includes('buy')) return 'buy';
  if ((listing.description || '').toLowerCase().includes('[listing_type: rent]')) return 'rent';
  return 'sale';
};

const AREA_FIELDS: Record<string, Array<[string, string]>> = {
  plot: [['plotArea', 'plotUnit']],
  agriculture: [['agriArea', 'agriUnit']],
  industrial_land: [['agriArea', 'agriUnit']],
  r_zone_land: [['agriArea', 'agriUnit']],
  flat: [['area', 'unit']],
  house: [['area', 'unit']],
  commercial: [['totalArea', 'totalUnit'], ['builtArea', 'builtUnit']]
};

/** Size of a property listing as entered in the post-listing form, e.g. "180 Sq.Yd"; '' when not given. */
export const listingAreaLabel = (fd: Listing['form_data']): string => {
  if (!fd || fd.kind === 'business') return '';
  const defaults = EMPTY_PROPERTY_FORM as unknown as Record<string, string>;
  for (const [areaKey, unitKey] of AREA_FIELDS[String(fd.propType || '')] || []) {
    const area = String(fd[areaKey] ?? '').trim();
    if (!area || !(Number(area.replace(/,/g, '')) > 0)) continue;
    const unit = String(fd[unitKey] || defaults[unitKey] || '').trim();
    return unit ? `${area} ${unit}` : '';
  }
  return '';
};

/** Puts the area at the front of a title ("180 Sq.Yd Plot for Sale in ..."), unless the title already states it. */
const withAreaPrefix = (title: string, area: string, isBuyer: boolean): string => {
  if (!area || !title) return title;
  const amount = area.split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(^|[^\\d.])${amount}\\s*[a-z]`, 'i').test(title)) return title;
  if (isBuyer) {
    const looking = /^(Looking (?:to Buy|for Rent|for))\s+/i;
    if (looking.test(title)) return title.replace(looking, `$1 ${area} `);
  }
  return `${area} ${title}`;
};

export const publicListingTitle = (listing: Pick<Listing, 'title' | 'form_data'>): string => {
  const fd = listing.form_data;
  return withAreaPrefix(baseListingTitle(listing), listingAreaLabel(fd), fd?.kind === 'buyer');
};

const baseListingTitle = (listing: Pick<Listing, 'title' | 'form_data'>): string => {
  const fd = listing.form_data;
  if (fd?.kind !== 'buyer') {
    let t = (listing.title || '').replace(/\bLooking to Rent\b/gi, 'Looking for Rent');
    t = t.replace(/\bCommercial for Sale\b/gi, 'Commercial Property for Sale');
    t = t.replace(/\bCommercial for Rent\b/gi, 'Commercial Property for Rent');
    t = t.replace(/\b\d+\s*BHK\+?\s+(Agriculture(?:\s+Land)?)\b/gi, 'Agriculture Land');
    t = t.replace(/\b\d+\s*BHK\+?\s+(Plot)\b/gi, 'Plot');
    t = t.replace(/\b\d+\s*BHK\+?\s+(Commercial(?:\s+Property)?)\b/gi, 'Commercial Property');
    t = t.replace(/\b\d+\s*BHK\+?\s+(Industrial(?:\s+Land)?)\b/gi, 'Industrial Land');
    // Fix "in Near / in Next To / in Opp." → "- Near / - Next To / - Opp."
    t = t.replace(/\bin ((?:near|next to|opp\.?|opposite|behind|beside|adj\.?|adjacent)\b)/gi, '- $1');
    return t;
  }
  const saved = fd as Partial<PropertyFormState>;
  return listingTitle(
    {
      ...EMPTY_PROPERTY_FORM,
      ...saved,
      price: saved.price != null ? String(saved.price) : EMPTY_PROPERTY_FORM.price
    },
    true
  );
};
