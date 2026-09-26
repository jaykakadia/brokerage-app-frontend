import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeCity, onCitySelect, onNavigate, activePage, onOpenAuth }) {
  const { user, logout } = useAuth();
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cities = ["All Cities", "Palwal", "Faridabad", "Gurugram", "Sonipat", "Hodal", "Delhi"];

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-left">
          <i className="fas fa-map-marker-alt"></i> Serving: Palwal · Faridabad · Gurugram · Sonipat · Hodal · Delhi
        </div>
        <div className="top-bar-right">FREE PROPERTY & RELATED BUSINESS LISTING</div>
      </div>

      <header className="site-header" id="siteHeader">
        <div className="header-container">
          <div className="header-left">
            <a href="#home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="site-logo">
              <div className="logo-icon">
                <div className="logo-bars">
                  <span className="logo-bar"></span>
                  <span className="logo-bar"></span>
                  <span className="logo-bar"></span>
                </div>
                <div className="logo-arrow"></div>
              </div>
              <span className="logo-text">
                <span className="logo-tradecall">TradeCall</span>
                <span className="logo-india">India</span>
              </span>
            </a>

            {/* City Dropdown */}
            <div className="city-dropdown-wrap" id="cityDropWrap">
              <button
                type="button"
                className={`city-dropdown-btn ${cityMenuOpen ? 'open' : ''}`}
                onClick={() => setCityMenuOpen(!cityMenuOpen)}
              >
                <i className="fas fa-location-dot"></i>
                <span id="cityBtnText">{activeCity || "All Cities"}</span>
                <i className="fas fa-chevron-down arrow"></i>
              </button>
              {cityMenuOpen && (
                <div className="city-dropdown-menu open" style={{ display: 'block' }}>
                  {cities.map((city) => (
                    <div
                      key={city}
                      className={`city-dropdown-item ${(activeCity === city || (!activeCity && city === "All Cities")) ? 'selected' : ''}`}
                      onClick={() => {
                        onCitySelect(city === "All Cities" ? "" : city);
                        setCityMenuOpen(false);
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav className="main-nav">
            <a
              href="#home"
              className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
            >
              Home
            </a>
            {user?.role?.toLowerCase() === 'admin' && (
              <a
                href="#admin"
                className={`nav-item ${activePage === 'admin' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}
                style={{ color: '#0c6253', fontWeight: 'bold' }}
              >
                <i className="fas fa-shield-alt"></i> Admin Panel
              </a>
            )}
          </nav>

          <div className="header-right">
            <button
              type="button"
              className="btn-post-free"
              onClick={() => onNavigate('post-listing')}
            >
              <i className="fas fa-plus-circle"></i> Post Free
            </button>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-header-ghost"
                  onClick={() => onNavigate('account')}
                  title="My Account"
                >
                  <i className="fas fa-user-circle"></i> {user.name.split(' ')[0]}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '7px 12px', fontSize: '13px' }}
                  onClick={logout}
                  title="Sign Out"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-header-ghost"
                onClick={onOpenAuth}
              >
                <i className="fas fa-sign-in-alt"></i> Sign-In / Register
              </button>
            )}

            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label="Toggle Navigation"
            >
              <span className="hb-line"></span>
              <span className="hb-line"></span>
              <span className="hb-line"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <>
          <div className="mobile-drawer-overlay open" onClick={() => setDrawerOpen(false)}></div>
          <div className="mobile-drawer open">
            <div className="drawer-header">
              <span className="logo-text">
                <span className="logo-tradecall">TradeCall</span>
                <span className="logo-india">India</span>
              </span>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <nav className="drawer-nav">
              <a href="#home" className="drawer-nav-item" onClick={() => { onNavigate('home'); setDrawerOpen(false); }}>Home</a>
              <a href="#post" className="drawer-nav-item" onClick={() => { onNavigate('post-listing'); setDrawerOpen(false); }}>Post Free Listing</a>
              {user && (
                <a href="#account" className="drawer-nav-item" onClick={() => { onNavigate('account'); setDrawerOpen(false); }}>My Account ({user.name})</a>
              )}
              {user?.role?.toLowerCase() === 'admin' && (
                <a href="#admin" className="drawer-nav-item" onClick={() => { onNavigate('admin'); setDrawerOpen(false); }}>Admin Dashboard</a>
              )}
            </nav>
            <div className="drawer-footer">
              {user ? (
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => { logout(); setDrawerOpen(false); }}>Sign Out</button>
              ) : (
                <button className="btn-drawer-signin" onClick={() => { onOpenAuth(); setDrawerOpen(false); }}>
                  <i className="fas fa-sign-in-alt"></i> Sign-In / Register
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
