import type { NavigateFunction } from '../types';

export interface FooterProps {
  onCitySelect: (city: string) => void;
  onNavigate: NavigateFunction;
}

export default function Footer({ onCitySelect, onNavigate }: FooterProps) {
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
          <p>Palwal's trusted property and business directory serving the NCR/Haryana corridor.</p>
          <div className="footer-email" style={{ marginBottom: '8px' }}>
            <i className="fas fa-envelope"></i> tradecall.in@gmail.com
          </div>
          <div className="footer-phone" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)' }}>
            <i className="fab fa-whatsapp"></i> 9992292828 (WhatsApp)
          </div>
          <div className="footer-social" style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}><i className="fab fa-facebook-f"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}><i className="fab fa-instagram"></i></a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff' }}><i className="fab fa-youtube"></i></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Cities We Cover</h4>
          <ul>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Palwal'); }}>Properties in Palwal</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Faridabad'); }}>Properties in Faridabad</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Gurugram'); }}>Properties in Gurugram</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Sonipat'); }}>Properties in Sonipat</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Hodal'); }}>Properties in Hodal</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Delhi'); }}>Properties in Delhi</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Property Types</h4>
          <ul>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Flats / Apartments</a></li>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Independent Houses</a></li>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Residential Plots</a></li>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Commercial Shops</a></li>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Office Space</a></li>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Agricultural Land</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Home</a></li>
            <li><a href="/blog" onClick={(e) => { e.preventDefault(); onNavigate('blog'); }}>Blog</a></li>
            <li><a href="/advertise" onClick={(e) => { e.preventDefault(); onNavigate('advertise'); }}>Advertise with Us</a></li>
            <li><a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('about'); }}>About Us</a></li>
            <li><a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}>Contact Us</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="footer-copy">© 2026 TradeCall India. All rights reserved.</div>
          <div className="footer-legal" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigate('privacy'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/Terms-of-use-tradecall-India" onClick={(e) => { e.preventDefault(); onNavigate('terms'); }} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Terms of Use</a>
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
