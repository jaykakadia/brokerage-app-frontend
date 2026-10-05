import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import ListingWizard from '../pages/post-listing/ListingWizard';
import type { Listing } from '../types';

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
  const [status, setStatus] = useState('pending');
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(listing?.status || 'pending');
    setError(null);
  }, [listing]);

  if (!listing) return null;

  const changeStatus = async (next: string): Promise<void> => {
    const previous = status;
    setStatus(next);
    setStatusSaving(true);
    setError(null);
    try {
      await api.post(`/api/v1/listings/${listing.id}/status`, { action: statusAction(next) });
      onSaved(`Listing #${listing.id} marked ${next}`);
    } catch (err: unknown) {
      setStatus(previous);
      setError(getApiErrorMessage(err, 'Failed to update status.'));
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
            Edit Listing #{listing.id}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              aria-label="Listing status"
              value={status}
              disabled={statusSaving}
              onChange={(e) => { void changeStatus(e.target.value); }}
              style={{ padding: '8px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 700, textTransform: 'capitalize', background: STATUS_COLORS[status]?.bg, color: STATUS_COLORS[status]?.fg }}
            >
              {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="btn-outline" onClick={() => onViewPage(listing)} style={{ padding: '8px 12px', fontSize: 13 }}>
              <i className="fas fa-external-link-alt"></i> Open Page
            </button>
            <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
            Posted by <strong>{listing.owner_name}</strong>. Everything they submitted is below. Edit any field and click <strong>Save Changes</strong> at the bottom.
          </p>
          <ListingWizard
            key={listing.id}
            editListing={listing}
            singlePage
            allowTypeChange
            onSaved={() => {
              onSaved(`Listing #${listing.id} updated`);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
