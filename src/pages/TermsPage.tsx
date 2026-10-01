import { useState } from 'react';
import type { NavigateFunction } from '../types';

export interface TermsPageProps {
  onNavigate?: NavigateFunction;
  initialTab?: 'terms' | 'privacy';
}

export default function TermsPage({ onNavigate: _onNavigate, initialTab = 'terms' }: TermsPageProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <div className="terms-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className={activeTab === 'terms' ? 'fas fa-file-contract' : 'fas fa-shield-alt'}></i>{' '}
            {activeTab === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            TradeCall India — Official Legal Agreement &amp; Policies (Last updated: September 2026)
          </p>

          {/* Quick Tab Switcher */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '4px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              style={{
                border: 'none',
                background: activeTab === 'terms' ? '#fff' : 'transparent',
                color: activeTab === 'terms' ? '#0c6253' : '#fff',
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              <i className="fas fa-file-contract" style={{ marginRight: '6px' }}></i> Terms of Use
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              style={{
                border: 'none',
                background: activeTab === 'privacy' ? '#fff' : 'transparent',
                color: activeTab === 'privacy' ? '#0c6253' : '#fff',
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
            >
              <i className="fas fa-shield-alt" style={{ marginRight: '6px' }}></i> Privacy Policy
            </button>
          </div>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            
            {activeTab === 'terms' ? (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  1. Acceptance of Terms
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  By accessing or using TradeCall India (tradecall.in), you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  2. Use of Service
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  TradeCall India provides an online platform for property and business listings across Palwal, Faridabad, Gurugram, Sonipat, Panipat, Hodal, Hathin, Delhi, and Noida. You agree to use the service only for lawful purposes. You must not post false, misleading, or fraudulent listings.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  3. Listing Policy
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  All property and business listings must be genuine. We reserve the right to review, approve, stamp, or remove any listing that violates our policies. Listings must include accurate information regarding property category, price, dimensions, and owner/broker contact details.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  4. Prohibited Content
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  You may not post content that is illegal, defamatory, obscene, or that infringes intellectual property rights. Spam listings, duplicate listings, and misleading contact information are strictly prohibited.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  5. Direct Connect &amp; Lead Consumption
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  TradeCall India provides direct owner connect features for registered users. Consuming lead credits to view contact information is subject to your subscription plan. Users are advised to verify property ownership and RERA documentation independently.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  6. Limitation of Liability
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  TradeCall India acts as an intermediary platform connecting buyers, sellers, brokers, and related businesses. We do not participate in negotiations or transactions, and are not liable for disputes arising between contracting parties.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  7. Contact Information
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
                  For questions regarding these terms, reach us at{' '}
                  <a href="mailto:support.tradecall@gmail.com" style={{ color: '#0c6253', fontWeight: 600 }}>
                    support.tradecall@gmail.com
                  </a>{' '}
                  or WhatsApp at <strong>+91 9992292828</strong>.
                </p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  1. Information We Collect
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  We collect information you provide directly to us when creating an account, posting property/business listings, or reaching out for support. This includes name, phone number, email address, role (Owner, Broker, Builder), and property specifications.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  2. How We Use Your Information
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  Your information is utilized to display listings, facilitate lead inquiries, verify legitimate accounts, send OTP verification codes, process subscription plans, and safeguard against fraudulent listings.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  3. Contact Privacy &amp; Number Masking
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  Contact numbers on listings are protected against unauthorized scraping. Registered users with active lead credits can reveal authentic owner contacts for genuine property discussions.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  4. Cookies &amp; Local Sessions
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
                  We use essential HTTP-only cookies and local session storage to maintain authentication status, CSRF tokens, and search filter preferences.
                </p>

                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
                  5. Inquiries &amp; Grievance Redressal
                </h2>
                <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
                  For data privacy inquiries or account deletion requests, write to{' '}
                  <a href="mailto:support.tradecall@gmail.com" style={{ color: '#0c6253', fontWeight: 600 }}>
                    support.tradecall@gmail.com
                  </a>.
                </p>
              </div>
            )}

          </div>
        </div>
      </section>
    </div>
  );
}
