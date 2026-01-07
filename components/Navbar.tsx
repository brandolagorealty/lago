import React from 'react';
import { ViewState } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onOpenForm: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenForm }) => {
  const { t, language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-white/95 backdrop-blur-md border-b border-brand-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-28">
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
            {/* <span className="text-2xl font-serif font-bold text-brand-black tracking-tight">LAGO REALTY</span> */}
            <img
              src="/assets/logo.png"
              alt="Lago Realty"
              className="h-24 w-auto object-contain"
            />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => onNavigate('home')} className={`text-sm font-bold transition-colors ${currentView === 'home' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.home}
            </button>
            <button onClick={() => onNavigate('listings')} className={`text-sm font-bold transition-colors ${currentView === 'listings' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.listings}
            </button>
            <button onClick={() => onNavigate('about')} className={`text-sm font-bold transition-colors ${currentView === 'about' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.about}
            </button>
            <button onClick={() => onNavigate('contact')} className={`text-sm font-bold transition-colors ${currentView === 'contact' ? 'text-brand-green' : 'text-brand-black/70 hover:text-brand-black'}`}>
              {t.navbar.contact}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 px-3 py-2 rounded-full bg-slate-200 hover:bg-brand-blue/20 transition-colors text-sm font-bold text-brand-black"
            >
              <span>{language === 'en' ? '🇺🇸' : '🇪🇸'}</span>
              <span>{language === 'en' ? 'EN' : 'ES'}</span>
            </button>

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
