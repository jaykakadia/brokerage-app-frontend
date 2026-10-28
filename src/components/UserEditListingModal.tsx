import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import ListingWizard from '../pages/post-listing/ListingWizard';
import type { ApiResponse, Listing } from '../types';

export interface UserEditListingModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSaved: (listing: Listing) => void;
}

export default function UserEditListingModal({ listing, onClose, onSaved }: UserEditListingModalProps) {
  const [fullListing, setFullListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listing?.id) {
      setFullListing(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setFullListing(null);

    api.get<ApiResponse<Listing>>(`/api/v1/listings/${listing.id}`)
      .then((res) => {
        if (!active) return;
        if (res.data?.status === 'success' && res.data.data) {
          setFullListing(res.data.data);
        } else {
          setError('Failed to load full listing details.');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(getApiErrorMessage(err, 'Failed to load listing details. Please try again.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listing?.id]);

  if (!listing) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="post-wrap" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 840, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-pen" style={{ color: '#0c6253', marginRight: 8 }}></i>
            Edit Listing {listing.id ? `#${listing.id}` : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#0c6253', marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Loading listing details...</div>
            </div>
          )}

          {!loading && error && (
            <div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && fullListing && (
            <ListingWizard
              key={fullListing.id}
              editListing={fullListing}
              singlePage
              onSaved={(saved) => {
                onSaved(saved);
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
