import React, { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ApiResponse, MessageResponse } from '../types';
import type { ListingReviewsData, Review } from '../types/review';

interface ListingReviewsProps {
  listingId: number;
  isOwner?: boolean;
  onRequireAuth?: () => void;
  onReviewsLoaded?: (data: ListingReviewsData) => void;
}

export default function ListingReviews({
  listingId,
  isOwner = false,
  onRequireAuth,
  onReviewsLoaded,
}: ListingReviewsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ListingReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await api.get<ApiResponse<ListingReviewsData>>(
        `/api/v1/listings/${listingId}/reviews`
      );
      if (res.data?.data) {
        setData(res.data.data);
        onReviewsLoaded?.(res.data.data);
        if (res.data.data.user_review) {
          setRating(res.data.data.user_review.rating);
          setComment(res.data.data.user_review.comment || '');
        }
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      void fetchReviews();
    }
  }, [listingId, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMsg('Please select a rating between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post<ApiResponse<Review>>(
        `/api/v1/listings/${listingId}/reviews`,
        {
          rating,
          comment: comment.trim() || undefined,
        }
      );
      setSuccessMsg(res.data?.message || 'Review submitted successfully!');
      setShowForm(false);
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Failed to submit review.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMyReview = async () => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await api.delete<MessageResponse>(`/api/v1/listings/${listingId}/reviews/me`);
      setSuccessMsg('Your review has been removed.');
      setComment('');
      setRating(5);
      setShowForm(false);
      await fetchReviews();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Failed to delete review.'));
    }
  };

  const renderStars = (score: number, size = 16) => {
    const full = Math.floor(score);
    const hasHalf = score - full >= 0.3 && score - full <= 0.7;
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= full) {
        stars.push(<i key={i} className="fas fa-star" style={{ color: '#f59e0b', fontSize: `${size}px` }}></i>);
      } else if (i === full + 1 && hasHalf) {
        stars.push(<i key={i} className="fas fa-star-half-alt" style={{ color: '#f59e0b', fontSize: `${size}px` }}></i>);
      } else {
        stars.push(<i key={i} className="far fa-star" style={{ color: '#d1d5db', fontSize: `${size}px` }}></i>);
      }
    }
    return stars;
  };

  return (
    <div className="listing-reviews-root" style={{ marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>
            Ratings & Reviews
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Verified customer ratings and testimonials
          </p>
        </div>

        {!isOwner && (
          <div>
            {!user ? (
              <button
                type="button"
                onClick={onRequireAuth}
                className="btn-view"
                style={{ fontSize: '13px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-sign-in-alt"></i> Sign in to Review
              </button>
            ) : !data?.user_review ? (
              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="btn-contact"
                style={{ fontSize: '13px', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-pen"></i> {showForm ? 'Cancel' : 'Write a Review'}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i>
          {errorMsg}
        </div>
      )}

      {/* User's existing review box if already submitted */}
      {user && data?.user_review && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>Your Review</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background:
                    data.user_review.status === 'approved'
                      ? '#dcfce7'
                      : data.user_review.status === 'rejected'
                      ? '#fee2e2'
                      : '#fef3c7',
                  color:
                    data.user_review.status === 'approved'
                      ? '#166534'
                      : data.user_review.status === 'rejected'
                      ? '#991b1b'
                      : '#92400e',
                }}
              >
                {data.user_review.status === 'approved'
                  ? '✓ Approved'
                  : data.user_review.status === 'rejected'
                  ? '✕ Rejected'
                  : '⏳ Pending Approval'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                style={{ background: 'none', border: 'none', color: '#0c6253', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                <i className="fas fa-edit"></i> {showForm ? 'Close Edit' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={handleDeleteMyReview}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            {renderStars(data.user_review.rating, 14)}
          </div>
          {data.user_review.comment && (
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
              "{data.user_review.comment}"
            </p>
          )}
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
            {data?.user_review ? 'Update Your Review' : 'Rate Your Experience'}
          </h4>

          {/* Star Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Your Rating (1 to 5 Stars):
            </label>
            <div style={{ display: 'flex', gap: '8px', cursor: 'pointer' }} onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', outline: 'none' }}
                >
                  <i
                    className={(hoverRating || rating) >= star ? 'fas fa-star' : 'far fa-star'}
                    style={{
                      fontSize: '26px',
                      color: (hoverRating || rating) >= star ? '#f59e0b' : '#cbd5e1',
                      transition: 'color 0.15s ease',
                    }}
                  ></i>
                </button>
              ))}
              <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: 700, color: '#1e293b', alignSelf: 'center' }}>
                {hoverRating || rating} / 5
              </span>
            </div>
          </div>

          {/* Comment Box */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Your Feedback (Optional):
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about dealing with this business or property..."
              maxLength={2000}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-view"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-contact"
              style={{ padding: '8px 20px', fontSize: '13px' }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading ratings & reviews...
        </div>
      ) : data && data.total_reviews > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '24px',
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          {/* Big Score Box */}
          <div style={{ textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>
              {data.average_rating.toFixed(1)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', margin: '8px 0 4px 0' }}>
              {renderStars(data.average_rating, 16)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {data.total_reviews} verified {data.total_reviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Breakdown Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = data.distribution[String(stars)] || 0;
              const pct = data.total_reviews > 0 ? Math.round((count / data.total_reviews) * 100) : 0;
              return (
                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                  <span style={{ width: '20px', textAlign: 'right', fontWeight: 600 }}>{stars}★</span>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
                  </div>
                  <span style={{ width: '32px', textAlign: 'right', fontWeight: 600 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', color: '#f59e0b', marginBottom: '6px' }}>
            <i className="far fa-star"></i>
          </div>
          <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>
            No reviews published yet
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Be the first to share your rating and review for this listing!
          </p>
        </div>
      )}

      {/* Approved Reviews List */}
      {data && data.reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.reviews.map((rev) => {
            const initial = (rev.user_name || 'U').charAt(0).toUpperCase();
            const dateStr = new Date(rev.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={rev.id}
                style={{
                  padding: '16px',
                  background: '#fff',
                  border: '1px solid #f1f5f9',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#0c6253',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {initial}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                        {rev.user_name || 'Verified User'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{dateStr}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '2px' }}>{renderStars(rev.rating, 13)}</div>
                </div>

                {rev.comment && (
                  <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                    {rev.comment}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
