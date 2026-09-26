import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import PostListingPage from './pages/PostListingPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();

  const [activePage, setActivePage] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState(null);
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
      } else if (['home', 'post-listing', 'account', 'admin'].includes(hash)) {
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
          />
        )}

        {activePage === 'listing-detail' && (
          <ListingDetailPage
            listingId={selectedListingId}
            onNavigate={navigateTo}
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
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
