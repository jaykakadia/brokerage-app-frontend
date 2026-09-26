import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from './HomePage';

export default function ListingDetailPage({ listingId, onNavigate }) {
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchListing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/listings/${listingId}`);
      if (res.data?.status === 'success' && res.data?.data) {
        setListing(res.data.data);
      } else {
        setError('Listing could not be found.');
      }
    } catch (err) {
      console.error('Error loading listing detail:', err);
      setError('Unable to load listing details. It may have been removed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStatusChange = async (action) => {
    setActionLoading(true);
    try {
      await api.post(`/api/v1/listings/${listingId}/status`, { action });
      showToast(`Listing updated: ${action}`, 'success');
      await fetchListing();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/v1/listings/${listingId}`);
      alert('Listing deleted successfully.');
      onNavigate('home');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete listing', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh' }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#0c6253', marginBottom: '16px' }}></i>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading property details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh' }}>
        <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#dc2626', marginBottom: '16px' }}></i>
        <h2>{error || 'Listing not found'}</h2>
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: '20px' }}
          onClick={() => onNavigate('home')}
        >
          <i className="fas fa-arrow-left"></i> Back to All Listings
        </button>
      </div>
    );
  }

  const isOwner = user && user.id === listing.user_id;
  const isAdmin = user && user.role?.toLowerCase() === 'admin';
  const canManage = isOwner || isAdmin;

  const images = listing.images && listing.images.length > 0
    ? listing.images.map((img) => getImageUrl(img.file_path))
    : ['/placeholder-property.svg'];

  const currentImg = images[activePhotoIdx] || images[0];
  const formData = listing.form_data || {};
  const priceFormatted = formatListingPrice(listing.price);

  return (
    <div style={{ background: '#f4f6f9', minHeight: '80vh', padding: '30px 15px' }}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: toast.type === 'success' ? '#0c6253' : '#dc2626',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Breadcrumb / Back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => onNavigate('home')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <i className="fas fa-arrow-left"></i> Back to Properties
          </button>

          {canManage && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                Status: <strong style={{ textTransform: 'capitalize', color: listing.status === 'approved' ? '#0c6253' : '#e67e22' }}>{listing.status}</strong>
              </span>

              {isAdmin && (
                <>
                  {listing.status !== 'approved' && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('approve')}
                    >
                      <i className="fas fa-check"></i> Approve
                    </button>
                  )}
                  {listing.verified !== 1 && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', background: '#ea580c' }}
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('stamp')}
                    >
                      <i className="fas fa-stamp"></i> Verify Stamp
                    </button>
                  )}
                </>
              )}

              <select
                value={listing.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={actionLoading}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '12px' }}
              >
                <option value="pending">Set Pending</option>
                <option value="approved">Set Approved</option>
                <option value="sold">Set Sold</option>
                <option value="rented">Set Rented</option>
                <option value="suspended">Set Suspended</option>
              </select>

              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                disabled={actionLoading}
                onClick={handleDeleteListing}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          )}
        </div>

        {/* Property Header */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f0faf6', color: '#0c6253', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                  {formData.propType ? formData.propType.toUpperCase() : 'PROPERTY'}
                </span>
                {listing.verified === 1 && (
                  <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                    <i className="fas fa-check-circle"></i> VERIFIED
                  </span>
                )}
                <span style={{ color: '#6b7280', fontSize: '13px' }}>ID: #{listing.id}</span>
              </div>

              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: '0 0 10px 0' }}>
                {listing.title}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '15px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#0c6253' }}></i>
                {listing.location}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0c6253' }}>
                {priceFormatted}
              </div>
              {formData.priceNegotiable && (
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Price Negotiable</span>
              )}
            </div>
          </div>
        </div>

        {/* Layout: Left gallery & specs, Right contact card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          {/* Main Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Photo Gallery */}
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '100%', height: '420px', background: '#111827', position: 'relative' }}>
                <img
                  src={currentImg}
                  alt="Property"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/placeholder-property.svg';
                  }}
                />
              </div>

              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '10px', padding: '16px', overflowX: 'auto', background: '#f9fafb' }}>
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      style={{
                        border: idx === activePhotoIdx ? '2px solid #0c6253' : '2px solid transparent',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        padding: 0,
                        width: '80px',
                        height: '60px',
                        flexShrink: 0
                      }}
                    >
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Property Key Overview Specifications */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '18px', color: '#111827' }}>
                Property Overview
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Listing Type</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                    {formData.listingType || 'Sale'}
                  </div>
                </div>

                {formData.bhk && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Bedrooms / BHK</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formData.bhk} BHK</div>
                  </div>
                )}

                {formData.bathrooms && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Bathrooms</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formData.bathrooms}</div>
                  </div>
                )}

                {formData.area && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Super Built-up Area</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formData.area} sq.ft.</div>
                  </div>
                )}

                {formData.furnishing && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Furnishing</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                      {formData.furnishing}
                    </div>
                  </div>
                )}

                {formData.facing && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Facing</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{formData.facing}</div>
                  </div>
                )}

                {formData.floor && (
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Floor</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {formData.floor} {formData.totalFloors ? `of ${formData.totalFloors}` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: '#111827' }}>
                Description
              </h2>
              <div style={{ color: '#4b5563', lineHeight: '1.7', whiteSpace: 'pre-line', fontSize: '15px' }}>
                {listing.description || 'No additional description provided for this listing.'}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Contact Seller */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>
                Listed By
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0c6253, #14a37a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '22px',
                    fontWeight: 800
                  }}
                >
                  {listing.owner_name ? listing.owner_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                    {listing.owner_name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {listing.owner_role || 'Property Owner'}
                  </div>
                </div>
              </div>

              {listing.reference_code && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Associate Code: </span>
                  <strong style={{ color: '#0c6253' }}>{listing.reference_code}</strong>
                </div>
              )}

              <a
                href={`https://wa.me/919992292828?text=Hello%20TradeCall,%20I%20am%20interested%20in%20Property%20ID%20${listing.id}%20(${encodeURIComponent(listing.title)})`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{
                  width: '100%',
                  background: '#25d366',
                  borderColor: '#25d366',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  padding: '12px'
                }}
              >
                <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i> Contact on WhatsApp
              </a>

              <a
                href="tel:9992292828"
                className="btn-outline"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px'
                }}
              >
                <i className="fas fa-phone-alt"></i> Call TradeCall Desk
              </a>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                <i className="fas fa-shield-alt" style={{ color: '#0c6253', marginRight: '4px' }}></i>
                Zero Brokerage direct listing platform.
              </div>
            </div>

            {/* Quick Safety Tips */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
                <i className="fas fa-lightbulb" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Buyer Safety Tips
              </h4>
              <ul style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '16px', lineHeight: '1.6', margin: 0 }}>
                <li>Always inspect property in person before paying.</li>
                <li>Verify ownership documents with local registrar.</li>
                <li>Do not transfer advance payments blindly.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
