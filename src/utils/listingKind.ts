import type { Listing } from '../types';

/** Business listings (posted via the Business Owner form) belong only in the Business Directory. */
export const isBusinessListing = (listing: Pick<Listing, 'form_data'>): boolean =>
  listing.form_data?.kind === 'business';
