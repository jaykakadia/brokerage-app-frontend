import React from 'react';

export default function Footer({ onCitySelect, onNavigate }) {
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
          <p>NCR Haryana's trusted property & business directory.</p>
          <div className="footer-email">
            <i className="fas fa-envelope"></i> tradecall.in@gmail.com
          </div>
          <div className="footer-phone" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
            <i className="fab fa-whatsapp"></i> 9992292828 (WhatsApp)
          </div>
        </div>

        <div className="footer-col">
          <h4>Cities We Cover</h4>
          <ul>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Palwal'); }}>Properties in Palwal</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Faridabad'); }}>Properties in Faridabad</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Gurugram'); }}>Properties in Gurugram</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Sonipat'); }}>Properties in Sonipat</a></li>
            <li><a href="#city" onClick={(e) => { e.preventDefault(); onCitySelect('Delhi'); }}>Properties in Delhi</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>Home</a></li>
            <li><a href="#post" onClick={(e) => { e.preventDefault(); onNavigate('post-listing'); }}>Post Free Listing</a></li>
            <li><a href="#account" onClick={(e) => { e.preventDefault(); onNavigate('account'); }}>My Account</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <div className="footer-copy">© 2026 TradeCall India. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
