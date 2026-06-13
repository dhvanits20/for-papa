import { useState, useContext, useEffect } from 'react';
import Hero from './components/Hero';
import Grid from './components/Grid';
import Gallery from './components/Gallery';
import Share from './components/Share';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import { AuthContext, AuthProvider } from './context/AuthContext';

function AppContent() {
  const { user, isLoading } = useContext(AuthContext);
  const [page, setPage] = useState('home'); // 'home' | 'grid' | 'gallery' | 'share'
  const [selectedMonth, setSelectedMonth] = useState({ year: null, month: null });
  const [shareToken, setShareToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const share = params.get('share');
    if (share) {
      setShareToken(share);
    }
  }, []);

  const navigateTo = (p, extra) => {
    if (p === 'gallery' && extra) setSelectedMonth(extra);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rust border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isGuest = !!shareToken;

  if (!user && !isGuest) {
    return <Auth />;
  }

  return (
    <>
      <div className="noise-bg" />
      <div className="min-h-screen bg-cream font-sans">
        <Navbar page={page} navigateTo={navigateTo} isGuest={isGuest} />
        <main>
          {page === 'home' && <Hero navigateTo={navigateTo} isGuest={isGuest} shareToken={shareToken} />}
          {page === 'grid' && <Grid navigateTo={navigateTo} shareToken={shareToken} isGuest={isGuest} />}
          {page === 'gallery' && (
            <Gallery
              year={selectedMonth.year}
              month={selectedMonth.month}
              autoUpload={selectedMonth.autoUpload}
              navigateTo={navigateTo}
              shareToken={shareToken}
              isGuest={isGuest}
            />
          )}
          {page === 'favorites' && (
            <Gallery favoritesOnly={true} navigateTo={navigateTo} shareToken={shareToken} isGuest={isGuest} />
          )}
          {page === 'search' && (
            <Gallery searchMode={true} navigateTo={navigateTo} shareToken={shareToken} isGuest={isGuest} />
          )}
          {page === 'share' && !isGuest && <Share />}
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
