import { useState } from 'react';
import type { Listing, NavigateFunction } from '../../types';
import { isBusinessListing, publicListingTitle } from '../../utils/listingKind';
import PlansModal from '../../components/PlansModal';

export interface PostListingSuccessPlansProps {
  listing: Listing;
  onNavigate: NavigateFunction;
}

interface FeaturedTier {
  id: 'priority' | 'premium';
  name: string;
  price: number;
  durationDays: number;
  badgeIcon: string;
  isPopular?: boolean;
  headerBg?: string;
  accentColor?: string;
  features: Array<{ text: string; subtext?: string }>;
}

export default function PostListingSuccessPlans({ listing, onNavigate }: PostListingSuccessPlansProps) {
  const isBusiness = isBusinessListing(listing);
  const [selectedTier, setSelectedTier] = useState<FeaturedTier | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  const titleText = publicListingTitle(listing);
  const entityType = isBusiness ? 'business' : 'property';
  const entityTypeCap = isBusiness ? 'Business' : 'Property';

  const priorityTier: FeaturedTier = {
    id: 'priority',
    name: 'Priority',
    price: 2000,
    durationDays: 90,
    badgeIcon: 'fa-award',
    headerBg: '#f8fafc',
    accentColor: '#111827',
    features: [
      { text: 'Average Visibility' },
      { text: `Displaying Priority ${entityTypeCap} Above Free Member's ${isBusiness ? 'Listing' : 'Property'}` },
      { text: 'Unlimited Response view' },
      { text: `View 2 ${isBusiness ? 'client' : "buyer's"} details (lead) that match your requirements` },
      {
        text: `Higher Position on ${entityTypeCap} Search for 10 Days`,
        subtext: '(2 days boosting on every 20th day)'
      }
    ]
  };

  const premiumTier: FeaturedTier = {
    id: 'premium',
    name: 'Premium',
    price: 4000,
    durationDays: 180,
    badgeIcon: 'fa-crown',
    headerBg: '#e1f0fa',
    accentColor: '#1e88e5',
    features: [
      { text: 'Higher Visibility' },
      { text: `Displaying Premium ${entityTypeCap} Above Priority Listing` },
      { text: 'Unlimited Response view' },
      { text: `View 4 ${isBusiness ? 'client' : "buyer's"} details (lead) that match your requirements` },
      {
        text: `Higher Position on ${entityTypeCap} Search for 40 Days`,
        subtext: '(4 days boosting on every 20th day)'
      }
    ]
  };

  const tiers = [priorityTier, premiumTier];

  const handleBuyNow = (tier: FeaturedTier) => {
    setSelectedTier(tier);
    setCheckoutModalOpen(true);
  };

  const handleSkip = () => {
    onNavigate('listing-detail', listing);
  };

  const supportPhone = '9992292828';
  const waMessage = selectedTier
    ? `Hello TradeCall Support, I have posted my ${entityType} listing #${listing.id} "${titleText}". I want to activate the ${selectedTier.name} Plan (₹${selectedTier.price}/- for ${selectedTier.durationDays} Days). Please verify and boost my listing.`
    : '';

  return (
    <div
      style={{
        background: '#f4f6f9',
        minHeight: '75vh',
        padding: '48px 16px 64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '44px 32px 36px',
          maxWidth: '840px',
          width: '100%',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#52c41a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '24px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
          }}
        >
          <i className="fas fa-check"></i>
        </div>

        {/* Heading in Red */}
        <h2
          style={{
            color: '#d32f2f',
            fontSize: '26px',
            fontWeight: 800,
            margin: '0 0 10px',
            letterSpacing: '-0.2px'
          }}
        >
          Congratulations!!
        </h2>

        {/* Confirmation Message */}
        <p
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1f2937',
            margin: '0 0 6px'
          }}
        >
          Your {entityType} details have been posted successfully
        </p>

        {/* Verification timeline notice */}
        <p
          style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: '0 0 28px',
            lineHeight: 1.5
          }}
        >
          Your {entityTypeCap} Details will be reflected online at <strong>tradecall.in</strong> within 24-48 Hours, Post verification process
        </p>

        {/* Highlighted Value Proposition Banner */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#334155',
            margin: '0 auto 28px',
            lineHeight: 1.4
          }}
        >
          <span style={{ color: '#1e88e5', fontWeight: 700 }}>
            Paid {entityTypeCap} Advertisements
          </span>{' '}
          get Faster responses &amp; get {isBusiness ? 'Deals' : 'Sold'} earlier
        </div>

        {/* Two Featured Plan Cards */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            margin: '0 auto 28px',
            maxWidth: '760px'
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                flex: '1 1 320px',
                maxWidth: '360px',
                minWidth: '290px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 3px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div>
                {/* Card Top Header */}
                <div
                  style={{
                    background: tier.headerBg || '#f8fafc',
                    padding: '24px 16px 18px',
                    textAlign: 'center',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      border: `1.5px solid ${tier.id === 'premium' ? '#0284c7' : '#94a3b8'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tier.id === 'premium' ? '#0284c7' : '#64748b',
                      fontSize: '20px',
                      marginBottom: '8px',
                      background: '#ffffff'
                    }}
                  >
                    <i className={`fas ${tier.badgeIcon}`}></i>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>
                    Mark this {entityType} as
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: tier.accentColor || '#111827'
                    }}
                  >
                    {tier.name}
                  </div>
                </div>

                {/* Price Bar */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    ₹ {tier.price}/-
                  </span>{' '}
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    Valid for {tier.durationDays} Days
                  </span>
                </div>

                {/* Features List with Blue Checks */}
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: '18px 20px 14px',
                    textAlign: 'left'
                  }}
                >
                  {tier.features.map((feat, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '13px',
                        color: '#334155',
                        lineHeight: 1.45,
                        marginBottom: idx === tier.features.length - 1 ? 0 : '12px'
                      }}
                    >
                      <i
                        className="fas fa-check"
                        style={{
                          color: '#1e88e5',
                          fontSize: '13px',
                          marginTop: '2px',
                          flexShrink: 0
                        }}
                      ></i>
                      <div>
                        <div>{feat.text}</div>
                        {feat.subtext && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {feat.subtext}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* BUY NOW Button */}
              <div style={{ padding: '12px 20px 22px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleBuyNow(tier)}
                  style={{
                    background: '#1e88e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 36px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(30, 136, 229, 0.3)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1e88e5')}
                >
                  BUY NOW
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Skip Button */}
        <div>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '8px 44px',
              fontSize: '13px',
              color: '#4b5563',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Skip
          </button>
        </div>

        {/* Secondary Navigation Options */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '13px',
            color: '#6b7280',
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('listing-detail', listing)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0c6253',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0
            }}
          >
            View Listing
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate('account')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0c6253',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0
            }}
          >
            My Account
          </button>
        </div>
      </div>

      {/* Upgrade / Checkout Modal */}
      {checkoutModalOpen && selectedTier && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCheckoutModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCheckoutModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '15px'
              }}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: selectedTier.id === 'premium' ? '#e0f2fe' : '#f1f5f9',
                  color: selectedTier.id === 'premium' ? '#0284c7' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '10px'
                }}
              >
                <i className={`fas ${selectedTier.badgeIcon}`}></i>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                Activate {selectedTier.name} Advertisement
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                Listing: <strong>{titleText}</strong>
              </p>
            </div>

            {/* Plan Price Summary */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                  {selectedTier.name} Plan ({selectedTier.durationDays} Days)
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0c6253' }}>
                  ₹{selectedTier.price.toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                ✓ Includes search boost &amp; verified promotion badge once approved by TradeCall.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* WhatsApp Instant Booking */}
              <a
                href={`https://wa.me/91${supportPhone}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
                }}
              >
                <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i>
                Instant Booking via WhatsApp
              </a>

              {/* Pay Online via Cashfree Modal */}
              <button
                type="button"
                onClick={() => {
                  setCheckoutModalOpen(false);
                  setPlansModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0c6253',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(12, 98, 83, 0.3)'
                }}
              >
                <i className="fas fa-credit-card"></i>
                Pay Online (UPI / Card / NetBanking)
              </button>

              {/* Call Support Direct */}
              <a
                href={`tel:${supportPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                <i className="fas fa-phone-alt"></i>
                Call Support: +91 {supportPhone}
              </a>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setCheckoutModalOpen(false);
                  handleSkip();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Skip for now &amp; view listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online Featured Payment Checkout */}
      <PlansModal
        isOpen={plansModalOpen}
        planType="featured"
        listing={listing}
        onClose={() => setPlansModalOpen(false)}
        onSuccess={() => {
          setPlansModalOpen(false);
          onNavigate('listing-detail', listing);
        }}
      />
    </div>
  );
}
