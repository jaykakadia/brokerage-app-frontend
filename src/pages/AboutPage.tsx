import { useEffect, useState } from 'react';
import type { NavigateFunction } from '../types';
import type { ListingStatsResponse } from '../types/listing';
import { getListingStats } from '../services/api';

export interface AboutPageProps {
  onNavigate?: NavigateFunction;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const [stats, setStats] = useState<ListingStatsResponse | null>(null);

  useEffect(() => {
    getListingStats()
      .then((res) => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const activeListings = stats && stats.active_listings > 0 ? `${stats.active_listings}+` : '56+';
  const citiesCovered = stats && stats.cities_covered > 0 ? stats.cities_covered : 16;
  const registeredUsers = stats && stats.registered_users > 0 ? `${stats.registered_users}+` : '12+';
  const featuredListings = stats && stats.featured_listings > 0 ? stats.featured_listings : 8;

  return (
    <div className="about-page">
      <section className="page-hero green-hero">
        <div className="container">
          <h1>
            <i className="fas fa-info-circle"></i> About TradeCall India
          </h1>
          <p>Palwal's trusted property and business directory for NCR Haryana</p>
        </div>
      </section>

      <section style={{ padding: '60px 0', background: '#f4f6f9' }}>
        <div className="container">
          <div className="grid-2-col" style={{ gap: '50px', alignItems: 'center', marginBottom: '60px' }}>
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
            <div style={{ background: 'linear-gradient(135deg,#0c6253,#14a37a)', borderRadius: '20px', padding: '24px', color: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{activeListings}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Active Listings</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{citiesCovered}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Cities Covered</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{registeredUsers}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Registered Users</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{featuredListings}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Featured Listings</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '20px', padding: '50px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, textAlign: 'center', marginBottom: '36px' }}>Why Choose TradeCall India?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '24px' }}>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '36px', color: '#0c6253', marginBottom: '12px' }}>
                  <i className="fas fa-rupee-sign"></i>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>100% Free Listings</h3>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Post unlimited property and business listings at no cost</p>
              </div>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '36px', color: '#0c6253', marginBottom: '12px' }}>
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Verified Listings</h3>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Our team verifies listings to ensure accuracy and trust</p>
              </div>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '36px', color: '#0c6253', marginBottom: '12px' }}>
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Local Focus</h3>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Built specifically for NCR Haryana with local expertise</p>
              </div>
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '36px', color: '#0c6253', marginBottom: '12px' }}>
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Direct Connect</h3>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Enquiries go directly to owner - no middleman</p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,#0c6253,#14a37a)', borderRadius: '20px', padding: '50px', color: '#fff' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Ready to Get Started?</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '24px' }}>Join property owners, buyers, and agents on TradeCall India</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onNavigate?.('post-listing')}
                style={{ padding: '12px 28px', background: '#f97316', color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-plus"></i> Post Free Listing
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('home')}
                style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-search"></i> Browse Listings
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
