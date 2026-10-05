import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { NavigateFunction } from '../types';

export interface HeaderProps {
  onNavigate: NavigateFunction;
  activePage: string;
  onOpenAuth?: () => void;
  activeCity?: string;
  onCitySelect?: (city: string) => void;
}

export default function Header({ onNavigate, activePage }: HeaderProps) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The sign-in page is already where these buttons lead
  const onAuthPage = activePage === 'login';

  return (
    <>
      <header className="site-header" id="siteHeader">
        <div className="header-container">
          <div className="header-start">
          <div className="header-left">
            <a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="site-logo">
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
          </div>

          <nav className="main-nav">
            <a
              href="/home"
              className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
            >
              Home
            </a>
            <a
              href="/advertise"
              className={`nav-item ${activePage === 'advertise' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('advertise'); }}
            >
              Advertise
            </a>
            <a
              href="/blog"
              className={`nav-item ${activePage === 'blog' || activePage === 'blog-detail' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('blog'); }}
            >
              Blog
            </a>
            <a
              href="/about"
              className={`nav-item ${activePage === 'about' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('about'); }}
            >
              About Us
            </a>
            <a
              href="/contact"
              className={`nav-item ${activePage === 'contact' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('contact'); }}
            >
              Contact Us
            </a>
            {user?.role?.toLowerCase() === 'admin' && (
              <a
                href="/admin"
                className={`nav-item ${activePage === 'admin' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}
              >
                <i className="fas fa-shield-alt" aria-hidden="true"></i>
                Admin Panel
              </a>
            )}
          </nav>
          </div>

          <a
            href="/business-directory"
            className={`btn-business-directory ${activePage === 'business-directory' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate('business-directory'); }}
          >
            <i className="fas fa-store"></i> Business Directory
          </a>

          <div className="header-right">
            {!onAuthPage && (
              <button
                type="button"
                className="btn-post-free"
                onClick={() => onNavigate('post-listing')}
              >
                <i className="fas fa-plus-circle"></i> Post Free
              </button>
            )}

            {onAuthPage ? null : user ? (
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
                  onClick={() => void logout()}
                  title="Sign Out"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-header-ghost"
                onClick={() => onNavigate('login')}
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
              <a href="/home" className={`drawer-nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('home'); setDrawerOpen(false); }}>Home</a>
              <a href="/business-directory" className={`drawer-nav-item ${activePage === 'business-directory' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('business-directory'); setDrawerOpen(false); }}>Business Directory</a>
              <a href="/advertise" className={`drawer-nav-item ${activePage === 'advertise' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('advertise'); setDrawerOpen(false); }}>Advertise</a>
              <a href="/blog" className={`drawer-nav-item ${activePage === 'blog' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('blog'); setDrawerOpen(false); }}>Blog</a>
              <a href="/about" className={`drawer-nav-item ${activePage === 'about' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('about'); setDrawerOpen(false); }}>About Us</a>
              <a href="/contact" className={`drawer-nav-item ${activePage === 'contact' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('contact'); setDrawerOpen(false); }}>Contact Us</a>
              {!onAuthPage && (
                <a href="/post-listing" className="drawer-nav-item" onClick={(e) => { e.preventDefault(); onNavigate('post-listing'); setDrawerOpen(false); }}>Post Free Listing</a>
              )}
              {user && (
                <a href="/account" className="drawer-nav-item" onClick={(e) => { e.preventDefault(); onNavigate('account'); setDrawerOpen(false); }}>My Account ({user.name})</a>
              )}
              {user?.role?.toLowerCase() === 'admin' && (
                <a href="/admin" className="drawer-nav-item" onClick={(e) => { e.preventDefault(); onNavigate('admin'); setDrawerOpen(false); }}>Admin Dashboard</a>
              )}
            </nav>
            <div className="drawer-footer">
              {user ? (
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => { void logout(); setDrawerOpen(false); }}>Sign Out</button>
              ) : !onAuthPage && (
                <button className="btn-drawer-signin" onClick={() => { onNavigate('login'); setDrawerOpen(false); }}>
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
