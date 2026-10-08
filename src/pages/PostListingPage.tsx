import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ListingWizard from './post-listing/ListingWizard';
import type { Listing, NavigateFunction } from '../types';

export interface PostListingPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: () => void;
}

export default function PostListingPage({ onNavigate, onOpenAuth }: PostListingPageProps) {
  const { user } = useAuth();
  const [successListing, setSuccessListing] = useState<Listing | null>(null);

  if (!user) {
    return (
      <>
        <section className="page-hero green-hero">
          <div className="container">
            <h1><i className="fas fa-plus-circle"></i> Post a Listing</h1>
            <p>Reach thousands of buyers and tenants for FREE</p>
          </div>
        </section>
        <section style={{ background: '#f4f6f9', minHeight: '60vh', padding: '40px 20px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
            <div style={{ fontSize: 56, color: '#0c6253', marginBottom: 16 }}><i className="fas fa-lock"></i></div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Post a Listing</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Please sign in to access this feature.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={onOpenAuth}><i className="fas fa-sign-in-alt"></i> Sign In / Register</button>
              <button type="button" className="btn-outline" onClick={() => onNavigate('home')}>Home</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (successListing) {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 56, color: '#0c6253', marginBottom: 16 }}><i className="fas fa-check-circle"></i></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Listing Submitted Successfully!</h2>
          <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
            Your listing <strong>{successListing.title}</strong> has been saved and is waiting for approval.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button type="button" className="btn-primary" onClick={() => onNavigate('listing-detail', successListing)}>View Listing</button>
            <button type="button" className="btn-outline" onClick={() => onNavigate('account')}>My Account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="page-hero green-hero">
        <div className="container">
          <h1><i className="fas fa-plus-circle"></i> Post a Listing</h1>
          <p>Reach thousands of buyers and tenants for FREE</p>
        </div>
      </section>
      <section className="post-section">
        <div className="post-wrap post-card-highlight" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 28 }}>
          <div className="post-card-head">
            <span className="post-card-icon"><i className="fas fa-plus"></i></span>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0c6253' }}>Add New Listing</h2>
              <p className="sub" style={{ color: '#475569', margin: 0, fontSize: 14 }}>
                Logged in as <strong>{user.name}</strong>. Submit for approval.
              </p>
            </div>
          </div>
          <ListingWizard onSaved={setSuccessListing} onRequireAuth={onOpenAuth} />
        </div>
      </section>
    </>
  );
}
