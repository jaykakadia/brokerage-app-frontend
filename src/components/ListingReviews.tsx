import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const MAX_REVIEW_IMAGES = 5;

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
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [keptImages, setKeptImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearNewFiles = () => {
    newPreviews.forEach((u) => URL.revokeObjectURL(u));
    setNewFiles([]);
    setNewPreviews([]);
  };

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
          setKeptImages(res.data.data.user_review.images || []);
        } else {
          setKeptImages([]);
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

  useEffect(() => {
    return () => {
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newPreviews]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    const available = MAX_REVIEW_IMAGES - keptImages.length - newFiles.length;
    if (available <= 0) {
      setErrorMsg(`You can attach up to ${MAX_REVIEW_IMAGES} images per review.`);
      return;
    }
    const picked = Array.from(files).slice(0, available);
    const urls = picked.map((f) => URL.createObjectURL(f));
    setNewFiles((prev) => [...prev, ...picked]);
    setNewPreviews((prev) => [...prev, ...urls]);
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
      const fd = new FormData();
      fd.append('rating', String(rating));
      if (comment.trim()) fd.append('comment', comment.trim());
      fd.append('keep_images', JSON.stringify(keptImages));
      newFiles.forEach((f) => fd.append('files', f));

      const res = await api.post<ApiResponse<Review>>(
        `/api/v1/listings/${listingId}/reviews`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setSuccessMsg(res.data?.message || 'Review submitted successfully!');
      setShowForm(false);
      clearNewFiles();
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
      setKeptImages([]);
      clearNewFiles();
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

  const customerPhotos = useMemo(() => {
    if (!data?.reviews) return [];
    const list: Array<{ url: string; rating: number; userName: string }> = [];
    data.reviews.forEach((rev) => {
      (rev.images || []).forEach((url) => {
        list.push({ url, rating: rev.rating, userName: rev.user_name || 'Verified User' });
      });
    });
    return list;
  }, [data?.reviews]);

  const visibleReviews = useMemo(() => {
    if (!data?.reviews) return [];
    if (!starFilter) return data.reviews;
    return data.reviews.filter((r) => r.rating === starFilter);
  }, [data?.reviews, starFilter]);

  const totalImagesCount = keptImages.length + newFiles.length;

  return (
    <div className="listing-reviews-root">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading ratings & reviews...
        </div>
      ) : (
        <div className="listing-reviews-grid">
          {/* LEFT COLUMN: Overall Reviews & Breakdown (Amazon / Flipkart style FIRST) */}
          <div className="listing-reviews-summary">
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Customer reviews
            </h3>

            {data && data.total_reviews > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>{renderStars(data.average_rating, 18)}</div>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {data.average_rating.toFixed(1)} out of 5
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                  {data.total_reviews} {data.total_reviews === 1 ? 'verified rating' : 'verified ratings'}
                </div>

                {/* Clickable 5-1 Star Distribution Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = data.distribution[String(stars)] || 0;
                    const pct = data.total_reviews > 0 ? Math.round((count / data.total_reviews) * 100) : 0;
                    const active = starFilter === stars;
                    return (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setStarFilter(active ? null : stars)}
                        title={`Filter ${stars} star reviews`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '46px 1fr 40px',
                          alignItems: 'center',
                          gap: '10px',
                          background: active ? '#f0fdf4' : 'transparent',
                          border: active ? '1px solid #0c6253' : '1px solid transparent',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{ color: '#0c6253', fontWeight: 600 }}>{stars} star</span>
                        <div style={{ height: '16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', transition: 'width 0.2s ease' }}></div>
                        </div>
                        <span style={{ textAlign: 'right', color: '#0c6253', fontWeight: 600 }}>{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 16px 0' }}>
                No customer ratings yet. Be the first to review!
              </p>
            )}

            {!isOwner && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Review this listing
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>
                  Share your experience and photos with other customers
                </p>
                {!user ? (
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="btn-view"
                    style={{ width: '100%', fontSize: '13.5px', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-sign-in-alt"></i> Sign in to write a review
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(!showForm);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="btn-view"
                    style={{
                      width: '100%',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      padding: '9px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    {showForm ? 'Cancel' : data?.user_review ? 'Edit your review' : 'Write a review'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Photos Gallery, Form, User Review & Top Reviews */}
          <div style={{ minWidth: 0 }}>
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

            {/* Review Submission / Edit Form */}
            {showForm && (
              <form onSubmit={handleSubmit} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px', marginBottom: '22px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                  {data?.user_review ? 'Update Your Review' : 'Write a Customer Review'}
                </h4>

                {/* Star Picker */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Overall rating:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', cursor: 'pointer' }} onMouseLeave={() => setHoverRating(0)}>
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
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Add a written review:
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like or dislike about this property or business?"
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

                {/* Photo Upload */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Add photos (optional, up to {MAX_REVIEW_IMAGES}):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    {keptImages.map((url, i) => (
                      <div key={`kept-${i}`} style={{ position: 'relative', width: '68px', height: '68px' }}>
                        <img src={url} alt={`Review ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        <button
                          type="button"
                          onClick={() => setKeptImages((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove photo"
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {newPreviews.map((url, i) => (
                      <div key={`new-${i}`} style={{ position: 'relative', width: '68px', height: '68px' }}>
                        <img src={url} alt={`Upload preview ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #0c6253' }} />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(url);
                            setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
                            setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                          aria-label="Remove photo"
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {totalImagesCount < MAX_REVIEW_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '8px',
                          border: '1.5px dashed #94a3b8',
                          background: '#fff',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-camera" style={{ fontSize: '16px', color: '#0c6253' }}></i>
                        Add
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                  </div>
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

            {/* User's existing review box if already submitted */}
            {user && data?.user_review && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
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

                  <div style={{ display: 'flex', gap: '10px' }}>
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
                    {data.user_review.comment}
                  </p>
                )}
                {data.user_review.images && data.user_review.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {data.user_review.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Your review photo ${i + 1}`}
                        onClick={() => setLightboxImg(img)}
                        style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customer Photos Gallery (Amazon-style strip) */}
            {customerPhotos.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                  Customer photos ({customerPhotos.length})
                </h4>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {customerPhotos.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxImg(item.url)}
                      style={{ position: 'relative', flex: '0 0 92px', height: '92px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                    >
                      <img src={item.url} alt={`Customer photo by ${item.userName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(15, 23, 42, 0.72)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <i className="fas fa-star" style={{ color: '#f59e0b', fontSize: '10px' }}></i>
                        {item.rating}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Reviews Header + Star Filter Chip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {starFilter ? `${starFilter}-star reviews (${visibleReviews.length})` : 'Top reviews'}
              </h4>
              {starFilter && (
                <button
                  type="button"
                  onClick={() => setStarFilter(null)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, color: '#0c6253', cursor: 'pointer' }}
                >
                  Show all ratings ✕
                </button>
              )}
            </div>

            {/* Approved Reviews List */}
            {visibleReviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {visibleReviews.map((rev) => {
                  const initial = (rev.user_name || 'U').charAt(0).toUpperCase();
                  const dateStr = new Date(rev.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={rev.id}
                      style={{
                        paddingBottom: '16px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: '#0c6253',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {initial}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                          {rev.user_name || 'Verified User'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>{renderStars(rev.rating, 13)}</div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0c6253' }}>Verified User</span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                        Reviewed on {dateStr}
                      </div>

                      {rev.comment && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#334155', lineHeight: 1.55 }}>
                          {rev.comment}
                        </p>
                      )}

                      {rev.images && rev.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                          {rev.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`Review photo ${i + 1}`}
                              onClick={() => setLightboxImg(img)}
                              style={{ width: '74px', height: '74px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 16px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                {starFilter
                  ? `No ${starFilter}-star reviews yet.`
                  : 'No reviews published yet. Be the first to share your experience!'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-size Photo Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img
            src={lightboxImg}
            alt="Review photo full size"
            style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
          />
        </div>
      )}
    </div>
  );
}
