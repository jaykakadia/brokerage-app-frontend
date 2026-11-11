/**
 * Property-type landing pages: /properties/{city}/{type-slug} ("Plots in Palwal").
 * Slugs and names mirror the backend's app/core/type_hubs.py.
 */
export interface TypeHubDef {
  slug: string;
  /** Property type value used by the listing filter. */
  type: string;
  /** Reads naturally in "… in Palwal". */
  name: string;
}

export const TYPE_HUBS: TypeHubDef[] = [
  { slug: 'flats', type: 'flat', name: 'Flats' },
  { slug: 'houses-villas', type: 'house', name: 'Houses & Villas' },
  { slug: 'plots', type: 'plot', name: 'Plots' },
  { slug: 'agriculture-land', type: 'agriculture', name: 'Agriculture Land' },
  { slug: 'commercial-property', type: 'commercial', name: 'Commercial Property' },
  { slug: 'industrial-land', type: 'industrial_land', name: 'Industrial Land' }
];

export const getTypeHubBySlug = (slug?: string | null): TypeHubDef | undefined =>
  TYPE_HUBS.find((h) => h.slug === (slug || '').toLowerCase());

export const getTypeHubByType = (type?: string | null): TypeHubDef | undefined =>
  TYPE_HUBS.find((h) => h.type === type);

/** One row of GET /api/v1/listings/type-hubs: a hub with enough listings to link to. */
export interface TypeHubLink {
  city: string;
  city_slug: string;
  type: string;
  type_slug: string;
  name: string;
  count: number;
}

/** GET /api/v1/listings/type-hubs/{city}/{type}: what the hub page says, same text the server renders. */
export interface TypeHubData {
  city: string;
  city_slug: string;
  type: string;
  type_slug: string;
  name: string;
  deals: string;
  heading: string;
  path: string;
  title: string;
  description: string;
  total: number;
  indexable: boolean;
  intro: string;
  faqs: Array<{ question: string; answer: string }>;
  localities: Array<{ name: string; count: number; path: string | null }>;
  other_types: Array<{ label: string; count: number; path: string }>;
  other_cities: Array<{ label: string; count: number; path: string }>;
}

const TYPE_PARAM_PREFIX = 'type:';

/** Route param for a type hub, e.g. "palwal/type:plots" (a plain second part is a locality). */
export const typeHubParam = (citySlug: string, typeSlug: string): string => `${citySlug}/${TYPE_PARAM_PREFIX}${typeSlug}`;

/** Splits a properties-city route param into its city and either a locality or a property-type slug. */
export function parseCityParam(param: unknown): { citySlug: string; localitySlug: string; typeSlug: string } {
  const [citySlug = '', second = ''] = String(param ?? '').split('/');
  if (second.startsWith(TYPE_PARAM_PREFIX)) {
    return { citySlug, localitySlug: '', typeSlug: second.slice(TYPE_PARAM_PREFIX.length) };
  }
  return { citySlug, localitySlug: second, typeSlug: '' };
}
