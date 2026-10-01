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
  email: string;
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
  price: string;
  facing: string;
  description: string;
}

export const EMPTY_PROPERTY_FORM: PropertyFormState = {
  name: '',
  businessName: '',
  mobile: '',
  email: '',
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

export function propTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    flat: 'Flat/Builder Floor',
    house: 'House/Villa',
    plot: 'Plot',
    agriculture: 'Agriculture Land',
    commercial: 'Commercial',
    pg: 'PG/Guest House'
  };
  return labels[value] || 'Property';
}

export function listingTitle(form: PropertyFormState): string {
  const purpose = form.forWhat === 'rent' ? 'for Rent' : 'for Sale';
  const place = [form.locality, form.city].filter(Boolean).join(', ');
  const rooms = form.propType === 'flat' || form.propType === 'house' ? `${form.bhk} ` : '';
  return `${rooms}${propTypeLabel(form.propType)} ${purpose}${place ? ` in ${place}` : ''}`.replace(/\s+/g, ' ').trim();
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
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid Email ID';
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

export function propertyPriceNumber(form: PropertyFormState): number {
  return Number(form.price.replace(/\D/g, '')) || 0;
}
