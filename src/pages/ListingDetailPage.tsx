import { useState, useEffect } from 'react';
import api, { getImageUrl, getWishlist, toggleWishlist, revealContact, getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice } from '../utils/formatters';
import { getListingUniqueId } from '../utils/url';
import { buildKeyDetails } from '../utils/listingDetails';
import { DEFAULT_FEATURED_LISTINGS } from './HomePage';
import PlansModal from '../components/PlansModal';
import ContactRevealModal, { ContactRevealData } from '../components/ContactRevealModal';
import type { Listing, ApiResponse, MessageResponse, NavigateFunction } from '../types';

export interface AuthModalOptions {
  title?: string;
  subtitle?: string;
  icon?: string;
  onSuccess?: () => void;
}

export interface ListingDetailPageProps {
  listingId: number | string | null;
  onNavigate: NavigateFunction;
  onOpenAuth?: (options?: AuthModalOptions) => void;
}

export default function ListingDetailPage({ listingId, onNavigate, onOpenAuth }: ListingDetailPageProps) {
  const { user, refreshUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  // Phase 2 state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [contactData, setContactData] = useState<ContactRevealData | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const fetchListing = async (): Promise<void> => {
    if (!listingId) {
      setLoading(false);
      setError('Listing ID not found');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<Listing>>(`/api/v1/listings/${listingId}`);
      if (res.data?.status === 'success' && res.data?.data) {
        setListing(res.data.data);
      } else {
        const cleanId = String(listingId).replace(/^(TC011P-|TC-)/i, '');
        const fallback = DEFAULT_FEATURED_LISTINGS.find(
          (l) => String(l.id) === cleanId || getListingUniqueId(l) === String(listingId)
        );
        if (fallback) {
          setListing(fallback);
        } else {
          setError('Listing could not be found.');
        }
      }
    } catch {
      const cleanId = String(listingId).replace(/^(TC011P-|TC-)/i, '');
      const fallback = DEFAULT_FEATURED_LISTINGS.find(
        (l) => String(l.id) === cleanId || getListingUniqueId(l) === String(listingId)
      );
      if (fallback) {
        setListing(fallback);
      } else {
        setError('Unable to load listing details. It may have been removed.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      void fetchListing();
    }
  }, [listingId]);

  // Sync wishlist status
  useEffect(() => {
    if (user && listingId) {
      getWishlist(true)
        .then((res) => {
          const arr = res.data?.data;
          if (Array.isArray(arr)) {
            setIsWishlisted(arr.includes(Number(listingId)));
          }
        })
        .catch(() => {});
    } else {
      setIsWishlisted(false);
    }
  }, [user, listingId]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleWishlist = async (): Promise<void> => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth({
          title: 'Sign In to Save Property',
          subtitle: 'Please sign in or create an account to save properties to your wishlist.',
          icon: 'fa-heart',
          onSuccess: async () => {
            try {
              const res = await toggleWishlist(Number(listingId));
              const action = res.data?.action;
              setIsWishlisted(action === 'added');
              showToast(action === 'added' ? 'Added to your wishlist!' : 'Removed from your wishlist.');
            } catch {
              showToast('Failed to update wishlist.', 'error');
            }
          }
        });
      } else {
        alert('Please sign in to save this property.');
      }
      return;
    }
    try {
      const res = await toggleWishlist(Number(listingId));
      const action = res.data?.action;
      setIsWishlisted(action === 'added');
      showToast(action === 'added' ? 'Added to your wishlist!' : 'Removed from your wishlist.');
    } catch {
      showToast('Failed to update wishlist.', 'error');
    }
  };

  const handleContactOwner = async (): Promise<void> => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth({
          title: 'Sign In to View Contact Details',
          subtitle: 'Please sign in or create an account to connect directly with the property owner.',
          icon: 'fa-phone-alt',
          onSuccess: () => {
            void handleContactOwner();
          }
        });
      } else {
        alert('Please sign in to view owner contact details.');
      }
      return;
    }

    if (listing && user.id === listing.user_id) {
      showToast('This is your own listing.');
      return;
    }

    setContactLoading(true);
    try {
      const res = await revealContact(Number(listingId));
      if (res.data?.status === 'success') {
        const contact = res.data.contact || {};
        const plan = res.data.plan || {};
        setContactData({
          owner_name: contact.owner_name || contact.person || listing?.owner_name,
          owner_phone: contact.phone || contact.mobile || listing?.owner_phone || undefined,
          owner_email: contact.email || listing?.owner_email || undefined,
          leads_balance: plan.leads_balance ?? plan.leads_remaining ?? user.leads_balance,
          already_revealed: res.data.already_revealed ?? false,
          message: res.data.message
        });
        setContactModalOpen(true);
        await refreshUser();
      } else {
        const msg = res.data?.message;
        if (msg) showToast(msg, 'error');
      }
    } catch (err: unknown) {
      const errMsg = getApiErrorMessage(err, 'Unable to unlock contact details.');
      if (errMsg.toLowerCase().includes('lead') || errMsg.toLowerCase().includes('plan')) {
        setPlansModalOpen(true);
      } else {
        showToast(errMsg, 'error');
      }
    } finally {
      setContactLoading(false);
    }
  };

  const handleStatusChange = async (action: string): Promise<void> => {
    setActionLoading(true);
    try {
      await api.post<MessageResponse>(`/api/v1/listings/${listingId}/status`, { action });
      showToast(`Listing updated: ${action}`, 'success');
      await fetchListing();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to update status'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async (): Promise<void> => {
    if (!window.confirm('Are you sure you want to permanently delete this listing?')) return;
    setActionLoading(true);
    try {
      await api.delete<MessageResponse>(`/api/v1/listings/${listingId}`);
      alert('Listing deleted successfully.');
      onNavigate('home');
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to delete listing'), 'error');
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


  const isOwner = Boolean(user && user.id === listing.user_id);
  const isAdmin = Boolean(user && user.role?.toLowerCase() === 'admin');
  const canManage = isOwner || isAdmin;

  const hasPhotos = Boolean(listing.images && listing.images.length > 0);
  const images = hasPhotos
    ? listing.images.map((img) => getImageUrl(img.file_path))
    : ['/no-image.svg'];

  const currentImg = images[activePhotoIdx] || images[0];
  const formData = listing.form_data || {};
  const isBusiness = formData.kind === 'business';
  const keyDetails = buildKeyDetails(formData);
  const amenities = Array.isArray(formData.amenities) ? formData.amenities.filter((a) => typeof a === 'string' && a) : [];
  const showPrice = Number(listing.price) > 0;
  const postedOn = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace(/^(\w+) (\d+), (\d+)$/, '$2 $1 $3')
    : '';
  const whatsappDigits = contactData?.owner_phone ? contactData.owner_phone.replace(/\D/g, '').slice(-10) : '';

  return (
    <section className="ld-wrap">
      {toast && (
        <div className={`ld-toast ${toast.type === 'error' ? 'is-error' : ''}`}>
          {toast.msg}
        </div>
      )}

      <div className="container">
        <div className="ld-topbar">
          <a
            href="#listings"
            className="ld-back"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
          >
            <i className="fas fa-arrow-left"></i> Back to Listings
          </a>

          {canManage && (
            <div className="ld-manage">
              <span className="ld-meta" style={{ margin: 0 }}>
                Status: <strong style={{ textTransform: 'capitalize', color: listing.status === 'approved' ? '#0c6253' : '#e67e22' }}>{listing.status}</strong>
              </span>

              {isAdmin && listing.status !== 'approved' && (
                <button
                  type="button"
                  className="btn-contact"
                  disabled={actionLoading}
                  onClick={() => void handleStatusChange('approve')}
                >
                  <i className="fas fa-check"></i> Approve
                </button>
              )}
              {isAdmin && listing.verified !== 1 && (
                <button
                  type="button"
                  className="btn-contact"
                  style={{ background: '#ea580c' }}
                  disabled={actionLoading}
                  onClick={() => void handleStatusChange('stamp')}
                >
                  <i className="fas fa-stamp"></i> Verify Stamp
                </button>
              )}

              <select
                value={listing.status}
                onChange={(e) => void handleStatusChange(e.target.value)}
                disabled={actionLoading}
              >
                <option value="pending">Set Pending</option>
                <option value="approved">Set Approved</option>
                <option value="sold">Set Sold</option>
                <option value="rented">Set Rented</option>
                <option value="suspended">Set Suspended</option>
              </select>

              <button
                type="button"
                className="btn-wishlist"
                disabled={actionLoading}
                onClick={() => void handleDeleteListing()}
              >
                <i className="fas fa-trash"></i> Delete
              </button>
            </div>
          )}
        </div>

        <div className="ld-grid">
          <div className="ld-card">
            <div className="ld-gallery">
              <div
                className="ld-main-wrap"
                // Blurred copy of the photo fills the space around it, so the full photo shows uncropped
                style={hasPhotos ? ({ '--ld-bg': `url("${currentImg}")` } as React.CSSProperties) : undefined}
              >
                <img
                  className={`ld-main-img ${hasPhotos ? '' : 'is-placeholder'}`}
                  src={currentImg}
                  alt={listing.title}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = '/no-image.svg';
                    target.classList.add('is-placeholder');
                  }}
                />
              </div>

              {images.length > 1 && (
                <div className="ld-thumbs">
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt=""
                      className={idx === activePhotoIdx ? 'active' : ''}
                      onClick={() => setActivePhotoIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="ld-body">
              <div className="ld-badge">{isBusiness ? 'Business' : 'Property'}</div>
              {listing.verified === 1 && (
                <div className="ld-badge ld-badge-verified">
                  <i className="fas fa-check-circle"></i> Verified
                </div>
              )}
              <h1 className="ld-title">{listing.title}</h1>
              {showPrice && <div className="ld-price">{formatListingPrice(listing.price)}</div>}
              <div className="ld-loc"><i className="fas fa-map-marker-alt"></i>{listing.location}</div>

              {keyDetails.length > 0 && (
                <>
                  <div className="ld-section-title">Key Details</div>
                  <div className="ld-facts">
                    {keyDetails.map((fact) => (
                      <div className="ld-fact" key={fact.label}>
                        <div className="k">{fact.label}</div>
                        <div className="v">{fact.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {amenities.length > 0 && (
                <>
                  <div className="ld-section-title">Amenities</div>
                  <div className="ld-amenities">
                    {amenities.map((a) => (
                      <span className="ld-amenity" key={a}><i className="fas fa-check-circle"></i> {a}</span>
                    ))}
                  </div>
                </>
              )}

              {listing.description && (
                <>
                  <div className="ld-section-title">Description</div>
                  <div className="ld-desc">{listing.description}</div>
                </>
              )}
            </div>
          </div>

          <aside className="ld-card ld-side">
            <h3>Listing Info</h3>
            <div className="ld-meta">Listing ID: <strong>#{listing.id}</strong></div>
            {postedOn && <div className="ld-meta">Posted: <strong>{postedOn}</strong></div>}
            {listing.reference_code && (
              <div className="ld-meta">Associate Code: <strong>{listing.reference_code}</strong></div>
            )}

            {isOwner || contactData ? (
              <>
                <div className="ld-meta" style={{ marginTop: '10px' }}>
                  Owner / Posted by: <strong>{contactData?.owner_name || listing.owner_name}</strong>
                </div>
                {listing.owner_role && <div className="ld-meta">Role: <strong>{listing.owner_role}</strong></div>}
              </>
            ) : (
              <div className="ld-meta" style={{ marginTop: '10px' }}>
                Owner / contact details are locked. Tap <strong>Contact</strong> to unlock (1 lead).
              </div>
            )}

            <div className="ld-actions">
              {isOwner ? (
                <div className="ld-meta" style={{ margin: 0 }}>
                  <i className="fas fa-user-check" style={{ color: '#0c6253', marginRight: '6px' }}></i>
                  This is your listing.
                </div>
              ) : contactData ? (
                <div className="ld-unlocked-contact">
                  {contactData.owner_phone ? (
                    <>
                      <a className="btn-contact" href={`tel:${contactData.owner_phone}`}>
                        <i className="fas fa-phone-alt"></i> {contactData.owner_phone}
                      </a>
                      {whatsappDigits && (
                        <a
                          className="btn-view"
                          href={`https://wa.me/91${whatsappDigits}?text=${encodeURIComponent(`Hello ${listing.owner_name}, I am interested in "${listing.title}" on TradeCall.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="fab fa-whatsapp"></i> WhatsApp
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="ld-meta">Mobile not available</div>
                  )}
                  {contactData.owner_email && (
                    <a className="btn-view" href={`mailto:${contactData.owner_email}`}>
                      <i className="fas fa-envelope"></i> {contactData.owner_email}
                    </a>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-contact"
                  onClick={() => void handleContactOwner()}
                  disabled={contactLoading}
                >
                  {contactLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> Checking Balance...</>
                  ) : (
                    <><i className="fas fa-phone-alt"></i> Contact</>
                  )}
                </button>
              )}

              <button
                type="button"
                className={`btn-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={() => void handleToggleWishlist()}
              >
                <i className={isWishlisted ? 'fas fa-heart' : 'far fa-heart'}></i>
                <span>{isWishlisted ? 'Wishlisted' : 'Wishlist'}</span>
              </button>

              <a
                className="btn-view"
                href="#listings"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('home');
                }}
              >
                <i className="fas fa-list"></i> More Listings
              </a>
            </div>
          </aside>
        </div>
      </div>

      <ContactRevealModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactData={contactData}
        listingTitle={listing?.title}
      />

      <PlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSuccess={() => {
          void handleContactOwner();
        }}
      />
    </section>
  );
}
