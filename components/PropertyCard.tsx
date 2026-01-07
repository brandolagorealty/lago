import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Property } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const formatPrice = (price: number, type: 'sale' | 'rent') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
    return type === 'rent' ? `${formatted}/mo` : formatted;
  };

  // Helper to translate property type safely
  const getTranslatedType = (type: string) => {
    const key = type.toLowerCase();
    // Check if key exists in t.hero.types
    if (key === 'house') return t.hero.types.house;
    if (key === 'apartment') return t.hero.types.apartment;
    if (key === 'commercial') return t.hero.types.commercial;
    if (key === 'land') return t.hero.types.land;
    return type; // Fallback to original if not found
  };

  return (
    <div
      className="group bg-brand-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-brand-black/5 flex flex-col h-full cursor-pointer"
      onClick={() => navigate(`/property/${property.id}`)}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-brand-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-black uppercase tracking-wider">
            {getTranslatedType(property.type)}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider ${property.listingType === 'rent' ? 'bg-brand-blue' : 'bg-brand-green'}`}>
            {property.listingType === 'rent' ? t.hero.types.rent : t.hero.types.sale}
          </div>
        </div>

        {property.featured && (
          <div className="absolute top-4 right-4 bg-brand-green px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-lg">
            {t.common.featured}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-brand-black leading-tight group-hover:text-brand-green transition-colors">{property.title}</h3>
          <span className="text-brand-green font-bold text-lg">{formatPrice(property.price, property.listingType)}</span>
        </div>
        <p className="text-brand-black/60 text-sm mb-3 flex items-center">
          <svg className="w-4 h-4 mr-1 text-brand-green/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {property.location}
        </p>

        {/* Short description or truncated description */}
        <p className="text-brand-black/70 text-sm line-clamp-2 mb-6 leading-relaxed">
          {property.shortDescription || property.description}
        </p>

        <div className="flex items-center gap-4 text-brand-black/60 text-sm mt-auto border-t border-brand-black/5 pt-4">
          {property.beds > 0 && (
            <div className="flex items-center">
              <span className="font-bold mr-1">{property.beds}</span> {t.common.beds}
            </div>
          )}
          {property.baths > 0 && (
            <div className="flex items-center">
              <span className="font-bold mr-1">{property.baths}</span> {t.common.baths}
            </div>
          )}
          <div className="flex items-center">
            <span className="font-bold mr-1">{property.sqft.toLocaleString()}</span> {t.common.sqft}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
