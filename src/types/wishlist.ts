import { Listing } from './listing';

export interface WishlistItem {
  id: number;
  user_id: number;
  listing_id: number;
  created_at: string;
  listing?: Listing | null;
}

export interface ToggleWishlistResponse {
  status: 'success' | 'error' | string;
  wishlisted: boolean;
  listing_id: number;
  action?: 'added' | 'removed' | string;
}
