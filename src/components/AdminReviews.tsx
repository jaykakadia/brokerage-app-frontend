import { useState, useEffect, useCallback } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import type { ApiResponse, MessageResponse } from '../types';
import type { AdminReview } from '../types/review';

interface AdminReviewsProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onCountsChange?: (count: number) => void;
}

const STATUS_TABS = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All Reviews' },
] as const;

export default function AdminReviews({ showToast, onCountsChange }: AdminReviewsProps) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit: 50,
      };
      if (tab !== 'all') {
        params.status = tab;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await api.get<ApiResponse<AdminReview[]>>('/api/v1/admin/reviews', { params });
      const items = res.data?.data || [];
      setReviews(items);

      // If viewing pending, report pending count to parent
      if (tab === 'pending') {
        onCountsChange?.(items.length);
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to load reviews.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, search, showToast, onCountsChange]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleUpdateStatus = async (reviewId: number, newStatus: 'approved' | 'rejected') => {
    setBusyId(reviewId);
    try {
      await api.patch<ApiResponse<AdminReview>>(`/api/v1/admin/reviews/${reviewId}/status`, {
        status: newStatus,
      });
      showToast(`Review #${reviewId} marked as ${newStatus}.`, 'success');
      await loadReviews();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to update review status.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete review #${reviewId}?`)) return;
    setBusyId(reviewId);
    try {
      await api.delete<MessageResponse>(`/api/v1/admin/reviews/${reviewId}`);
      showToast(`Review #${reviewId} deleted.`, 'success');
      await loadReviews();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to delete review.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const renderStars = (score: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={i <= score ? 'fas fa-star' : 'far fa-star'}
          style={{ color: i <= score ? '#f59e0b' : '#cbd5e1', fontSize: '13px' }}
        ></i>
      );
    }
    return stars;
  };

  return (
    <div className="admin-module">
      <div className="admin-module-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
          Customer Ratings & Reviews
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Moderate and manage reviews submitted by users across properties and business directory.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn-outline ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid',
              background: tab === t.key ? '#0c6253' : '#fff',
              color: tab === t.key ? '#fff' : '#374151',
              borderColor: tab === t.key ? '#0c6253' : '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          ></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, email, listing or review text..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginRight: '8px' }}></i> Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
          <i className="far fa-star" style={{ fontSize: '32px', color: '#9ca3af', marginBottom: '10px' }}></i>
          <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', fontWeight: 600 }}>
            No reviews found under "{tab}"
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>Rating</th>
                <th style={{ padding: '12px 16px' }}>Listing</th>
                <th style={{ padding: '12px 16px' }}>Reviewer</th>
                <th style={{ padding: '12px 16px' }}>Comment</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>{renderStars(r.rating)}</div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{r.rating} / 5</span>
                  </td>

                  <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.listing_title || `Listing #${r.listing_id}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      ID #{r.listing_id} {r.listing_city ? `· ${r.listing_city}` : ''}
                    </div>
                  </td>

                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{r.user_name || 'Verified User'}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{r.user_email || r.user_phone || `ID #${r.user_id}`}</div>
                  </td>

                  <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                    {r.comment ? (
                      <p style={{ margin: 0, color: '#374151', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        "{r.comment}"
                      </p>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Rating only (no comment)</span>
                    )}
                  </td>

                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background:
                          r.status === 'approved' ? '#dcfce7' : r.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color:
                          r.status === 'approved' ? '#166534' : r.status === 'rejected' ? '#991b1b' : '#92400e',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>

                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '12px' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {r.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r.id, 'approved')}
                          disabled={busyId === r.id}
                          title="Approve Review"
                          style={{
                            background: '#0c6253',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <i className="fas fa-check"></i> Approve
                        </button>
                      )}

                      {r.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(r.id, 'rejected')}
                          disabled={busyId === r.id}
                          title="Reject Review"
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <i className="fas fa-times"></i> Reject
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={busyId === r.id}
                        title="Delete Review"
                        style={{
                          background: '#f3f4f6',
                          color: '#dc2626',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
