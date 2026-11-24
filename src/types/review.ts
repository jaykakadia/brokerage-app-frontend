export interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  user_name?: string | null;
  rating: number;
  comment?: string | null;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ListingReviewsData {
  average_rating: number;
  total_reviews: number;
  distribution: Record<string, number>;
  reviews: Review[];
  user_review?: Review | null;
}

export interface AdminReview extends Review {
  user_email?: string | null;
  user_phone?: string | null;
  listing_title?: string | null;
  listing_city?: string | null;
  listing_kind?: string | null;
}
