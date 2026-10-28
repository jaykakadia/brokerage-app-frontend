import { useEffect, useState } from 'react';
import { FOOTER_TOP_CITIES, POPULAR_LOCALITIES } from '../config/cities';
import type { NavigateFunction } from '../types';
import { getSocialLinks } from '../services/api';
import type { SocialLinksSettings } from '../types/setting';

export interface FooterProps {
  onCitySelect: (city: string) => void;
  onNavigate: NavigateFunction;
}

export default function Footer({ onNavigate }: FooterProps) {
  const [links, setLinks] = useState<SocialLinksSettings>({
    facebook_url: 'https://facebook.com',
    instagram_url: 'https://instagram.com',
    youtube_url: 'https://youtube.com',
    whatsapp_number: '9992292828',
    support_email: 'support.tradecall@gmail.com',
  });

  useEffect(() => {
    let active = true;
    getSocialLinks()
      .then((res) => {
        if (active && res.data?.data) {
          setLinks((prev) => ({ ...prev, ...res.data.data }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cleanPhone = (links.whatsapp_number || '9992292828').replace(/\D/g, '').slice(-10);

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-col brand-col">
          <div className="footer-logo">
            <span className="logo-text" style={{ fontSize: '20px' }}>
              <span className="logo-tradecall">TradeCall</span>
              <span className="logo-india">India</span>
            </span>
          </div>
          <p>A Trusted Property and Business Listing Company serving all over India.</p>
          <div className="footer-email" style={{ marginBottom: '8px' }}>
            <a href={`mailto:${links.support_email || 'support.tradecall@gmail.com'}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <i className="fas fa-envelope"></i> {links.support_email || 'support.tradecall@gmail.com'}
            </a>
          </div>
          <div className="footer-phone" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)' }}>
            <a
              href={`https://wa.me/91${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <i className="fab fa-whatsapp"></i> {links.whatsapp_number || '9992292828'} (WhatsApp)
            </a>
          </div>
          <div className="footer-address" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', lineHeight: 1.4 }}>
            <i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i>
            Palwal, Haryana
          </div>
          <div className="footer-social" style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            {links.facebook_url && (
              <a href={links.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} title="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
            )}
            {links.instagram_url && (
              <a href={links.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} title="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
            )}
            {links.youtube_url && (
              <a href={links.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }} title="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            )}
          </div>
        </div>

        <div className="footer-col">
          <h4>Top Cities</h4>
          <ul>
            {FOOTER_TOP_CITIES.map((c) => (
              <li key={c.slug}>
                <a
                  href={`/properties/${c.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', c.slug);
                  }}
                >
                  Properties in {c.name}
                </a>
              </li>
            ))}
            <li style={{ marginTop: '6px' }}>
              <a
                href="/cities"
                style={{ fontWeight: 700, color: '#38bdf8' }}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('cities');
                }}
              >
                All Cities in India →
              </a>
            </li>
            <li style={{ marginTop: '6px' }}><a href="/hi/properties/palwal">पलवल में प्रॉपर्टी (हिंदी)</a></li>
            <li><a href="/hi/properties/faridabad">फरीदाबाद में प्रॉपर्टी (हिंदी)</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Popular Localities</h4>
          <ul>
            {POPULAR_LOCALITIES.map((loc) => (
              <li key={loc.slug}>
                <a
                  href={`/${loc.citySlug}/${loc.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', `${loc.citySlug}/${loc.slug}`);
                  }}
                >
                  {loc.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Home</a></li>
            <li><a href="/business-directory" onClick={(e) => { e.preventDefault(); onNavigate('business-directory'); }}>Business Directory</a></li>
            <li><a href="/blog" onClick={(e) => { e.preventDefault(); onNavigate('blog'); }}>Buyer Guides & Blog</a></li>
            <li><a href="/advertise" onClick={(e) => { e.preventDefault(); onNavigate('advertise'); }}>Advertise with Us</a></li>
            <li><a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('about'); }}>About Us</a></li>
            <li><a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>Contact Us</a></li>
            <li><a href="/faq" onClick={(e) => { e.preventDefault(); onNavigate('faq'); }}>FAQs</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="footer-copy">© 2026 TradeCall India. All rights reserved.</div>
          <div className="footer-legal" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms-of-use" onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Terms of Use</a>
            <a href="/faq" onClick={(e) => { e.preventDefault(); onNavigate('faq'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>FAQs</a>
            <a href="/blog" onClick={(e) => { e.preventDefault(); onNavigate('blog'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Blog</a>
            <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('about'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>About Us</a>
            <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Contact</a>
            <a href="/advertise" onClick={(e) => { e.preventDefault(); onNavigate('advertise'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Advertise</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
