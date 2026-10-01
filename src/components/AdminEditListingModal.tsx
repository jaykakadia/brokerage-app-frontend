import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
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

interface EditForm {
  title: string;
  location: string;
  price: string;
  owner_name: string;
  owner_role: string;
  reference_code: string;
  description: string;
  status: string;
}

const formFromListing = (l: Listing): EditForm => ({
  title: l.title || '',
  location: l.location || '',
  price: l.price != null ? String(l.price) : '',
  owner_name: l.owner_name || '',
  owner_role: l.owner_role || 'Owner',
  reference_code: l.reference_code || '',
  description: l.description || '',
  status: l.status || 'pending'
});

export interface AdminEditListingModalProps {
  listing: Listing | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onViewPage: (listing: Listing) => void;
}

export default function AdminEditListingModal({ listing, onClose, onSaved, onViewPage }: AdminEditListingModalProps) {
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(listing ? formFromListing(listing) : null);
    setError(null);
  }, [listing]);

  if (!listing || !form) return null;

  const set = (key: keyof EditForm, value: string): void => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Title is required.');
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setError('Enter a valid price.');

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('location', form.location.trim());
      fd.append('price', String(price));
      fd.append('owner_name', form.owner_name.trim());
      fd.append('owner_role', form.owner_role);
      fd.append('reference_code', form.reference_code.trim());
      fd.append('description', form.description);
      await api.patch(`/api/v1/listings/${listing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (form.status !== listing.status) {
        await api.post(`/api/v1/listings/${listing.id}/status`, { action: statusAction(form.status) });
      }
      onSaved(`Listing #${listing.id} updated`);
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update listing.'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-pen" style={{ color: '#0c6253', marginRight: 8 }}></i>
            Edit Listing #{listing.id}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={(e) => { void save(e); }} style={{ padding: 24 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Price (₹)</label>
              <input style={inputStyle} inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.]/g, ''))} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={{ ...inputStyle, background: STATUS_COLORS[form.status]?.bg, color: STATUS_COLORS[form.status]?.fg, fontWeight: 700, textTransform: 'capitalize' }}
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Owner Name</label>
              <input style={inputStyle} value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Owner Role</label>
              <select style={inputStyle} value={form.owner_role} onChange={(e) => set('owner_role', e.target.value)}>
                {['Owner', 'Agent', 'Builder', 'Admin'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Associate / Reference Code</label>
              <input style={inputStyle} value={form.reference_code} onChange={(e) => set('reference_code', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button type="button" className="btn-outline" onClick={() => onViewPage(listing)} style={{ padding: '10px 16px', fontSize: 13 }}>
              <i className="fas fa-external-link-alt"></i> Open Listing Page
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-outline" onClick={onClose} disabled={saving} style={{ padding: '10px 16px', fontSize: 13 }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '10px 20px', fontSize: 13 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
