import { useState, useEffect } from 'react';
import axios from 'axios';
import api, { getImageUrl, getWishlist, toggleWishlist, revealContact, getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice, getFirstImageUrl } from '../utils/formatters';
import { getListingUniqueId, getListingUrl, isLegacyListingCode, slugify } from '../utils/url';
import { setSeo, toMetaDescription } from '../utils/seo';
import { buildKeyDetails } from '../utils/listingDetails';
import { getBusinessCategories, getBusinessMobile, getListingDescription, publicListingTitle, getListingCity, isBusinessListing } from '../utils/listingKind';
import { DEFAULT_FEATURED_LISTINGS } from './HomePage';
import PlansModal from '../components/PlansModal';
import ContactRevealModal, { ContactLinks, contactDataFromReveal, type ContactRevealData } from '../components/ContactRevealModal';
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
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
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

  // Old links ended in the associate code, which every listing from that associate
  // shares, so pick the listing whose title matches the slug in the URL.
  const resolveLegacyListing = async (code: string): Promise<Listing | null> => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const titleSlug = parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : '';
    if (!titleSlug) return null;
    try {
      const res = await api.get<ApiResponse<Listing[]>>('/api/v1/listings', { params: { ref_code: code.toUpperCase() } });
      const candidates = Array.isArray(res.data?.data) ? res.data.data : [];
      return candidates.find((l) => slugify(l.title) === titleSlug) ?? null;
    } catch {
      return null;
    }
  };

  const fetchListing = async (): Promise<void> => {
    if (!listingId) {
      setLoading(false);
      setError('Listing ID not found');
      setSeo({
        title: 'Listing Not Found | Tradecall',
        description: 'The requested property listing could not be found.',
        path: window.location.pathname,
        noindex: true,
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const legacyMatch = isLegacyListingCode(listingId) ? await resolveLegacyListing(String(listingId)) : null;
      if (legacyMatch) {
        setListing(legacyMatch);
        window.history.replaceState(null, '', getListingUrl(legacyMatch));
        return;
      }
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
          setSeo({
            title: 'Listing Not Found | Tradecall',
            description: 'The requested property listing could not be found.',
            path: window.location.pathname,
            noindex: true,
          });
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        const cleanId = String(listingId).replace(/^(TC011P-|TC-)/i, '');
        const fallback = DEFAULT_FEATURED_LISTINGS.find(
          (l) => String(l.id) === cleanId || getListingUniqueId(l) === String(listingId)
        );
        if (fallback) {
          setListing(fallback);
        } else {
          setError('Listing could not be found.');
          setSeo({
            title: 'Listing Not Found | Tradecall',
            description: 'The requested property listing could not be found.',
            path: window.location.pathname,
            noindex: true,
          });
        }
      } else {
        // Network errors, timeouts, or crawler blocked (e.g. status 0 / ECONNABORTED / 403 / 500):
        // Keep the server-injected canonical/title and do NOT set noindex or homepage SEO.
        setError('Unable to load listing details. Please try again.');
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

  // Fetch related properties or businesses in the same city/locality/category (Audit Points 2 & 2a)
  useEffect(() => {
    if (!listing) {
      setRelatedListings([]);
      return;
    }
    const isBiz = isBusinessListing(listing);
    const currentCity = getListingCity(listing).toLowerCase();
    const currentLocality = (listing.form_data?.locality || listing.location?.split(',')[0] || '').toString().trim().toLowerCase();
    const currentCategories = getBusinessCategories(listing).map((c) => c.toLowerCase());
    const currentPropType = (listing.form_data?.propType || '').toString().toLowerCase();

    api
      .get<ApiResponse<Listing[]>>('/api/v1/listings', {
        params: { status: 'approved', kind: isBiz ? 'business' : undefined, limit: 80 }
      })
      .then((res) => {
        const all = Array.isArray(res.data?.data) ? res.data.data : [];
        const candidates = all.filter((item) => {
          if (String(item.id) === String(listing.id)) return false;
          if (item.form_data?.kind === 'buyer') return false;
          return isBiz ? isBusinessListing(item) : !isBusinessListing(item);
        });

        const scored = candidates.map((item) => {
          let score = 0;
          const itemCity = getListingCity(item).toLowerCase();
          const itemLoc = (item.form_data?.locality || item.location?.split(',')[0] || '').toString().trim().toLowerCase();
          if (currentCity && itemCity === currentCity) score += 4;
          if (currentLocality && itemLoc && itemLoc === currentLocality) score += 5;
          if (isBiz) {
            const itemCats = getBusinessCategories(item).map((c) => c.toLowerCase());
            if (currentCategories.some((c) => itemCats.includes(c))) score += 5;
          } else {
            const itemPropType = (item.form_data?.propType || '').toString().toLowerCase();
            if (currentPropType && itemPropType === currentPropType) score += 3;
          }
          return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        setRelatedListings(scored.slice(0, 6).map((s) => s.item));
      })
      .catch(() => {
        setRelatedListings([]);
      });
  }, [listing]);

  useEffect(() => {
    if (!listing) return;
    const isBuyer = listing.form_data?.kind === 'buyer';
    const isThinBusiness = listing.form_data?.kind === 'business' && !getListingDescription(listing) && !listing.location;
    const isBiz = isBusinessListing(listing);
    const price = isBiz ? '' : formatListingPrice(listing.price);
    const summary = [price, listing.location].filter(Boolean).join(' · ');
    const city = getListingCity(listing) || 'Palwal';
    const citySlug = slugify(city) || 'palwal';
    const rawLocFirst = listing.location ? listing.location.split(',')[0].trim() : '';
    const locality = (listing.form_data?.locality ? String(listing.form_data.locality).trim() : rawLocFirst) || city;
    const localitySlug = slugify(locality);
    const headingText = publicListingTitle(listing);
    const primaryCat = getBusinessCategories(listing)[0] || 'Property Dealer';

    let fullTitle: string;
    let metaDescription: string;

    if (isBiz) {
      // Audit Point 3 & 8: Recommended meta title: "Ashoka Property Faridabad | Property Dealer – TradeCall India"
      const hasCityInName = headingText.toLowerCase().includes(city.toLowerCase());
      const nameWithCity = hasCityInName ? headingText : `${headingText} ${city}`;
      fullTitle = listing.seo_title || `${nameWithCity} | ${primaryCat} – TradeCall India`;

      // Audit Point 3: "Contact Ashoka Property in Greater Faridabad, Faridabad for real estate services. Find property dealers and consultants on TradeCall India."
      const locDisplay = listing.location || (locality !== city ? `${locality}, ${city}` : city);
      const ownerDesc = getListingDescription(listing);
      metaDescription = toMetaDescription(
        `Contact ${headingText} in ${locDisplay} for ${primaryCat.toLowerCase()} & real estate services.${ownerDesc ? ` ${ownerDesc}` : ''} Find property dealers and consultants on TradeCall India.`
      );
    } else {
      const rawSeoTitle = listing.seo_title || `${headingText} | TradeCall India`;
      fullTitle = rawSeoTitle
        .replace(/\b\d+\s*BHK\+?\s+(Agriculture(?:\s+Land)?)\b/gi, 'Agriculture Land')
        .replace(/\b\d+\s*BHK\+?\s+(Plot)\b/gi, 'Plot')
        .replace(/\b\d+\s*BHK\+?\s+(Commercial(?:\s+Property)?)\b/gi, 'Commercial Property')
        .replace(/\b\d+\s*BHK\+?\s+(Industrial(?:\s+Land)?)\b/gi, 'Industrial Land');
      metaDescription = toMetaDescription(
        `${summary}. ${getListingDescription(listing)} Contact the owner directly on TradeCall India, zero brokerage.`
      );
    }

    const canonicalPath = getListingUrl(listing);
    const canonicalUrl = `https://tradecall.in${canonicalPath}`;
    const breadcrumbItems: Array<Record<string, unknown>> = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://tradecall.in/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: city,
        item: `https://tradecall.in/properties/${citySlug}`
      }
    ];
    if (locality && locality.toLowerCase() !== city.toLowerCase() && localitySlug) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: locality,
        item: `https://tradecall.in/${citySlug}/${localitySlug}`
      });
    }
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: headingText,
      item: canonicalUrl
    });

    setSeo({
      title: fullTitle,
      description: metaDescription,
      path: canonicalPath,
      image: listing.images?.[0] ? getImageUrl(listing.images[0].file_path) : undefined,
      noindex: isBuyer || isThinBusiness,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbItems
        }
      ]
    });
  }, [listing]);

  // Sync wishlist status
  useEffect(() => {
    if (user && listing) {
      getWishlist(true)
        .then((res) => {
          const arr = res.data?.data;
          if (Array.isArray(arr)) {
            setIsWishlisted(arr.includes(Number(listing.id)));
          }
        })
        .catch(() => {});
    } else {
      setIsWishlisted(false);
    }
  }, [user, listing?.id]);

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
              const res = await toggleWishlist(Number(listing?.id));
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
      const res = await toggleWishlist(Number(listing?.id));
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
      const res = await revealContact(Number(listing?.id));
      if (res.data?.status === 'success') {
        setContactData(contactDataFromReveal(res.data, listing, user.leads_balance));
        setContactModalOpen(true);
        await refreshUser();
        await fetchListing();
      } else if (res.data?.code === 'no_leads') {
        setPlansModalOpen(true);
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

  const shareListing = async (): Promise<void> => {
    if (!listing) return;
    const url = `https://tradecall.in${getListingUrl(listing)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Listing link copied');
    } catch {
      showToast('Could not copy the listing link', 'error');
    }
  };

  const handleStatusChange = async (action: string): Promise<void> => {
    setActionLoading(true);
    try {
      await api.post<MessageResponse>(`/api/v1/listings/${listing?.id}/status`, { action });
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
      await api.delete<MessageResponse>(`/api/v1/listings/${listing?.id}`);
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
  const heading = publicListingTitle(listing);
  const isBusiness = isBusinessListing(listing);
  const primaryCategory = getBusinessCategories(listing)[0] || '';
  const cityName = getListingCity(listing);
  const citySlug = slugify(cityName);
  const rawLocFirst = listing.location ? listing.location.split(',')[0].trim() : '';
  const localityName = formData.locality ? String(formData.locality).trim() : rawLocFirst;
  const localitySlug = slugify(localityName);
  const showLocalityCrumb = Boolean(localityName && cityName && localityName.toLowerCase() !== cityName.toLowerCase() && localitySlug);
  const h1LocationLabel = localityName || cityName;

  const keyDetails = buildKeyDetails(formData);
  const amenities = Array.isArray(formData.amenities) ? formData.amenities.filter((a) => typeof a === 'string' && a) : [];
  const showPrice = !isBusiness;
  const postedOn = listing.created_at
    ? new Date(listing.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace(/^(\w+) (\d+), (\d+)$/, '$2 $1 $3')
    : '';
  const isUnlocked = isOwner || isAdmin || Boolean(contactData) || Boolean(listing.unlocked);
  const resolvedOwnerName = contactData?.owner_name || (listing.owner_name && listing.owner_name !== '[Hidden]' ? listing.owner_name : 'Owner');
  const whatsappDigits = (contactData?.owner_whatsapp || contactData?.owner_phone || (isBusiness ? getBusinessMobile(listing) : '')).replace(/\D/g, '').slice(-10);

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
            href={isBusiness ? '/business-directory' : '#listings'}
            className="ld-back"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(isBusiness ? 'business-directory' : 'home');
            }}
          >
            <i className="fas fa-arrow-left"></i> {isBusiness ? 'Back to Business Directory' : 'Back to Listings'}
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

        {/* Audit Point 4 Breadcrumbs: Home → Palwal → Omaxe City Phase-II → Property Listing */}
        <nav aria-label="Breadcrumb" style={{ margin: '14px 0 18px 0', fontSize: '13px', color: '#64748b' }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('home');
            }}
            style={{ color: '#0c6253', textDecoration: 'none', fontWeight: 500 }}
          >
            Home
          </a>
          {cityName && (
            <>
              <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rarr;</span>
              <a
                href={`/properties/${citySlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('properties-city', citySlug);
                }}
                style={{ color: '#0c6253', textDecoration: 'none', fontWeight: 500 }}
              >
                {cityName}
              </a>
            </>
          )}
          {showLocalityCrumb && (
            <>
              <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rarr;</span>
              <a
                href={`/${citySlug}/${localitySlug}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('properties-city', `${citySlug}/${localitySlug}`);
                }}
                style={{ color: '#0c6253', textDecoration: 'none', fontWeight: 500 }}
              >
                {localityName}
              </a>
            </>
          )}
          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rarr;</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>{heading}</span>
        </nav>

        <div className="ld-grid">
          <div className="ld-card">
            <div className="ld-gallery">
              <div
                className="ld-main-wrap"
                style={hasPhotos ? ({ '--ld-bg': `url("${currentImg}")` } as React.CSSProperties) : undefined}
              >
                <img
                  className={`ld-main-img ${hasPhotos ? '' : 'is-placeholder'}`}
                  src={currentImg}
                  alt={heading}
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
              {/* Audit Point 3 H1: e.g. "Ashoka Property – Property Dealer in Greater Faridabad" */}
              <h1 className="ld-title">
                {heading}
                {isBusiness && primaryCategory && (
                  <>
                    {' '}
                    <span className="title-category">
                      &ndash;&nbsp;{primaryCategory}
                      {h1LocationLabel && !heading.toLowerCase().includes(h1LocationLabel.toLowerCase())
                        ? ` in ${h1LocationLabel}`
                        : ''}
                    </span>
                  </>
                )}
              </h1>
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

              {getListingDescription(listing) && (
                <>
                  <div className="ld-section-title">Description</div>
                  <div className="ld-desc">{getListingDescription(listing)}</div>
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

            {isBusiness ? (
              <>
                <div className="ld-meta" style={{ marginTop: '10px' }}>
                  Owner / Contact: <strong>{listing.owner_name}</strong>
                </div>
                {listing.owner_role && <div className="ld-meta">Role: <strong>{listing.owner_role}</strong></div>}
                {getBusinessMobile(listing) && (
                  <div className="ld-meta">
                    Phone: <strong><a href={`tel:${getBusinessMobile(listing)}`} style={{ color: 'inherit', textDecoration: 'none' }}>{getBusinessMobile(listing)}</a></strong>
                  </div>
                )}
                {contactData?.owner_email && (
                  <div className="ld-meta">
                    Email: <strong><a href={`mailto:${contactData.owner_email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contactData.owner_email}</a></strong>
                  </div>
                )}
                {!contactData && !isOwner && (
                  <div className="ld-meta" style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>
                    Email & other details are locked. Tap <strong>Contact</strong> to unlock (1 lead).
                  </div>
                )}
              </>
            ) : isUnlocked ? (
              <>
                <div className="ld-meta" style={{ marginTop: '10px' }}>
                  Owner / Posted by: <strong>{resolvedOwnerName}</strong>
                </div>
                {listing.owner_role && <div className="ld-meta">Role: <strong>{listing.owner_role}</strong></div>}
                {contactData?.owner_phone && (
                  <div className="ld-meta">
                    Phone: <strong><a href={`tel:${contactData.owner_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contactData.owner_phone}</a></strong>
                  </div>
                )}
                {contactData?.owner_email && (
                  <div className="ld-meta">
                    Email: <strong><a href={`mailto:${contactData.owner_email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contactData.owner_email}</a></strong>
                  </div>
                )}
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
              ) : isUnlocked ? (
                <div className="ld-unlocked-contact">
                  {(contactData?.owner_phone || (isBusiness && getBusinessMobile(listing))) ? (
                    <>
                      <a className="btn-contact" href={`tel:${contactData?.owner_phone || getBusinessMobile(listing)}`}>
                        <i className="fas fa-phone-alt fa-flip-horizontal" style={{ display: 'inline-block', transform: 'scaleX(-1)' }}></i> Call {contactData?.owner_phone || getBusinessMobile(listing)}
                      </a>
                      {whatsappDigits && (
                        <a
                          className="btn-view"
                          href={`https://wa.me/91${whatsappDigits}?text=${encodeURIComponent(`Hello ${resolvedOwnerName}, I am interested in "${heading}" on TradeCall.`)}`}
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
                  {contactData?.owner_email && (
                    <a className="btn-view" href={`mailto:${contactData.owner_email}`}>
                      <i className="fas fa-envelope"></i> {contactData.owner_email}
                    </a>
                  )}
                  {contactData?.links && <ContactLinks links={contactData.links} />}
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
                    <><i className="fas fa-phone-alt fa-flip-horizontal" style={{ display: 'inline-block', transform: 'scaleX(-1)' }}></i> Contact</>
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

              <button
                type="button"
                className="btn-view"
                onClick={() => void shareListing()}
              >
                <i className="fas fa-link"></i> Share
              </button>

              <a
                className="btn-view"
                href={isBusiness ? '/business-directory' : '#listings'}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(isBusiness ? 'business-directory' : 'home');
                }}
              >
                <i className="fas fa-list"></i> {isBusiness ? 'All Businesses' : 'More Listings'}
              </a>
            </div>
          </aside>
        </div>

        {/* Audit Points 2 & 2a: Internal Linking to Related Properties / Businesses in the Same City & Category */}
        <div style={{ marginTop: '36px', background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              {isBusiness
                ? `Other Businesses${cityName ? ` in ${cityName}` : ''}${primaryCategory ? ` (${primaryCategory})` : ''}`
                : `Related Properties${showLocalityCrumb ? ` in ${localityName}, ${cityName}` : cityName ? ` in ${cityName}` : ''}`}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {cityName && (
                <a
                  href={`/properties/${citySlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', citySlug);
                  }}
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0c6253', textDecoration: 'none', background: '#f0fdf4', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}
                >
                  Properties in {cityName} &rarr;
                </a>
              )}
              {showLocalityCrumb && (
                <a
                  href={`/${citySlug}/${localitySlug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', `${citySlug}/${localitySlug}`);
                  }}
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0c6253', textDecoration: 'none', background: '#f0fdf4', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}
                >
                  More in {localityName} &rarr;
                </a>
              )}
              {isBusiness && cityName && (
                <a
                  href={`/business-directory?city=${encodeURIComponent(cityName)}${primaryCategory ? `&category=${encodeURIComponent(primaryCategory)}` : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, '', `/business-directory?city=${encodeURIComponent(cityName)}${primaryCategory ? `&category=${encodeURIComponent(primaryCategory)}` : ''}`);
                    onNavigate('business-directory');
                  }}
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0c6253', textDecoration: 'none', background: '#f0fdf4', padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}
                >
                  {primaryCategory ? `${primaryCategory} in ${cityName}` : `Businesses in ${cityName}`} &rarr;
                </a>
              )}
            </div>
          </div>

          {relatedListings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {relatedListings.map((rel) => {
                const relUrl = getListingUrl(rel);
                const relTitle = publicListingTitle(rel) || rel.title;
                const relIsBiz = isBusinessListing(rel);
                const relCat = getBusinessCategories(rel)[0];
                const relImg = getFirstImageUrl(rel);
                return (
                  <a
                    key={rel.id}
                    href={relUrl}
                    onClick={(e) => {
                      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
                      e.preventDefault();
                      onNavigate('listing-detail', rel);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#f8fafc',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div style={{ height: '140px', overflow: 'hidden', background: '#e2e8f0', position: 'relative' }}>
                      <img
                        src={relImg}
                        alt={relTitle}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder-property.svg'; }}
                      />
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {relTitle}
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0c6253', marginBottom: '4px' }}>
                        {relIsBiz ? (relCat || 'Verified Business') : formatListingPrice(rel.price)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '4px' }}></i>
                        {rel.location}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Explore more verified listings in{' '}
              <a
                href={cityName ? `/properties/${citySlug}` : '/cities'}
                onClick={(e) => {
                  e.preventDefault();
                  if (cityName) onNavigate('properties-city', citySlug);
                  else onNavigate('cities');
                }}
                style={{ color: '#0c6253', fontWeight: 600 }}
              >
                {cityName || 'all cities'}
              </a>{' '}
              or browse our{' '}
              <a
                href="/business-directory"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('business-directory');
                }}
                style={{ color: '#0c6253', fontWeight: 600 }}
              >
                Business Directory
              </a>.
            </p>
          )}
        </div>
      </div>

      <ContactRevealModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactData={contactData}
        listingTitle={listing ? publicListingTitle(listing) : undefined}
      />

      <PlansModal
        isOpen={plansModalOpen}
        noLeads
        onClose={() => setPlansModalOpen(false)}
        onSuccess={() => {
          void handleContactOwner();
        }}
      />
    </section>
  );
}
