/**
 * Central validation configuration and rules for TradeCall India frontend.
 * Matches backend app/core/validation_rules.py.
 */

// Hard rejection limits
export const INVALID_PRICE_MIN_SALE = 10000;        // ₹10,000 min for complete property sale
export const INVALID_PRICE_MIN_RENT = 500;          // ₹500 min for rent
export const INVALID_PRICE_MAX = 10000000000;       // ₹1,000 Crore hard ceiling

// Suspicious / Unusual limits (triggers warning / confirmation prompt)
export const UNUSUAL_RENT_HIGH = 500000;            // > ₹5 Lac/month rent
export const UNUSUAL_SALE_LOW = 50000;              // < ₹50,000 sale
export const UNUSUAL_RESIDENTIAL_SALE_HIGH = 500000000; // > ₹50 Crore residential
export const UNUSUAL_LAND_COMMERCIAL_HIGH = 1000000000; // > ₹100 Crore land/commercial

export const JUNK_LOCALITY_WORDS = new Set([
  'anywhere', 'all', 'any', 'none', 'n/a', 'na', 'null', 'nil',
  'test', 'testing', 'demo', 'unknown', 'xyz', 'asdf', 'random',
  'somewhere', 'everywhere', 'city', 'location', 'area'
]);

export const DISTANCE_PHRASE_REGEX = /\b(?:\d+[\s-]*(?:mtr|meter|metre|km|kilometer|feet|ft|mile)s?\s*(?:away|from|off)\b|(?:opposite|opp|behind|near|beside|adjacent)\s+(?:to\s+)?(?:the\s+)?(?:highway|station|metro|road|bus|expressway|stand)\b)/i;
export const PHONE_IN_LOCALITY_REGEX = /(?:\+?91[\s-]?)?[6-9]\d{9}\b|\b\d{10,}\b/;
export const URL_IN_LOCALITY_REGEX = /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|in|org|net|io|co|biz)\b/i;

const PRESERVED_ACRONYMS = new Set(['RPS', 'NH', 'BPTP', 'HUDA', 'Omaxe', 'SRS', 'VIP', 'TDI', 'NCR', 'DLF', 'BHK', 'PO']);

export function cleanAndNormalizeLocality(value?: string | null): string {
  if (!value) return '';
  const cleaned = value.replace(/[\s_\-]+/g, ' ').replace(/^[ ,.-;/]+|[ ,.-;/]+$/g, '');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((w) => {
      const upper = w.toUpperCase();
      if (PRESERVED_ACRONYMS.has(upper)) return upper;
      if (w.length > 1 && /^[A-Z]{2,4}$/.test(w)) return upper;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export function validateLocality(value?: string | null): { valid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { valid: false, error: 'Locality is required.' };
  }
  const raw = value.trim();
  const norm = cleanAndNormalizeLocality(raw);

  if (norm.length < 2) {
    return { valid: false, error: 'Locality name is too short.' };
  }
  if (norm.length > 60) {
    return { valid: false, error: 'Locality name cannot exceed 60 characters.' };
  }
  if (JUNK_LOCALITY_WORDS.has(norm.toLowerCase())) {
    return { valid: false, error: `'${raw}' is not a valid locality name. Please specify your sector or area.` };
  }
  if (URL_IN_LOCALITY_REGEX.test(raw)) {
    return { valid: false, error: 'Locality cannot contain URLs or web links.' };
  }
  if (PHONE_IN_LOCALITY_REGEX.test(raw)) {
    return { valid: false, error: 'Locality cannot contain phone numbers.' };
  }
  if (DISTANCE_PHRASE_REGEX.test(raw)) {
    return {
      valid: false,
      error: "Please provide a specific locality/sector name instead of distance phrases (e.g. use 'Sector 2' or 'Nahar Road' instead of '500 mtr away from highway')."
    };
  }
  return { valid: true };
}

export function validatePriceInput(
  price: number,
  forWhat: 'sale' | 'rent' = 'sale',
  propType: string = ''
): { valid: boolean; error?: string; suspicious: boolean; warning?: string } {
  if (!price || price <= 0) {
    return { valid: false, error: 'Price must be a positive number greater than zero.', suspicious: false };
  }
  if (price > INVALID_PRICE_MAX) {
    return { valid: false, error: 'Price exceeds maximum allowable limit of ₹1,000 Crore.', suspicious: false };
  }

  const isRent = forWhat === 'rent';
  const propLower = propType.toLowerCase();

  if (isRent) {
    if (price < INVALID_PRICE_MIN_RENT) {
      return { valid: false, error: `Rent must be at least ₹${INVALID_PRICE_MIN_RENT}/month.`, suspicious: false };
    }
    if (price > UNUSUAL_RENT_HIGH) {
      return {
        valid: true,
        suspicious: true,
        warning: `Monthly rent of ₹${price.toLocaleString('en-IN')} is unusually high. If this is a property sale, please select 'For Sale'.`
      };
    }
  } else {
    if (price < INVALID_PRICE_MIN_SALE) {
      return { valid: false, error: `Sale price must be at least ₹${INVALID_PRICE_MIN_SALE.toLocaleString('en-IN')}.`, suspicious: false };
    }
    if (price < UNUSUAL_SALE_LOW) {
      return {
        valid: true,
        suspicious: true,
        warning: `Sale price of ₹${price.toLocaleString('en-IN')} is unusually low. Please confirm this is the total property price and not a per-sq.ft rate.`
      };
    }
    const isLand = ['land', 'plot', 'agriculture', 'industrial', 'commercial'].some((t) => propLower.includes(t));
    if (isLand && price > UNUSUAL_LAND_COMMERCIAL_HIGH) {
      return {
        valid: true,
        suspicious: true,
        warning: `Property price of ₹${price.toLocaleString('en-IN')} (> ₹100 Crore) is exceptionally high. Please verify the amount.`
      };
    } else if (!isLand && price > UNUSUAL_RESIDENTIAL_SALE_HIGH) {
      return {
        valid: true,
        suspicious: true,
        warning: `Residential price of ₹${price.toLocaleString('en-IN')} (> ₹50 Crore) is exceptionally high. Please verify the amount.`
      };
    }
  }

  return { valid: true, suspicious: false };
}
