import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';

// Route-level code-splitting for fast initial bundle
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const PostListingPage = lazy(() => import('./pages/PostListingPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdvertisePage = lazy(() => import('./pages/AdvertisePage'));
const BusinessDirectoryPage = lazy(() => import('./pages/BusinessDirectoryPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const CitiesPage = lazy(() => import('./pages/CitiesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));

const PageLoader = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#0c6253',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  </div>
);
import { parseAppRoute, getListingUrl } from './utils/url';
import { PAGE_SEO, setSeo } from './utils/seo';
import { getCityFromSlug, getCitySlug } from './config/cities';
import { getPageMetadataList } from './services/api';
import type { NavigateFunction, PageMetadata } from './types';

export default function App() {
  const [initialRoute] = useState(() => parseAppRoute(window.location.pathname, window.location.hash));
  const [activePage, setActivePage] = useState<string>(() => initialRoute.page);
  const [selectedListingId, setSelectedListingId] = useState<string | number | null>(() => {
    return initialRoute.page === 'listing-detail' ? initialRoute.param : null;
  });
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(() => {
    return initialRoute.page === 'blog-detail' ? String(initialRoute.param) : null;
  });
  const [activeCity, setActiveCity] = useState<string>(() => {
    if (initialRoute.page === 'properties-city' && initialRoute.param) {
      return getCityFromSlug(String(initialRoute.param)) || '';
    }
    return '';
  });
  const [loginTab, setLoginTab] = useState<'signin' | 'register'>(() => {
    return initialRoute.page === 'login' && initialRoute.param === 'register' ? 'register' : 'signin';
  });
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    icon?: string;
    onSuccess?: () => void;
  }>({ isOpen: false });

  const [metaMap, setMetaMap] = useState<Map<string, PageMetadata>>(new Map());

  const refreshMetaMap = useCallback(async () => {
    try {
      const res = await getPageMetadataList();
      if (Array.isArray(res.data?.data)) {
        const m = new Map<string, PageMetadata>();
        res.data.data.forEach((item) => {
          m.set(item.path.toLowerCase(), item);
        });
        setMetaMap(m);
      }
    } catch {
      // gracefully keep default
    }
  }, []);

  useEffect(() => {
    void refreshMetaMap();
  }, [refreshMetaMap]);

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
          targetPath = '/terms-of-use';
        } else if (parsed.page === 'home') {
          targetPath = '/';
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
      } else if (parsed.page === 'properties-city' && parsed.param) {
        const city = getCityFromSlug(String(parsed.param));
        setActiveCity(city || '');
      } else if (parsed.page === 'home') {
        setActiveCity('');
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Listing, blog, city, and not-found pages set their own SEO once active
  useEffect(() => {
    if (activePage === 'listing-detail' || activePage === 'blog-detail') return;

    // 1. Check if custom Meta Data is configured in Admin for this URL path
    const currentPath = (window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/');
    const customMeta = metaMap.get(currentPath);
    if (customMeta) {
      setSeo({
        title: customMeta.meta_title,
        description: customMeta.meta_description,
        path: customMeta.path,
      });
      return;
    }

    if (activePage === 'login' && loginTab === 'register') {
      setSeo({ title: 'Register', noindex: true });
      return;
    }
    if (activePage === 'properties-city' && activeCity) {
      const slug = getCitySlug(activeCity);
      const serverRobots = document.querySelector('meta[name="robots"]')?.getAttribute('content');
      const isServerNoIndex = serverRobots?.includes('noindex') ?? false;
      setSeo({
        title: `Properties in ${activeCity} | Buy, Rent & Commercial | Tradecall`,
        description: `Find the best residential and commercial properties in ${activeCity} on Tradecall...`,
        path: `/properties/${slug}`,
        noindex: isServerNoIndex,
      });
      return;
    }
    if (activePage === 'cities') {
      setSeo({
        title: 'Properties by City | All Indian Cities | Tradecall',
        description: 'Explore verified residential and commercial properties across all major cities and states in India on Tradecall.',
        path: '/cities',
      });
      return;
    }
    if (activePage === 'not-found') {
      setSeo({
        title: 'Page Not Found | Tradecall',
        description: 'The requested page or city could not be found.',
        noindex: true,
      });
      return;
    }
    setSeo(PAGE_SEO[activePage] ?? {});
  }, [activePage, loginTab, activeCity, metaMap]);

  const navigateTo: NavigateFunction = (page, param = null) => {
    let path = `/${page}`;
    if (page === 'home') {
      path = '/';
      setActiveCity('');
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
        path = id ? `/listing/${id}` : '/';
      }
      setActivePage('listing-detail');
    } else if (page === 'blog-detail' && param) {
      const slug = typeof param === 'object' ? null : String(param);
      setSelectedBlogId(slug);
      path = slug ? `/blog/${slug}` : '/blog';
      setActivePage('blog-detail');
    } else if (page === 'properties-city' && param) {
      const slug = typeof param === 'string' ? param : getCitySlug(String(param));
      const city = getCityFromSlug(slug);
      if (!city) {
        setActivePage('not-found');
        path = `/properties/${slug}`;
      } else {
        setActiveCity(city);
        setActivePage('properties-city');
        path = `/properties/${slug}`;
      }
    } else if (page === 'cities') {
      setActivePage('cities');
      path = '/cities';
    } else if (page === 'not-found') {
      setActivePage('not-found');
      path = window.location.pathname;
    } else if (page === 'terms' || page.toLowerCase() === 'terms-of-use' || page.toLowerCase() === 'terms-of-use-tradecall-india') {
      path = '/terms-of-use';
      setActivePage('terms');
    } else if (page === 'privacy') {
      path = '/privacy';
      setActivePage('privacy');
    } else if (page === 'faq' || page === 'faqs') {
      path = '/faq';
      setActivePage('faq');
    } else {
      setActivePage(page);
      path = `/${page}`;
    }

    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCitySelect = (city: string) => {
    if (!city || city === 'All Cities') {
      setActiveCity('');
      navigateTo('home');
    } else {
      navigateTo('properties-city', getCitySlug(city));
    }
  };

  // Login page keeps the site header (no footer)
  if (activePage === 'login') {
    return (
      <div className="tradecall-app">
        <Header
          activeCity={activeCity}
          onCitySelect={handleCitySelect}
          onNavigate={navigateTo}
          activePage={activePage}
        />
        <Suspense fallback={<PageLoader />}>
          <LoginPage
            initialTab={loginTab}
            onNavigate={navigateTo}
            onLoginSuccess={() => navigateTo('home')}
          />
        </Suspense>
      </div>
    );
  }

  if (activePage === 'admin-login') {
    return (
      <Suspense fallback={<PageLoader />}>
        <AdminLoginPage onNavigate={navigateTo} />
      </Suspense>
    );
  }

  return (
    <div className="tradecall-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        activeCity={activeCity}
        onCitySelect={handleCitySelect}
        onNavigate={navigateTo}
        activePage={activePage}
        onOpenAuth={() => openAuthModal()}
      />

      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          {(activePage === 'home' || activePage === 'properties-city') && (
            <HomePage
              activeCity={activeCity}
              onCitySelect={handleCitySelect}
              onNavigate={navigateTo}
              onOpenAuth={openAuthModal}
            />
          )}

          {activePage === 'cities' && (
            <CitiesPage
              onNavigate={navigateTo}
            />
          )}

          {activePage === 'not-found' && (
            <NotFoundPage
              onNavigate={navigateTo}
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
              onOpenAuth={openAuthModal}
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

          {activePage === 'faq' && (
            <FAQPage
              onNavigate={navigateTo}
            />
          )}
        </Suspense>
      </main>

      <Footer
        onCitySelect={handleCitySelect}
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
