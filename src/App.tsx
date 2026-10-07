import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import PostListingPage from './pages/PostListingPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AdvertisePage from './pages/AdvertisePage';
import BusinessDirectoryPage from './pages/BusinessDirectoryPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { parseAppRoute, getListingUrl } from './utils/url';
import type { NavigateFunction } from './types';

export default function App() {
  const [activePage, setActivePage] = useState<string>('home');
  const [selectedListingId, setSelectedListingId] = useState<string | number | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string>('');
  const [loginTab, setLoginTab] = useState<'signin' | 'register'>('signin');
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    icon?: string;
    onSuccess?: () => void;
  }>({ isOpen: false });

  const openAuthModal = (_options?: {
    title?: string;
    subtitle?: string;
    icon?: string;
    onSuccess?: () => void;
  }) => {
    navigateTo('login');
  };

  const closeAuthModal = () => {
    setAuthModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Sync HTML5 path-based routing (clean URLs without #)
  useEffect(() => {
    const handleRouteChange = () => {
      // If legacy hash was supplied (e.g. /#advertise or /#home), migrate to clean path
      if (window.location.hash && window.location.hash.length > 1) {
        const parsed = parseAppRoute(window.location.pathname, window.location.hash);
        let targetPath = `/${parsed.page}`;
        if (parsed.page === 'listing-detail' && parsed.param) {
          targetPath = `/listing/${parsed.param}`;
        } else if (parsed.page === 'blog-detail' && parsed.param) {
          targetPath = `/blog/${parsed.param}`;
        } else if (parsed.page === 'terms') {
          targetPath = '/Terms-of-use-tradecall-India';
        } else if (parsed.page === 'home') {
          targetPath = '/home';
        } else if (parsed.page === 'login') {
          targetPath = parsed.param === 'register' ? '/register' : '/login';
        }
        window.history.replaceState(null, '', targetPath);
        setActivePage(parsed.page);
        if (parsed.page === 'listing-detail') setSelectedListingId(parsed.param);
        if (parsed.page === 'blog-detail') setSelectedBlogId(String(parsed.param));
        if (parsed.page === 'login') setLoginTab(parsed.param === 'register' ? 'register' : 'signin');
        return;
      }

      const parsed = parseAppRoute(window.location.pathname, '');
      setActivePage(parsed.page);
      if (parsed.page === 'listing-detail') {
        setSelectedListingId(parsed.param);
      } else if (parsed.page === 'blog-detail') {
        setSelectedBlogId(String(parsed.param));
      } else if (parsed.page === 'login') {
        setLoginTab(parsed.param === 'register' ? 'register' : 'signin');
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const navigateTo: NavigateFunction = (page, param = null) => {
    let path = `/${page}`;
    if (page === 'home') {
      path = '/home';
      setActivePage('home');
    } else if (page === 'login' || page === 'register' || page === 'signin') {
      const tab = page === 'register' || param === 'register' ? 'register' : 'signin';
      setLoginTab(tab);
      path = page === 'register' ? '/register' : '/login';
      setActivePage('login');
    } else if (page === 'listing-detail' && param) {
      if (typeof param === 'object' && param !== null && 'id' in param) {
        const listingObj = param as any;
        setSelectedListingId(listingObj.id);
        path = getListingUrl(listingObj);
      } else {
        const id = typeof param === 'object' ? null : param;
        setSelectedListingId(id);
        path = id ? `/listing/${id}` : '/home';
      }
      setActivePage('listing-detail');
    } else if (page === 'blog-detail' && param) {
      const slug = typeof param === 'object' ? null : String(param);
      setSelectedBlogId(slug);
      path = slug ? `/blog/${slug}` : '/blog';
      setActivePage('blog-detail');
    } else if (page === 'terms' || page.toLowerCase() === 'terms-of-use-tradecall-india') {
      path = '/Terms-of-use-tradecall-India';
      setActivePage('terms');
    } else if (page === 'privacy') {
      path = '/privacy';
      setActivePage('privacy');
    } else {
      setActivePage(page);
      path = `/${page}`;
    }

    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render login page completely standalone (no header/footer)
  if (activePage === 'login') {
    return (
      <LoginPage
        initialTab={loginTab}
        onNavigate={navigateTo}
        onLoginSuccess={() => navigateTo('home')}
      />
    );
  }

  if (activePage === 'admin-login') {
    return <AdminLoginPage onNavigate={navigateTo} />;
  }

  return (
    <div className="tradecall-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        activeCity={activeCity}
        onCitySelect={setActiveCity}
        onNavigate={navigateTo}
        activePage={activePage}
        onOpenAuth={() => openAuthModal()}
      />

      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <HomePage
            activeCity={activeCity}
            onCitySelect={setActiveCity}
            onNavigate={navigateTo}
            onOpenAuth={openAuthModal}
          />
        )}

        {activePage === 'listing-detail' && (
          <ListingDetailPage
            listingId={selectedListingId}
            onNavigate={navigateTo}
            onOpenAuth={openAuthModal}
          />
        )}

        {activePage === 'post-listing' && (
          <PostListingPage
            onNavigate={navigateTo}
            onOpenAuth={openAuthModal}
          />
        )}

        {activePage === 'account' && (
          <AccountPage
            onNavigate={navigateTo}
            onOpenAuth={openAuthModal}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboard
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'about' && (
          <AboutPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'contact' && (
          <ContactPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'advertise' && (
          <AdvertisePage
            onNavigate={navigateTo}
            onOpenAuth={openAuthModal}
          />
        )}

        {activePage === 'business-directory' && (
          <BusinessDirectoryPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'terms' && (
          <TermsPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'privacy' && (
          <PrivacyPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'blog' && (
          <BlogPage
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'blog-detail' && (
          <BlogDetailPage
            blogIdentifier={selectedBlogId}
            onNavigate={navigateTo}
          />
        )}

      </main>

      <Footer
        onCitySelect={(city: string) => {
          setActiveCity(city);
          navigateTo('home');
        }}
        onNavigate={navigateTo}
      />

      <AuthModal
        isOpen={authModalConfig.isOpen}
        onClose={closeAuthModal}
        title={authModalConfig.title}
        subtitle={authModalConfig.subtitle}
        icon={authModalConfig.icon}
        onSuccess={authModalConfig.onSuccess}
      />

      {/* Floating WhatsApp CTA */}
      <a
        href="https://wa.me/919992292828"
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with us on WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>
    </div>
  );
}
