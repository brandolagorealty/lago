import React, { useState } from 'react';
import { FilterState } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { MARACAIBO_SECTORS } from '../constants/locations';
import CustomSelect from './CustomSelect';

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-serif font-bold text-brand-white mb-6 tracking-tight animate-fade-in whitespace-pre-line">
          {t.hero.title}
        </h1>
        <p className="text-lg md:text-xl text-brand-white/90 mb-12 max-w-2xl mx-auto opacity-90">
          {t.hero.subtitle}
        </p>

        {/* Search Bar */}
        <div className="bg-brand-white/95 backdrop-blur-lg p-4 rounded-3xl shadow-2xl max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-4">
          <CustomSelect
            label={t.hero.search.operation}
            value={filters.listingType || 'any'}
            options={[
              { label: t.hero.types.any, value: 'any' },
              { label: t.hero.types.sale, value: 'sale' },
              { label: t.hero.types.rent, value: 'rent' },
            ]}
            onChange={(val) => setFilters({ ...filters, listingType: val as any })}
          />
          <CustomSelect
            label={t.hero.search.location}
            value={filters.location}
            placeholder={t.hero.search.locationPlaceholder}
            options={MARACAIBO_SECTORS.map(s => ({ label: s, value: s }))}
            onChange={(val) => setFilters({ ...filters, location: val })}
          />
          <CustomSelect
            label={t.hero.search.type}
            value={filters.type}
            options={[
              { label: t.hero.types.any, value: 'Any Type' },
              { label: t.hero.types.house, value: 'House' },
              { label: t.hero.types.apartment, value: 'Apartment' },
              { label: t.hero.types.commercial, value: 'Commercial' },
              { label: t.hero.types.land, value: 'Land' },
            ]}
            onChange={(val) => setFilters({ ...filters, type: val as any })}
          />
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
