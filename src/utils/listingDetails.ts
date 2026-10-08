import type { ListingFormData } from '../types';
import { propTypeLabel } from '../pages/post-listing/propertyForm';

export interface KeyDetail {
  label: string;
  value: string;
}

const text = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};

const withUnit = (amount: unknown, unit: unknown): string => {
  const a = text(amount);
  return a ? `${a} ${text(unit)}`.trim() : '';
};

const POSTER_ROLE_LABELS: Record<string, string> = {
  real_owner: 'Owner',
  real_buyer: 'Buyer',
  agent: 'Agent',
  builder: 'Builder'
};

const frontRoadRows = (fd: ListingFormData): Array<[string, string]> => [
  ['Front Road', text(fd.frontRoad)],
  ['Road Width', fd.frontRoad === 'Yes' && text(fd.roadWidth) ? `${text(fd.roadWidth)} ft` : '']
];

// Fields shown per property type, mirroring what the post-listing wizard collects for that type.
function propertyTypeFields(fd: ListingFormData): Array<[string, string]> {
  switch (fd.propType) {
    case 'flat':
    case 'house':
      return [
        ['BHK', text(fd.bhk)],
        ['Bathroom', text(fd.bath)],
        ['Area', withUnit(fd.area, fd.unit)],
        ['Rate', fd.rate ? `₹${text(fd.rate)} / ${text(fd.unit)}` : ''],
        ['Furnish', text(fd.furnish)],
        ['Society', text(fd.society)],
        ...frontRoadRows(fd),
        ['Facing', text(fd.facing)]
      ];
    case 'plot':
      return [
        ['Plot Area', withUnit(fd.plotArea, fd.plotUnit)],
        ['Rate', fd.rate ? `₹${text(fd.rate)} / ${text(fd.plotUnit)}` : ''],
        ...frontRoadRows(fd),
        ['Facing', text(fd.facing)]
      ];
    case 'agriculture':
      return [
        ['Land Area', withUnit(fd.agriArea, fd.agriUnit)],
        ['Rate', fd.rate ? `₹${text(fd.rate)} / ${text(fd.agriUnit)}` : ''],
        ...frontRoadRows(fd),
        ['Facing', text(fd.facing)]
      ];
    case 'commercial':
      return [
        ['Total Area', withUnit(fd.totalArea, fd.totalUnit)],
        ['Built-up Area', withUnit(fd.builtArea, fd.builtUnit)],
        ['Possession', text(fd.possession)],
        // Older commercial listings stored a single "Front Road (Ft)" value
        ...(fd.frontRoadFt ? [['Front Road', `${text(fd.frontRoadFt)} ft`] as [string, string]] : frontRoadRows(fd)),
        ['Facing', text(fd.facing)]
      ];
    case 'pg':
      return [
        ['PG Name', text(fd.pgName)],
        ['Total Beds', text(fd.totalBeds)],
        ['PG For', text(fd.pgFor)],
        ['Room Type', text(fd.pgRoomType)],
        ['Furnish', text(fd.pgFurnish)],
        ['Meals', text(fd.pgMeals)],
        ['Common Areas', text(fd.commonAreas)],
        ...frontRoadRows(fd)
      ];
    default:
      return [];
  }
}

/** Builds the "Key Details" grid for a listing, skipping empty values and private contact fields. */
export function buildKeyDetails(fd: ListingFormData | null | undefined): KeyDetail[] {
  if (!fd) return [];
  let rows: Array<[string, string]>;

  if (fd.kind === 'business') {
    rows = [
      ['Category', text(fd.categoryName)],
      ['Address', [fd.plot, fd.building, fd.street].map(text).filter(Boolean).join(', ')],
      ['Landmark', text(fd.landmark)],
      ['Area', text(fd.area)],
      ['Pincode', text(fd.pincode)],
      ['City', text(fd.city)],
      ['State', text(fd.state)]
    ];
  } else if (fd.kind) {
    const forWhat = fd.kind === 'buyer'
      ? (fd.forWhat === 'rent' ? 'Rent/Lease' : 'Buy')
      : fd.forWhat === 'rent'
        ? 'Rent/Lease'
        : fd.forWhat === 'sale'
          ? 'Sale'
          : text(fd.forWhat);
    rows = [
      ['Property Type', fd.propType ? propTypeLabel(text(fd.propType)) : ''],
      ['For', forWhat],
      ['You Are', POSTER_ROLE_LABELS[text(fd.posterRole)] || text(fd.posterRole)],
      ...propertyTypeFields(fd),
      ['Locality', text(fd.locality)],
      ['City', text(fd.city)],
      ['State', text(fd.state)]
    ];
  } else {
    // Older listings saved before the wizard stored `kind`
    rows = [
      ['Property Type', text(fd.propType)],
      ['For', text(fd.listingType || fd.purpose)],
      ['BHK', text(fd.bhk || fd.bedrooms)],
      ['Bathroom', text(fd.bathrooms)],
      ['Area', withUnit(fd.area || fd.builtup_area, fd.unit || 'sq.ft.')],
      ['Furnish', text(fd.furnishing)],
      ['Facing', text(fd.facing)],
      ['Floor', fd.floor ? `${text(fd.floor)}${fd.total_floors ? ` of ${text(fd.total_floors)}` : ''}` : ''],
      ['City', text(fd.city)],
      ['State', text(fd.state)]
    ];
  }

  return rows.filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}
