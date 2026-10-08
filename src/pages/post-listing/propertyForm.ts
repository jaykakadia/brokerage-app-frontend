import { normalizeExternalUrl } from '../../utils/url';

export type ListingRole = 'business' | 'buyer' | 'owner';
export type PosterRole = 'real_owner' | 'real_buyer' | 'agent' | 'builder';
export type ListingFor = 'sale' | 'rent';
export type PropertyStep = 1 | 2 | 3 | 4;
export type PropType = 'flat' | 'house' | 'plot' | 'agriculture' | 'commercial' | 'pg';

export interface CityOption {
  city: string;
  state: string;
}

export interface PropertyFormState {
  name: string;
  businessName: string;
  mobile: string;
  whatsapp: string;
  sameAsMobile: boolean;
  email: string;
  facebookUrl: string;
  websiteUrl: string;
  xUrl: string;
  youtubeUrl: string;
  posterRole: PosterRole;
  forWhat: ListingFor;
  propType: PropType | '';
  city: string;
  state: string;
  locality: string;
  refCode: string;
  refSearch: string;
  society: string;
  bhk: string;
  bath: string;
  area: string;
  unit: string;
  furnish: string;
  plotArea: string;
  plotUnit: string;
  agriArea: string;
  agriUnit: string;
  frontRoad: 'Yes' | 'No';
  roadWidth: string;
  totalArea: string;
  totalUnit: string;
  builtArea: string;
  builtUnit: string;
  possession: string;
  frontRoadFt: string;
  pgName: string;
  totalBeds: string;
  pgFor: string;
  pgFurnish: string;
  commonAreas: string;
  pgMeals: string;
  pgRoomType: string;
  rate: string;
  amenities: string[];
  price: string;
  facing: string;
  description: string;
}

export const EMPTY_PROPERTY_FORM: PropertyFormState = {
  name: '',
  businessName: '',
  mobile: '',
  whatsapp: '',
  sameAsMobile: true,
  email: '',
  facebookUrl: '',
  websiteUrl: '',
  xUrl: '',
  youtubeUrl: '',
  posterRole: 'real_owner',
  forWhat: 'sale',
  propType: '',
  city: '',
  state: '',
  locality: '',
  refCode: '',
  refSearch: '',
  society: '',
  bhk: '2BHK',
  bath: '2',
  area: '',
  unit: 'Sq.Ft',
  furnish: 'Semi-Furnished',
  plotArea: '',
  plotUnit: 'Sq.Yd',
  agriArea: '',
  agriUnit: 'Acre',
  frontRoad: 'No',
  roadWidth: '',
  totalArea: '',
  totalUnit: 'Sq.Ft',
  builtArea: '',
  builtUnit: 'Sq.Ft',
  possession: '',
  frontRoadFt: '',
  pgName: '',
  totalBeds: '',
  pgFor: 'Boys',
  pgFurnish: 'Furnished',
  commonAreas: '',
  pgMeals: 'Yes',
  pgRoomType: 'Single',
  rate: '',
  amenities: [],
  price: '',
  facing: 'East',
  description: ''
};

const STATE_BY_CITY: Record<string, string> = {
  Palwal: 'Haryana',
  Faridabad: 'Haryana',
  Gurugram: 'Haryana',
  Sonipat: 'Haryana',
  Panipat: 'Haryana',
  Hodal: 'Haryana',
  Delhi: 'Delhi',
  Noida: 'Uttar Pradesh'
};

export const FALLBACK_CITIES: CityOption[] = Object.entries(STATE_BY_CITY).map(([city, state]) => ({ city, state }));

export function stateForCity(city: string, known: CityOption[]): string {
  const match = known.find((item) => item.city === city);
  if (match?.state) return match.state;
  return STATE_BY_CITY[city] || '';
}

export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function formatInr(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3);
  if (!rest) return last;
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last}`;
}

const RESIDENTIAL_AMENITIES = [
  'Lift', 'Power Backup', 'Car Parking', 'Gated Security', 'CCTV', '24x7 Water Supply',
  'Gas Pipeline', 'Park / Garden', "Children's Play Area", 'Gym', 'Swimming Pool', 'Club House',
  'Modular Kitchen', 'Air Conditioning', 'Wi-Fi'
] as const;

const COMMERCIAL_AMENITIES = [
  'Lift', 'Power Backup', 'Parking', 'Security', 'CCTV', 'Fire Safety', 'Washroom',
  '24x7 Water Supply', 'Air Conditioning', 'Cafeteria / Food Court', 'Wi-Fi', 'Loading / Unloading Area'
] as const;

const PG_AMENITIES = [
  'Wi-Fi', 'Air Conditioning', 'Attached Bathroom', 'Geyser', 'Laundry', 'Housekeeping',
  'Power Backup', 'RO Water', 'TV', 'Fridge', 'Wardrobe', 'Study Table', 'CCTV', 'Security', 'Parking'
] as const;

/** Amenity choices for a property type. Plot and agriculture land have none. */
export function amenitiesFor(propType: PropType | ''): readonly string[] {
  if (propType === 'flat' || propType === 'house') return RESIDENTIAL_AMENITIES;
  if (propType === 'commercial') return COMMERCIAL_AMENITIES;
  if (propType === 'pg') return PG_AMENITIES;
  return [];
}

export function propTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    flat: 'Flat/Builder Floor/House/Villa',
    house: 'House/Villa',
    plot: 'Plot',
    agriculture: 'Agriculture Land',
    commercial: 'Commercial',
    pg: 'PG/Guest House'
  };
  return labels[value] || 'Property';
}

export function listingTitle(form: PropertyFormState, isBuyer = false): string {
  const place = [form.locality, form.city].filter(Boolean).join(', ');
  const rooms = form.propType === 'flat' || form.propType === 'house' ? `${form.bhk} ` : '';
  const label = propTypeLabel(form.propType);
  const title = isBuyer
    // Buyer listings ask for a property, e.g. "Looking to Buy Plot in Sector-12, Palwal"
    ? `Looking to ${form.forWhat === 'rent' ? 'Rent' : 'Buy'} ${rooms}${label === 'Commercial' ? 'Commercial Property' : label}`
    : `${rooms}${label} ${form.forWhat === 'rent' ? 'for Rent' : 'for Sale'}`;
  return `${title}${place ? ` in ${place}` : ''}`.replace(/\s+/g, ' ').trim();
}

export function canonicalPosterRole(role: PosterRole): 'Owner' | 'Agent' | 'Builder' {
  if (role === 'agent') return 'Agent';
  if (role === 'builder') return 'Builder';
  return 'Owner';
}

export function validatePropertyStep(form: PropertyFormState, step: PropertyStep): string | null {
  if (step === 1) {
    if (!form.name.trim()) return 'Please enter Your Name';
    if (!/^\d{10}$/.test(form.mobile)) return 'Enter a valid 10-digit Mobile Number';
    if (!form.sameAsMobile && form.whatsapp && !/^\d{10}$/.test(form.whatsapp)) return 'Enter a valid 10-digit WhatsApp Number';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid Email ID';
    const badLink = socialLinkError(form);
    if (badLink) return badLink;
  }
  if (step === 2) {
    if (!form.propType) return 'Please select a Property Type';
    if (!form.city) return 'Please select a City';
    if (!form.state.trim()) return 'State is missing. Pick a city that has a state.';
  }
  if (step === 3) {
    if (propertyPriceNumber(form) <= 0) return 'Please enter Price/Budget';
  }
  return null;
}

const SOCIAL_LINK_LABELS = { websiteUrl: 'Website', facebookUrl: 'Facebook', xUrl: 'X', youtubeUrl: 'YouTube' } as const;
type SocialLinkState = Record<keyof typeof SOCIAL_LINK_LABELS, string>;

/** Returns an error message for the first invalid social link, or null when all are blank or valid. */
export function socialLinkError(form: SocialLinkState): string | null {
  for (const key of Object.keys(SOCIAL_LINK_LABELS) as Array<keyof SocialLinkState>) {
    if (normalizeExternalUrl(form[key]) === null) return `Enter a valid ${SOCIAL_LINK_LABELS[key]} link`;
  }
  return null;
}

/** Canonical https:// form of each social link, for saving with the listing. */
export function normalizedSocialLinks(form: SocialLinkState): SocialLinkState {
  return {
    facebookUrl: normalizeExternalUrl(form.facebookUrl) || '',
    websiteUrl: normalizeExternalUrl(form.websiteUrl) || '',
    xUrl: normalizeExternalUrl(form.xUrl) || '',
    youtubeUrl: normalizeExternalUrl(form.youtubeUrl) || ''
  };
}

/** Contact + social defaults taken from the signed-in user's profile. */
export function profileContactDefaults(user: { phone?: string | null; whatsapp?: string | null; facebook_url?: string | null; website_url?: string | null; x_url?: string | null; youtube_url?: string | null }) {
  const mobile = digitsOnly(user.phone || '', 10);
  const whatsapp = digitsOnly(user.whatsapp || '', 10);
  const sameAsMobile = !whatsapp || whatsapp === mobile;
  return {
    mobile,
    whatsapp: sameAsMobile ? mobile : whatsapp,
    sameAsMobile,
    facebookUrl: user.facebook_url || '',
    websiteUrl: user.website_url || '',
    xUrl: user.x_url || '',
    youtubeUrl: user.youtube_url || ''
  };
}

const inrNumber = (value: string): number => Number(value.replace(/[^\d]/g, '')) || 0;

/** Reads a rupee amount the Indian way, e.g. "1,25,00,000" -> "1.25 Crore". Empty below one thousand. */
export function inrInWords(value: string): string {
  const amount = inrNumber(value);
  const scales: [number, string][] = [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']];
  for (const [size, name] of scales) {
    if (amount >= size) return `${Number((amount / size).toFixed(2))} ${name}`;
  }
  return '';
}

/** Area and unit that a per-unit rate applies to, for property types priced as area x rate. */
export function landAreaFor(form: Pick<PropertyFormState, 'propType' | 'area' | 'unit' | 'plotArea' | 'plotUnit' | 'agriArea' | 'agriUnit'>): { area: number; unit: string } | null {
  if (form.propType === 'plot') return { area: Number(form.plotArea) || 0, unit: form.plotUnit };
  if (form.propType === 'agriculture') return { area: Number(form.agriArea) || 0, unit: form.agriUnit };
  return null;
}

/**
 * Applies a change to an area-priced form (plot, agriculture) and recalculates price = area x rate.
 * Leaves price alone when area or rate is missing, so a manually typed price survives.
 */
export function withAutoPrice(form: PropertyFormState, patch: Partial<PropertyFormState>): Partial<PropertyFormState> {
  const next = { ...form, ...patch };
  const land = landAreaFor(next);
  const rate = inrNumber(next.rate);
  if (!land || land.area <= 0 || rate <= 0) return patch;
  return { ...patch, price: formatInr(String(Math.round(land.area * rate))) };
}

export function propertyPriceNumber(form: PropertyFormState): number {
  return Number(form.price.replace(/\D/g, '')) || 0;
}
