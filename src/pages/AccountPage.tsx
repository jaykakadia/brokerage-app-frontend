import { useState, useEffect } from 'react';
import api, { getWishlist, toggleWishlist, getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatListingPrice, getFirstImageUrl } from '../utils/formatters';
import PlansModal from '../components/PlansModal';
import EditProfileModal from '../components/EditProfileModal';
import type { Listing, MessageResponse, NavigateFunction, Plan } from '../types';

// Website shows as a domain link; social profiles show as brand icon buttons.
const SOCIAL_LINKS = [
  { key: 'facebook_url', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2' },
  { key: 'x_url', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#111827' },
  { key: 'youtube_url', label: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000' }
] as const;

const displayUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

function formatPlanExpiry(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPlanExpired(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}

export interface AccountPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: () => void;
}

export default function AccountPage({ onNavigate, onOpenAuth }: AccountPageProps) {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'my-listings' | 'wishlist' | 'password'>('my-listings');
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [featureListing, setFeatureListing] = useState<Listing | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // My Listings State
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // Wishlist State
  const [wishlistItems, setWishlistItems] = useState<Listing[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [planNameReady, setPlanNameReady] = useState(false);

  const openEdit = (): void => {
    setEditModalOpen(true);
  };

  useEffect(() => {
    if (!user?.plan_id) {
      setPlanName(null);
      setPlanNameReady(true);
      return;
    }
    setPlanNameReady(false);
    let cancelled = false;
    api.get<{ status: string; data: Plan }>(`/api/v1/plans/${user.plan_id}`)
      .then((res) => {
        if (!cancelled) setPlanName(res.data?.data?.name || null);
      })
      .catch(() => {
        if (!cancelled) setPlanName(null);
      })
      .finally(() => {
        if (!cancelled) setPlanNameReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.plan_id]);

  const fetchMyListings = async (): Promise<void> => {
    if (!user) return;
    setListingsLoading(true);
    try {
      const res = await api.get<{ status: string; data: Listing[] }>('/api/v1/listings', {
        params: { user_id: user.id, status: 'all' }
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setMyListings(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Error fetching user listings:', err);
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchWishlist = async (): Promise<void> => {
    if (!user) return;
    setWishlistLoading(true);
    try {
      const res = await getWishlist(false);
      const data = res.data?.data;
      if (res.data?.status === 'success' && Array.isArray(data)) {
        setWishlistItems(data);
      }
    } catch (err: unknown) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleRemoveWishlist = async (listingId: number): Promise<void> => {
    try {
      await toggleWishlist(listingId);
      setWishlistItems((prev) => prev.filter((item) => item.id !== listingId));
    } catch (err: unknown) {
      console.error('Failed to remove item from wishlist:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-listings') {
      void fetchMyListings();
    } else if (activeTab === 'wishlist') {
      void fetchWishlist();
    }
  }, [activeTab, user]);

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setPassLoading(true);
    try {
      const res = await api.post<MessageResponse>('/api/v1/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setPassMsg({ type: 'success', text: res.data?.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPassMsg({ type: 'error', text: getApiErrorMessage(err, 'Failed to change password.') });
    } finally {
      setPassLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete<MessageResponse>(`/api/v1/listings/${listingId}`);
      setMyListings(myListings.filter((l) => l.id !== listingId));
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Failed to delete listing.'));
    }
  };

  if (!user) {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '56px', color: '#0c6253', marginBottom: '16px' }}>
            <i className="fas fa-user-circle"></i>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>My Account</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Sign in to view your profile and manage your listings.</p>
          <button type="button" className="btn-primary" onClick={onOpenAuth}>
            <i className="fas fa-sign-in-alt"></i> Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f4f6f9', minHeight: '80vh', padding: '40px 15px' }}>
      <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Account Header Card */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0c6253, #14a37a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '28px',
                fontWeight: 800
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                {user.name}
              </h1>
              {user.business_name && (
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0c6253', margin: '-2px 0 6px 0' }}>
                  <i className="fas fa-briefcase" style={{ marginRight: '6px' }}></i>{user.business_name}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280', alignItems: 'center' }}>
                <span><i className="fas fa-envelope"></i> {user.email}</span>
                {user.phone && <span><i className="fas fa-phone"></i> {user.phone}</span>}
                {user.whatsapp && (
                  <a
                    href={`https://wa.me/91${user.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6b7280', textDecoration: 'none' }}
                    title="Chat on WhatsApp"
                  >
                    <i className="fab fa-whatsapp" style={{ color: '#25d366' }}></i> {user.whatsapp}
                  </a>
                )}
                <span style={{ background: '#f0faf6', color: '#0c6253', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  {user.role}
                </span>
              </div>
              {user.website_url || SOCIAL_LINKS.some(({ key }) => user[key]) ? (
                <nav className="profile-links" aria-label="Website and social links">
                  {user.website_url && (
                    <a className="profile-website" href={user.website_url} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-link"></i>{displayUrl(user.website_url)}
                    </a>
                  )}
                  {SOCIAL_LINKS.filter(({ key }) => user[key]).map(({ key, label, icon, color }) => (
                    <a
                      key={key}
                      className="profile-social"
                      href={user[key] || ''}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={label}
                      aria-label={label}
                      style={{ '--brand': color } as React.CSSProperties}
                    >
                      <i className={icon}></i>
                    </a>
                  ))}
                </nav>
              ) : (
                <button type="button" className="profile-links-add" onClick={openEdit}>
                  <i className="fas fa-plus"></i> Add website & social links
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={openEdit}
              style={{ padding: '10px 18px', fontSize: '14px', fontWeight: 700 }}
            >
              <i className="fas fa-pen" style={{ marginRight: '6px' }}></i>
              Edit
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPlansModalOpen(true)}
              style={{ padding: '10px 18px', fontSize: '14px', borderColor: '#0c6253', color: '#0c6253', fontWeight: 700 }}
            >
              <i className="fas fa-sparkles" style={{ marginRight: '6px' }}></i> Buy Leads / Plans
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('post-listing')}
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              <i className="fas fa-plus"></i> Post New Property
            </button>
          </div>
          </div>

          <div style={{ marginTop: '22px', borderTop: '1px solid #eef2f6' }}>
            {([
              {
                label: 'Business Name',
                value: user.business_name || 'Not added',
                tone: user.business_name ? '#111827' : '#9ca3af'
              },
              {
                label: 'Current Plan',
                value: !user.plan_id
                  ? 'No Plan'
                  : `${planName || (planNameReady ? 'Plan' : '…')}${isPlanExpired(user.plan_expires_at) ? ' (Expired)' : ''}`,
                tone: user.plan_id && !isPlanExpired(user.plan_expires_at) ? '#0c6253' : '#111827'
              },
              {
                label: 'Leads',
                value: `${user.leads_balance ?? 0} remaining${(user.leads_balance ?? 0) === 0 ? ' — purchase a plan' : ''}`,
                tone: (user.leads_balance ?? 0) > 0 ? '#047857' : '#6b7280'
              },
              {
                label: 'Plan Expiry',
                value: user.plan_id ? formatPlanExpiry(user.plan_expires_at) : '—',
                tone: user.plan_id && isPlanExpired(user.plan_expires_at) ? '#b91c1c' : '#111827'
              }
            ] as const).map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 4px',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '14px'
                }}
              >
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{row.label}</span>
                {row.label === 'Business Name' && !user.business_name ? (
                  <button type="button" className="account-add-link" onClick={openEdit}>
                    <i className="fas fa-plus"></i> Add Business Name
                  </button>
                ) : (
                  <span style={{ color: row.tone, fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-outline ${activeTab === 'my-listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-listings')}
            style={{
              background: activeTab === 'my-listings' ? '#0c6253' : '#fff',
              color: activeTab === 'my-listings' ? '#fff' : '#374151',
              borderColor: activeTab === 'my-listings' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-list"></i> My Listings ({myListings.length})
          </button>
          <button
            type="button"
            className={`btn-outline ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
            style={{
              background: activeTab === 'wishlist' ? '#0c6253' : '#fff',
              color: activeTab === 'wishlist' ? '#fff' : '#374151',
              borderColor: activeTab === 'wishlist' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-heart" style={{ color: activeTab === 'wishlist' ? '#fff' : '#dc2626' }}></i> Wishlist ({wishlistItems.length})
          </button>
          <button
            type="button"
            className={`btn-outline ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
            style={{
              background: activeTab === 'password' ? '#0c6253' : '#fff',
              color: activeTab === 'password' ? '#fff' : '#374151',
              borderColor: activeTab === 'password' ? '#0c6253' : '#d1d5db'
            }}
          >
            <i className="fas fa-key"></i> Change Password
          </button>
        </div>

        {/* TAB 2: My Listings */}
        {activeTab === 'my-listings' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>
                Properties Posted by You
              </h2>
              <button
                type="button"
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => void fetchMyListings()}
              >
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>

            {listingsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '10px' }}></i>
                <div>Loading your properties...</div>
              </div>
            ) : myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280' }}>
                <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e1', marginBottom: '14px', display: 'block' }}></i>
                <p>You haven't posted any property listings yet.</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={() => onNavigate('post-listing')}
                >
                  <i className="fas fa-plus"></i> Post Your First Property
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myListings.map((listing) => {
                  const statusColors: Record<string, { bg: string; text: string }> = {
                    approved: { bg: '#dcfce7', text: '#166534' },
                    pending: { bg: '#fef3c7', text: '#92400e' },
                    sold: { bg: '#e0e7ff', text: '#3730a3' },
                    rented: { bg: '#f3e8ff', text: '#6b21a8' },
                    suspended: { bg: '#fee2e2', text: '#991b1b' },
                    deleted: { bg: '#f1f5f9', text: '#64748b' }
                  };
                  const color = statusColors[listing.status?.toLowerCase()] || statusColors.pending;

                  return (
                    <div
                      key={listing.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
                        <img
                          src={getFirstImageUrl(listing)}
                          alt=""
                          style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = '/placeholder-property.svg'; }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                background: color.bg,
                                color: color.text,
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                              }}
                            >
                              {listing.status}
                            </span>
                            {listing.is_featured && (
                              <span
                                title={listing.featured_until ? `Featured until ${formatPlanExpiry(listing.featured_until)}` : 'Featured'}
                                style={{
                                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <i className="fas fa-star"></i> Featured
                                {listing.featured_until ? ` till ${formatPlanExpiry(listing.featured_until)}` : ''}
                              </span>
                            )}
                            <span style={{ fontWeight: 800, color: '#0c6253', fontSize: '14px' }}>
                              {formatListingPrice(listing.price)}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                            {listing.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            <i className="fas fa-map-marker-alt"></i> {listing.location}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Admin-featured listings (no end date) need no paid featuring. */}
                        {listing.status?.toLowerCase() === 'approved' && !(listing.is_featured && !listing.featured_until) && (
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '8px 14px', fontSize: '12px', color: '#c2410c', borderColor: '#fdba74' }}
                            onClick={() => setFeatureListing(listing)}
                          >
                            <i className="fas fa-star"></i> {listing.is_featured ? 'Extend Featured' : 'Feature'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                          onClick={() => onNavigate('listing-detail', listing)}
                        >
                          <i className="fas fa-eye"></i> View
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '8px 14px', fontSize: '12px', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => void handleDeleteListing(listing.id)}
                        >
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: My Wishlist */}
        {activeTab === 'wishlist' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
              My Saved Properties ({wishlistItems.length})
            </h2>

            {wishlistLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0c6253', marginBottom: '8px' }}></i>
                <div>Loading your saved properties...</div>
              </div>
            ) : wishlistItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                <i className="fas fa-heart-broken fa-3x" style={{ color: '#cbd5e1', marginBottom: '14px', display: 'block' }}></i>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  No properties saved to your wishlist yet.
                </div>
                <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
                  Explore verified listings and click the heart icon to save properties you like.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onNavigate('home')}
                >
                  Browse Properties
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {wishlistItems.map((item) => {
                  const imgSrc = getFirstImageUrl(item);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                          src={imgSrc}
                          alt={item.title}
                          style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = '/placeholder-property.svg';
                          }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 800, color: '#0c6253', fontSize: '16px' }}>
                              {formatListingPrice(item.price)}
                            </span>
                            <span style={{ fontSize: '11px', background: '#f0faf6', color: '#0c6253', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                              {item.form_data?.propType || 'Property'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            <i className="fas fa-map-marker-alt"></i> {item.location}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                          onClick={() => onNavigate('listing-detail', item)}
                        >
                          <i className="fas fa-eye"></i> View Details
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '8px 14px', fontSize: '13px', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => void handleRemoveWishlist(item.id)}
                        >
                          <i className="fas fa-heart-broken"></i> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Change Password */}

        {activeTab === 'password' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#111827' }}>
              Change Account Password
            </h2>

            {passMsg && (
              <div
                style={{
                  background: passMsg.type === 'success' ? '#f0faf6' : '#fef2f2',
                  border: `1px solid ${passMsg.type === 'success' ? '#c6f2e2' : '#fecaca'}`,
                  color: passMsg.type === 'success' ? '#0c6253' : '#b91c1c',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}
              >
                {passMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group full">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label>New Password (min 6 characters)</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ marginTop: '16px' }}
                disabled={passLoading}
              >
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      <PlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSuccess={() => void refreshUser()}
      />
      <PlansModal
        isOpen={featureListing !== null}
        planType="featured"
        listing={featureListing}
        onClose={() => setFeatureListing(null)}
        onSuccess={() => void fetchMyListings()}
      />
      <EditProfileModal
        isOpen={editModalOpen}
        user={user}
        onClose={() => setEditModalOpen(false)}
        onSaved={refreshUser}
      />
    </div>
  );
}
