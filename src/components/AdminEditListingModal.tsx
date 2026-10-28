import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import ListingWizard from '../pages/post-listing/ListingWizard';
import type { ApiResponse, Listing } from '../types';

export const LISTING_STATUSES = ['pending', 'approved', 'sold', 'rented', 'suspended', 'deleted'] as const;

/** The status endpoint takes an action verb; most match the status name, two don't. */
export const statusAction = (status: string): string =>
  status === 'approved' ? 'approve' : status === 'deleted' ? 'delete' : status;

export const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  approved: { bg: '#dcfce7', fg: '#166534' },
  sold: { bg: '#e0e7ff', fg: '#3730a3' },
  rented: { bg: '#e0f2fe', fg: '#075985' },
  suspended: { bg: '#ffedd5', fg: '#9a3412' },
  deleted: { bg: '#fee2e2', fg: '#991b1b' }
};

export interface AdminEditListingModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onViewPage: (listing: Listing) => void;
}

/** Admin edit: the same full form the user filled in when posting, pre-filled with everything they submitted. */
export default function AdminEditListingModal({ listing, onClose, onSaved, onViewPage }: AdminEditListingModalProps) {
  const [fullListing, setFullListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [status, setStatus] = useState('pending');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!listing?.id) {
      setFullListing(null);
      setLoading(false);
      setFetchError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setFetchError(null);
    setFullListing(null);
    setStatus(listing.status || 'pending');
    setStatusError(null);

    api.get<ApiResponse<Listing>>(`/api/v1/listings/${listing.id}`)
      .then((res) => {
        if (!active) return;
        if (res.data?.status === 'success' && res.data.data) {
          setFullListing(res.data.data);
          setStatus(res.data.data.status || 'pending');
        } else {
          setFetchError('Failed to load full listing details.');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFetchError(getApiErrorMessage(err, 'Failed to load listing details. Please try again.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listing?.id]);

  if (!listing) return null;

  const activeListing = fullListing || listing;

  const changeStatus = async (next: string): Promise<void> => {
    const previous = status;
    setStatus(next);
    setStatusSaving(true);
    setStatusError(null);
    try {
      await api.post(`/api/v1/listings/${activeListing.id}/status`, { action: statusAction(next) });
      onSaved(`Listing #${activeListing.id} marked ${next}`);
    } catch (err: unknown) {
      setStatus(previous);
      setStatusError(getApiErrorMessage(err, 'Failed to update status.'));
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="post-wrap" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 840, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px 0', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-pen" style={{ color: '#0c6253', marginRight: 8 }}></i>
            Edit Listing #{activeListing.id}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              aria-label="Listing status"
              value={status}
              disabled={statusSaving || loading}
              onChange={(e) => { void changeStatus(e.target.value); }}
              style={{ padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 700, textTransform: 'capitalize', background: STATUS_COLORS[status]?.bg, color: STATUS_COLORS[status]?.fg }}
            >
              {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="btn-outline" onClick={() => onViewPage(activeListing)} style={{ padding: '8px 12px', fontSize: 13 }}>
              <i className="fas fa-external-link-alt"></i> Open Page
            </button>
            <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {statusError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {statusError}
            </div>
          )}

          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#0c6253', marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Loading listing details...</div>
            </div>
          )}

          {!loading && fetchError && (
            <div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                {fetchError}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !fetchError && fullListing && (
            <>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
                Posted by <strong>{fullListing.owner_name}</strong>. Everything they submitted is below. Edit any field and click <strong>Save Changes</strong> at the bottom.
              </p>
              <ListingWizard
                key={fullListing.id}
                editListing={fullListing}
                singlePage
                allowTypeChange
                onSaved={() => {
                  onSaved(`Listing #${fullListing.id} updated`);
                  onClose();
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
