import React from 'react';

export default function TermsPage({ onNavigate }) {
  return (
    <div className="terms-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-file-contract"></i> Terms of Use
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
              1. Acceptance of Terms
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              By accessing or using TradeCall India, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              2. Use of Service
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              TradeCall India provides an online platform for property and business listings. You agree to use the service only for lawful purposes. You must not post false, misleading, or fraudulent listings.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              3. Listing Policy
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              All listings must be genuine. We reserve the right to remove any listing that violates our policies. Listings must include accurate information about the property, price, and contact details.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              4. Prohibited Content
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              You may not post content that is illegal, defamatory, obscene, or that infringes intellectual property rights. Spam listings, duplicate listings, and misleading content are strictly prohibited.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              5. Limitation of Liability
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '24px' }}>
              TradeCall India acts as an intermediary platform. We are not responsible for the accuracy of listings or the outcome of any transactions between users. Users are advised to verify all information independently.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#0c6253' }}>
              6. Contact
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
              For questions about these terms, contact us at{' '}
              <a href="mailto:tradecall.in@gmail.com" style={{ color: '#0c6253', fontWeight: 600 }}>
                tradecall.in@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
