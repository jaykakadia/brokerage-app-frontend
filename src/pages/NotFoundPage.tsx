import { useEffect } from 'react';
import type { NavigateFunction } from '../types';
import { setSeo } from '../utils/seo';

interface NotFoundPageProps {
  onNavigate: NavigateFunction;
}

export default function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  useEffect(() => {
    setSeo({
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
      noindex: true,
    });
  }, []);
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center',
      background: '#f8fafc'
    }}>
      <div style={{
        background: '#fff',
        padding: '48px 36px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        maxWidth: '520px',
        width: '100%'
      }}>
        <div style={{
          fontSize: '64px',
          fontWeight: 800,
          color: '#0c6253',
          lineHeight: 1,
          marginBottom: '16px'
        }}>
          404
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '12px'
        }}>
          Page or City Not Found
        </h1>
        <p style={{
          fontSize: '15px',
          color: '#64748b',
          lineHeight: 1.6,
          marginBottom: '28px'
        }}>
          We couldn't find the location or page you were looking for. Explore verified properties across India below.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/cities"
            onClick={(e) => { e.preventDefault(); onNavigate('cities'); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#0c6253',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <i className="fas fa-city"></i> Browse All Cities
          </a>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#e2e8f0',
              color: '#1e293b',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <i className="fas fa-home"></i> Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
