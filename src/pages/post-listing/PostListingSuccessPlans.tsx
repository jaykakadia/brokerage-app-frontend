import { useState, useEffect } from 'react';
import type { Listing, NavigateFunction, Plan } from '../../types';
import { isBusinessListing, publicListingTitle } from '../../utils/listingKind';
import { getPlans } from '../../services/api';
import PlansModal from '../../components/PlansModal';

export interface PostListingSuccessPlansProps {
  listing: Listing;
  onNavigate: NavigateFunction;
}

const FALLBACK_FEATURED_PLANS: Plan[] = [
  {
    id: 6,
    name: 'Featured 30',
    plan_type: 'featured',
    price: 599,
    duration_days: 30,
    listing_limit: 0,
    leads_count: 0,
    description: 'Listing on Top of Page for 30 Days.',
    status: 'active',
    sort_order: 0,
    created_at: '2026-10-03T15:30:19.632402Z',
    updated_at: '2026-10-10T00:47:21.335598Z'
  },
  {
    id: 5,
    name: 'Featured 50',
    plan_type: 'featured',
    price: 999,
    duration_days: 50,
    listing_limit: 0,
    leads_count: 0,
    description: 'Display Listing for 50 days on Top of Page.',
    status: 'active',
    sort_order: 1,
    created_at: '2026-10-03T15:29:15.447824Z',
    updated_at: '2026-10-21T04:41:02.881943Z'
  },
  {
    id: 9,
    name: 'Featured 365',
    plan_type: 'featured',
    price: 8999,
    duration_days: 365,
    listing_limit: 0,
    leads_count: 0,
    description: 'Full year featured placement on Top of Page.',
    status: 'active',
    sort_order: 2,
    created_at: '2026-10-07T09:29:02.043979Z',
    updated_at: '2026-10-07T09:30:41.494001Z'
  }
];

export default function PostListingSuccessPlans({ listing, onNavigate }: PostListingSuccessPlansProps) {
  const isBusiness = isBusinessListing(listing);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_FEATURED_PLANS);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  const titleText = publicListingTitle(listing);
  const entityType = isBusiness ? 'business' : 'property';
  const entityTypeCap = isBusiness ? 'Business' : 'Property';

  useEffect(() => {
    let mounted = true;
    void getPlans(false, 'featured')
      .then((res) => {
        if (!mounted) return;
        const list = (res.data?.data || []) as Plan[];
        if (list.length > 0) {
          list.sort((a, b) => Number(a.price) - Number(b.price));
          setPlans(list);
        }
      })
      .catch((err) => {
        console.error('Failed to load featured plans for post-listing screen:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getPlanVisuals = (index: number, total: number) => {
    // If 3 plans: 1st is Star, 2nd is Most Popular Award, 3rd is Crown Best Value
    if (total >= 3 && index === total - 1) {
      return {
        badgeIcon: 'fa-crown',
        headerBg: '#fef3c7',
        accentColor: '#b45309',
        iconColor: '#d97706',
        borderColor: '#f59e0b',
        tag: 'BEST VALUE',
        buttonBg: '#1e88e5'
      };
    }
    if ((total >= 2 && index === 1) || (total === 1 && index === 0)) {
      return {
        badgeIcon: 'fa-award',
        headerBg: '#e1f0fa',
        accentColor: '#1e88e5',
        iconColor: '#0284c7',
        borderColor: '#1e88e5',
        tag: total >= 2 ? 'MOST POPULAR' : null,
        buttonBg: '#1e88e5'
      };
    }
    return {
      badgeIcon: 'fa-star',
      headerBg: '#f8fafc',
      accentColor: '#0c6253',
      iconColor: '#0c6253',
      borderColor: '#e2e8f0',
      tag: null,
      buttonBg: '#1e88e5'
    };
  };

  const getPlanFeatures = (plan: Plan) => {
    const items: string[] = [
      'Promoted on Homepage & Featured Section',
      `Displaying ${plan.name} Above Free Listings`,
      'Distinctive Featured Badge for high credibility',
      `Priority Reach to Genuine ${isBusiness ? 'Clients' : 'Buyers & Tenants'}`,
      `Active Featured Promotion for ${plan.duration_days} Days`
    ];
    if (plan.description && plan.description.trim()) {
      items.push(plan.description.trim());
    }
    return items;
  };

  const handleBuyNow = (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutModalOpen(true);
  };

  const handleSkip = () => {
    onNavigate('listing-detail', listing);
  };

  const supportPhone = '9992292828';
  const waMessage = selectedPlan
    ? `Hello TradeCall Support, I have posted my ${entityType} listing #${listing.id} "${titleText}". I want to activate the ${selectedPlan.name} Plan (₹${Number(selectedPlan.price).toLocaleString('en-IN')}/- for ${selectedPlan.duration_days} Days). Please feature my listing.`
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
          padding: '44px 28px 36px',
          maxWidth: '1040px',
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

        {/* Featured Listing Plan Cards */}
        {loading && plans.length === 0 ? (
          <div style={{ padding: '40px 0', color: '#6b7280' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#1e88e5', marginBottom: '10px' }}></i>
            <div>Loading featured plans...</div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '20px',
              justifyContent: 'center',
              alignItems: 'stretch',
              flexWrap: 'wrap',
              margin: '0 auto 28px',
              maxWidth: '1000px'
            }}
          >
            {plans.map((plan, idx) => {
              const visuals = getPlanVisuals(idx, plans.length);
              const features = getPlanFeatures(plan);
              const isHighlighted = !!visuals.tag;

              return (
                <div
                  key={plan.id}
                  style={{
                    flex: '1 1 280px',
                    maxWidth: '340px',
                    minWidth: '260px',
                    border: isHighlighted ? `2px solid ${visuals.borderColor}` : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isHighlighted ? '0 8px 24px rgba(30, 136, 229, 0.12)' : '0 3px 12px rgba(0,0,0,0.05)',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                >
                  {/* Tag if popular or best value */}
                  {visuals.tag && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '12px',
                        background: visuals.accentColor,
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.5px',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        zIndex: 2
                      }}
                    >
                      {visuals.tag}
                    </div>
                  )}

                  <div>
                    {/* Card Top Header */}
                    <div
                      style={{
                        background: visuals.headerBg || '#f8fafc',
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
                          border: `1.5px solid ${visuals.iconColor}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: visuals.iconColor,
                          fontSize: '20px',
                          marginBottom: '8px',
                          background: '#ffffff'
                        }}
                      >
                        <i className={`fas ${visuals.badgeIcon}`}></i>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>
                        Mark this {entityType} as
                      </div>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: visuals.accentColor || '#111827'
                        }}
                      >
                        {plan.name}
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
                        ₹ {Number(plan.price).toLocaleString('en-IN')}/-
                      </span>{' '}
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        Valid for {plan.duration_days} Days
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
                      {features.map((feat, fIdx) => (
                        <li
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: 1.45,
                            marginBottom: fIdx === features.length - 1 ? 0 : '12px'
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
                          <div>{feat}</div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* BUY NOW Button */}
                  <div style={{ padding: '12px 20px 22px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleBuyNow(plan)}
                      style={{
                        background: visuals.buttonBg,
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
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1565c0')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = visuals.buttonBg)}
                    >
                      BUY NOW
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
      {checkoutModalOpen && selectedPlan && (
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
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  marginBottom: '10px'
                }}
              >
                <i className="fas fa-star"></i>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                Activate {selectedPlan.name} Advertisement
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
                  {selectedPlan.name} Plan ({selectedPlan.duration_days} Days)
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0c6253' }}>
                  ₹{Number(selectedPlan.price).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                ✓ Includes top placement on Homepage &amp; Search results, plus verified featured badge once approved by TradeCall.
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
        initialPlanId={selectedPlan?.id ?? null}
        onClose={() => setPlansModalOpen(false)}
        onSuccess={() => {
          setPlansModalOpen(false);
          onNavigate('listing-detail', listing);
        }}
      />
    </div>
  );
}
