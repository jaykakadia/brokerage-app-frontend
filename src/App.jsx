import React, { useState, useEffect } from 'react';
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
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();

  const [activePage, setActivePage] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [activeCity, setActiveCity] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      if (hash.startsWith('listing/')) {
        const id = hash.replace('listing/', '');
        setSelectedListingId(id);
        setActivePage('listing-detail');
      } else if (hash.startsWith('blog/')) {
        const blogSlug = hash.replace('blog/', '');
        setSelectedBlogId(blogSlug);
        setActivePage('blog-detail');
      } else if ([
        'home',
        'post-listing',
        'account',
        'admin',
        'about',
        'contact',
        'advertise',
        'terms',
        'privacy',
        'blog'
      ].includes(hash)) {
        setActivePage(hash);
      } else {
        setActivePage('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page, param = null) => {
    if (page === 'listing-detail' && param) {
      setSelectedListingId(param);
      setActivePage('listing-detail');
      window.location.hash = `listing/${param}`;
    } else if (page === 'blog-detail' && param) {
      setSelectedBlogId(param);
      setActivePage('blog-detail');
      window.location.hash = `blog/${param}`;
    } else {
      setActivePage(page);
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="tradecall-app" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        activeCity={activeCity}
        onCitySelect={setActiveCity}
        onNavigate={navigateTo}
        activePage={activePage}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <HomePage
            activeCity={activeCity}
            onCitySelect={setActiveCity}
            onNavigate={navigateTo}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activePage === 'listing-detail' && (
          <ListingDetailPage
            listingId={selectedListingId}
            onNavigate={navigateTo}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activePage === 'post-listing' && (
          <PostListingPage
            onNavigate={navigateTo}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activePage === 'account' && (
          <AccountPage
            onNavigate={navigateTo}
            onOpenAuth={() => setAuthModalOpen(true)}
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
            onOpenAuth={() => setAuthModalOpen(true)}
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
        onCitySelect={(city) => {
          setActiveCity(city);
          navigateTo('home');
        }}
        onNavigate={navigateTo}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
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
