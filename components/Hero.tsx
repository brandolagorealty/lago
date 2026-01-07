import React, { useState } from 'react';
import { FilterState } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { ZULIA_CITIES } from '../constants/locations';

interface HeroProps {
  onSearch: (filters: FilterState) => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FilterState>({
    type: 'Any Type',
    listingType: 'any',
    minPrice: '',
    maxPrice: '',
    location: '',
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  return (
    <div className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
        style={{ backgroundImage: 'url("https://picsum.photos/seed/zulia/1920/1080")' }}
      >
        <div className="absolute inset-0 bg-brand-black/40 backdrop-brightness-75"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-7xl font-serif font-bold text-brand-white mb-6 tracking-tight animate-fade-in whitespace-pre-line">
          {t.hero.title}
        </h1>
        <p className="text-lg md:text-xl text-brand-white/90 mb-12 max-w-2xl mx-auto opacity-90">
          {t.hero.subtitle}
        </p>

        {/* Search Bar */}
        <div className="bg-brand-white/95 backdrop-blur-lg p-4 rounded-3xl shadow-2xl max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col text-left px-4 border-r border-brand-black/10 last:border-0">
            <label className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">{t.hero.search.operation}</label>
            <select
              className="bg-transparent text-brand-black font-semibold focus:outline-none appearance-none cursor-pointer"
              value={filters.listingType || 'any'}
              onChange={(e) => setFilters({ ...filters, listingType: e.target.value as any })}
            >
              <option value="any">{t.hero.types.any}</option>
              <option value="sale">{t.hero.types.sale}</option>
              <option value="rent">{t.hero.types.rent}</option>
            </select>
          </div>
          <div className="flex flex-col text-left px-4 border-r border-brand-black/10 last:border-0">
            <label className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">{t.hero.search.location}</label>
            <select
              className="bg-transparent text-brand-black font-semibold focus:outline-none appearance-none cursor-pointer placeholder:text-brand-black/40"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="">{t.hero.search.locationPlaceholder}</option>
              {ZULIA_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col text-left px-4 border-r border-brand-black/10 last:border-0">
            <label className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">{t.hero.search.type}</label>
            <select
              className="bg-transparent text-brand-black font-semibold focus:outline-none appearance-none cursor-pointer"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="Any Type">{t.hero.types.any}</option>
              <option value="House">{t.hero.types.house}</option>
              <option value="Apartment">{t.hero.types.apartment}</option>
              <option value="Commercial">{t.hero.types.commercial}</option>
              <option value="Land">{t.hero.types.land}</option>
            </select>
          </div>
          <div className="flex flex-col text-left px-4 border-r border-brand-black/10 last:border-0">
            <label className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">{t.hero.search.price}</label>
            <input
              type="number"
              placeholder={t.hero.search.pricePlaceholder}
              className="bg-transparent text-brand-black font-semibold focus:outline-none placeholder:text-brand-black/40"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-brand-green hover:bg-brand-green/90 text-white rounded-2xl font-bold py-4 px-8 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-green/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>{t.hero.search.button}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
