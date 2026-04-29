import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ViewState } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  currentView: ViewState | 'none';
  onNavigate?: (view: ViewState) => void;
  onOpenForm?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleNav = (view: ViewState) => {
    if (onNavigate && window.location.pathname === '/') {
      onNavigate(view);
    } else {
      navigate(view === 'home' ? '/' : `/#${view}`);
      // If we are on a different page, we might want to navigate to home first
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          if (onNavigate) onNavigate(view);
        }, 100);
      }
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-white/95 backdrop-blur-md border-b border-brand-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <Link to="/" className="flex items-center cursor-pointer">
            <img
              src="https://scdztnzkzrvjgyefunkw.supabase.co/storage/v1/object/public/assets/logos/LAGO%20AZUL-01.png"
              alt="Lago Realty"
              className="h-8 md:h-12 w-auto object-contain"
            />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => handleNav('home')} className={`text-sm font-bold transition-colors ${currentView === 'home' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.home}
            </button>
            <button onClick={() => handleNav('listings')} className={`text-sm font-bold transition-colors ${currentView === 'listings' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.listings}
            </button>
            <button onClick={() => handleNav('about')} className={`text-sm font-bold transition-colors ${currentView === 'about' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.about}
            </button>
            <Link to="/contact" className={`text-sm font-bold transition-colors ${window.location.pathname === '/contact' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.contact}
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-brand-green hover:text-white transition-all text-lg shadow-sm border border-slate-200 hover:border-brand-green"
              title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
            >
              <span>{language === 'en' ? '🇺🇸' : '🇪🇸'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
