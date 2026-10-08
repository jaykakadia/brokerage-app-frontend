import ListingWizard from '../pages/post-listing/ListingWizard';
import type { Listing } from '../types';

export interface UserEditListingModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSaved: (listing: Listing) => void;
}

export default function UserEditListingModal({ listing, onClose, onSaved }: UserEditListingModalProps) {
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
            Edit Listing
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <ListingWizard
            key={listing.id}
            editListing={listing}
            singlePage
            onSaved={(saved) => {
              onSaved(saved);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
