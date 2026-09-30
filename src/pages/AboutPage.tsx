import type { NavigateFunction } from '../types';

export interface AboutPageProps {
  onNavigate?: NavigateFunction;
}

export default function AboutPage({ onNavigate: _onNavigate }: AboutPageProps) {
  return (
    <div className="about-page">
      <section className="page-hero green-hero" style={{ background: 'linear-gradient(135deg, #0c6253, #14a37a)', color: '#fff', padding: '50px 20px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px' }}>
            <i className="fas fa-info-circle"></i> About TradeCall India
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            Palwal's trusted property and business directory for NCR Haryana
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 20px', background: '#f4f6f9' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center', marginBottom: '60px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0c6253', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                Our Story
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px', color: '#1a1a2e' }}>
                The Property Portal Built for Haryana
              </h2>
              <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '16px' }}>
                TradeCall India was founded with a simple mission: to make property search and listing easy, transparent, and free for people across Palwal, Faridabad, Gurugram, Sonipat, and other Haryana NCR cities.
              </p>
              <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '16px' }}>
                We noticed that existing portals focused on metro cities and often charged high fees. We built TradeCall India specifically for the Haryana NCR belt.
              </p>
              <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
                Today, we serve users across 16 cities with a growing database of verified property listings.
              </p>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#0c6253,#14a37a)', borderRadius: '20px', padding: '30px', color: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>500+</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Active Listings</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>16</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Cities Covered</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>100%</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Direct Owner Contacts</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>0%</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Brokerage Fees</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', marginBottom: '12px' }}>Why Choose TradeCall India?</h2>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Direct connections between buyers and property owners</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
                <i className="fas fa-handshake"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Zero Brokerage</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>Direct contact between buyers, sellers, and tenants without heavy middleman commissions.</p>
            </div>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Verified Listings</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>Our local field associates review and verify property details across Palwal and Haryana NCR.</p>
            </div>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0fdf4', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>
                <i className="fas fa-map-marked-alt"></i>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Hyperlocal Focus</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>Targeted reach covering Palwal, Hodal, Hathin, Faridabad, Gurugram, Sonipat, and Delhi.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
