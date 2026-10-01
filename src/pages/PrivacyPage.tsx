import type { NavigateFunction } from '../types';

export interface PrivacyPageProps {
  onNavigate?: NavigateFunction;
}

export default function PrivacyPage({ onNavigate: _onNavigate }: PrivacyPageProps) {
  return (
    <div className="privacy-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-shield-alt"></i> Privacy Policy
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            Last updated: September 2025
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              1. Information We Collect
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              We collect information you provide directly to us, such as when you create an account, post a listing, or contact us. This includes your name, email address, phone number, and property details.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              2. How We Use Your Information
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              3. Information Sharing
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              We do not share your personal information with third parties except as described in this privacy policy. We may share your information with vendors and service providers that perform services on our behalf.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              4. Listing Information
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              When you post a listing on TradeCall India, the listing information including your contact details may be visible to registered users. You can control your contact visibility in your account settings.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              5. Cookies
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve and analyze our service.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              6. Contact Us
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:support.tradecall@gmail.com" style={{ color: '#0c6253', fontWeight: 600 }}>
                support.tradecall@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
