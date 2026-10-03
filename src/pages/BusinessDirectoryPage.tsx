import { useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { cardImageBackdrop, getFirstImageUrl } from '../utils/formatters';
import { isBusinessListing } from '../utils/listingKind';
import { useContactUnlock } from '../hooks/useContactUnlock';
import type { AuthModalOptions } from './ListingDetailPage';
import type { Listing, NavigateFunction } from '../types';

export interface BusinessDirectoryPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: (options?: AuthModalOptions) => void;
}

interface BusinessInfo {
  categories: string[];
  city: string;
}

function businessInfo(listing: Listing): BusinessInfo {
  const data = listing.form_data || {};
  const selected = Array.isArray(data.selectedCategories) ? data.selectedCategories as Array<{ name?: string }> : [];
  const categories = selected.map((c) => c.name || '').filter(Boolean);
  if (!categories.length && typeof data.categoryName === 'string' && data.categoryName) {
    categories.push(...data.categoryName.split(',').map((c) => c.trim()).filter(Boolean));
  }
  return {
    categories,
    city: (typeof data.city === 'string' && data.city) || listing.location.split(',').pop()?.trim() || ''
  };
}

export default function BusinessDirectoryPage({ onNavigate, onOpenAuth }: BusinessDirectoryPageProps) {
  // Phone, WhatsApp and email stay locked until the visitor unlocks them (1 lead), as on property listings
  const contact = useContactUnlock(onOpenAuth);
  const [businesses, setBusinesses] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ status: string; data: Listing[] }>('/api/v1/listings', { params: { status: 'approved' } });
        setBusinesses((res.data?.data || []).filter(isBusinessListing));
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Unable to load businesses right now. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const categoryOptions = useMemo(
    () => [...new Set(businesses.flatMap((b) => businessInfo(b).categories))].sort(),
    [businesses]
  );
  const cityOptions = useMemo(
    () => [...new Set(businesses.map((b) => businessInfo(b).city).filter(Boolean))].sort(),
    [businesses]
  );

  const visible = businesses.filter((b) => {
    const info = businessInfo(b);
    if (category && !info.categories.includes(category)) return false;
    if (city && info.city !== city) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [b.title, b.location, b.description || '', ...info.categories].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasFilters = Boolean(search || category || city);

  return (
    <>
      <section className="page-hero green-hero">
        <div className="container">
          <h1><i className="fas fa-store"></i> Business Directory</h1>
          <p>Find trusted local businesses and services near you</p>
        </div>
      </section>

      <section style={{ background: '#f4f6f9', minHeight: '60vh', padding: '32px 0 48px' }}>
        <div className="container">
          <div className="business-dir-filters">
            <input
              type="text"
              placeholder="Search business name, category or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={() => onNavigate('post-listing')}>
              <i className="fas fa-plus"></i> List Your Business
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 14px' }}>
            <strong style={{ color: '#111827' }}>
              {loading ? 'Loading businesses...' : `${visible.length} ${visible.length === 1 ? 'business' : 'businesses'} found`}
            </strong>
            {hasFilters && (
              <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}
                onClick={() => { setSearch(''); setCategory(''); setCity(''); }}>
                <i className="fas fa-times"></i> Clear filters
              </button>
            )}
          </div>

          {contact.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, marginBottom: 14 }}>{contact.error}</div>
          )}
          {error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10 }}>{error}</div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253' }}></i>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280', background: '#fff', borderRadius: 14 }}>
              <i className="fas fa-store-slash fa-3x" style={{ color: '#cbd5e1', marginBottom: 14, display: 'block' }}></i>
              {hasFilters ? 'No businesses match your search.' : 'No businesses listed yet.'}
            </div>
          ) : (
            <div className="listings-grid">
              {visible.map((b) => {
                const info = businessInfo(b);
                return (
                  <div key={b.id} className="listing-card">
                    <div className="card-img-wrap" style={cardImageBackdrop(getFirstImageUrl(b))}>
                      <img
                        src={getFirstImageUrl(b)}
                        alt={b.title}
                        className="card-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-property.svg'; }}
                      />
                      {b.verified === 1 && (
                        <span className="badge-verified"><i className="fas fa-check-circle"></i> Verified</span>
                      )}
                    </div>
                    <div className="card-body">
                      <h3 className="card-title">{b.title}</h3>
                      {info.categories.length > 0 && (
                        <div className="business-dir-tags">
                          {info.categories.slice(0, 3).map((c) => <span key={c}>{c}</span>)}
                          {info.categories.length > 3 && <span>+{info.categories.length - 3}</span>}
                        </div>
                      )}
                      <div className="card-location"><i className="fas fa-map-marker-alt"></i> {b.location}</div>
                      <div className="business-dir-actions">
                        <button type="button" className="btn-outline" disabled={contact.unlockingId === b.id} onClick={() => void contact.unlock(b)}>
                          {contact.unlockingId === b.id
                            ? <><i className="fas fa-spinner fa-spin"></i> Unlocking...</>
                            : <><i className="fas fa-phone-alt"></i> Contact</>}
                        </button>
                        <button type="button" className="btn-view" onClick={() => onNavigate('listing-detail', b)}>
                          <i className="fas fa-info-circle"></i> Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {contact.modals}
    </>
  );
}
