import { useState, useEffect } from 'react';
import { getPlans } from '../services/api';
import type { NavigateFunction } from '../types';

export interface AdvertisePageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: () => void;
}

interface AdvertisePlan {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  colorTheme: string;
}

export default function AdvertisePage({ onNavigate, onOpenAuth: _onOpenAuth }: AdvertisePageProps) {
  const defaultPlans: AdvertisePlan[] = [
    {
      id: 'free',
      name: 'FREE',
      price: '₹0',
      duration: 'per listing / forever',
      features: ['+ 1 active listing', '+ Standard listing position', '+ Contact visible to users', '- Featured badge', '- Priority placement'],
      isPopular: false,
      buttonText: 'Get Started Free',
      colorTheme: 'gray'
    },
    {
      id: 'boosted',
      name: 'BOOSTED',
      price: '₹999',
      duration: 'per month',
      features: ['+ 3 active listings', '+ Boosted badge', '+ Top of search results', '+ 10x more enquiries', '- Featured carousel'],
      isPopular: true,
      buttonText: 'Boost Now',
      colorTheme: 'orange'
    },
    {
      id: 'premium',
      name: 'PREMIUM',
      price: '₹2,499',
      duration: 'per month',
      features: ['+ 10 active listings', '+ Premium + Boosted badge', '+ Featured carousel slot', '+ Homepage banner', '+ Priority support'],
      isPopular: false,
      buttonText: 'Go Premium',
      colorTheme: 'orange-border'
    },
    {
      id: 'enterprise',
      name: 'ENTERPRISE',
      price: 'Custom',
      duration: 'contact for pricing',
      features: ['+ Unlimited listings', '+ Agency / Builder plan', '+ Dedicated account manager', '+ Banner + Email campaigns', '+ Custom branding'],
      isPopular: false,
      buttonText: 'Contact Sales',
      colorTheme: 'indigo'
    }
  ];

  const [plans, setPlans] = useState<AdvertisePlan[]>(defaultPlans);

  useEffect(() => {
    const fetchPlans = async (): Promise<void> => {
      try {
        const res = await getPlans(false);
        const data = res.data?.data || [];
        if (data.length > 0) {
          const serverPlans: AdvertisePlan[] = data.map((p) => ({
            id: String(p.id),
            name: p.name.toUpperCase(),
            price: `₹${p.price}`,
            duration: `${p.leads_count} Leads / ${p.duration_days} Days`,
            features: [
              `+ ${p.leads_count} Direct Contact Reveals`,
              `+ Active for ${p.duration_days} Days`,
              '+ Verified Seller Support',
              '+ Real-time Analytics'
            ],
            isPopular: p.leads_count >= 5,
            buttonText: 'Buy Plan',
            colorTheme: p.leads_count >= 5 ? 'orange' : 'gray'
          }));
          setPlans(serverPlans);
        }
      } catch {
        // Fallback to default plans
      }
    };
    void fetchPlans();
  }, []);

  return (
    <div className="advertise-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-chart-line"></i> Advertise with TradeCall India
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            Boost your property or business visibility across NCR Haryana
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '10px', color: '#1a1a2e' }}>
              Choose Your Plan
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Flexible options for property owners, dealers, and businesses
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px', marginBottom: '60px' }}>
            {plans.map((plan) => {
              let themeColor = '#0c6253';
              let bg = '#fff';
              const borderColor = '#e5e7eb';
              let btnBg = 'transparent';
              let btnColor = themeColor;
              let btnBorder = `1.5px solid ${themeColor}`;
              let textBase = '#374151';
              let textMuted = '#9ca3af';

              if (plan.colorTheme === 'orange') {
                themeColor = '#5efbca';
                bg = 'linear-gradient(135deg,#0a2e25,#0c6253)';
                btnBg = '#f97316';
                btnColor = '#fff';
                btnBorder = 'none';
                textBase = 'rgba(255,255,255,0.9)';
                textMuted = 'rgba(255,255,255,0.7)';
              } else if (plan.colorTheme === 'orange-border') {
                themeColor = '#f97316';
                btnBg = '#f97316';
                btnColor = '#fff';
                btnBorder = 'none';
              } else if (plan.colorTheme === 'indigo') {
                themeColor = '#6366f1';
                btnColor = '#6366f1';
                btnBorder = '1.5px solid #6366f1';
              }

              return (
                <div
                  key={plan.id}
                  style={{
                    background: bg,
                    borderRadius: '20px',
                    padding: '30px',
                    border: plan.colorTheme === 'orange' ? 'none' : `2px solid ${borderColor}`,
                    textAlign: 'center',
                    position: 'relative',
                    boxShadow: plan.colorTheme === 'orange' ? '0 10px 40px rgba(12,98,83,0.3)' : '0 4px 16px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {plan.isPopular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#f97316',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 16px',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: plan.colorTheme === 'orange' ? 'rgba(255,255,255,0.8)' : themeColor,
                      marginBottom: '12px'
                    }}
                  >
                    {plan.name}
                  </div>

                  <div
                    style={{
                      fontSize: '36px',
                      fontWeight: 800,
                      color: plan.colorTheme === 'orange' ? '#fff' : '#1a1a2e',
                      marginBottom: '4px'
                    }}
                  >
                    {plan.price}
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      color: plan.colorTheme === 'orange' ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                      marginBottom: '24px'
                    }}
                  >
                    {plan.duration}
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', flex: 1 }}>
                    {plan.features.map((f, idx) => {
                      const isCheck = f.trim().startsWith('+');
                      const icon = isCheck ? 'fa-check' : 'fa-times';
                      const iconColor = isCheck ? (plan.colorTheme === 'orange' ? '#5efbca' : '#0c6253') : (plan.colorTheme === 'orange' ? 'rgba(255,255,255,0.4)' : '#d1d5db');
                      const textColor = isCheck ? textBase : textMuted;
                      const featText = f.trim().substring(1).trim();

                      return (
                        <li key={idx} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: textColor, alignItems: 'center' }}>
                          <i className={`fas ${icon}`} style={{ color: iconColor, width: '16px' }}></i>
                          <span>{featText}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      if (plan.id === 'enterprise') {
                        onNavigate('contact');
                      } else {
                        onNavigate('account');
                      }
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      background: btnBg,
                      border: btnBorder,
                      borderRadius: '10px',
                      color: btnColor,
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom plan WhatsApp banner */}
          <div
            style={{
              background: 'linear-gradient(135deg,#0c6253,#14a37a)',
              borderRadius: '20px',
              padding: '36px 24px',
              textAlign: 'center',
              color: '#fff'
            }}
          >
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>
              Need a custom plan?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '24px', fontSize: '15px' }}>
              For builders, agencies, and businesses with multiple properties across NCR Haryana.
            </p>
            <a
              href="https://wa.me/919992292828?text=Hello%20TradeCall%20India,%20I%20am%20interested%20in%20a%20Custom%20Advertising%20Plan"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                background: '#25d366',
                color: '#fff',
                borderRadius: '30px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}
            >
              <i className="fab fa-whatsapp" style={{ fontSize: '18px' }}></i> WhatsApp Us for Custom Plan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
