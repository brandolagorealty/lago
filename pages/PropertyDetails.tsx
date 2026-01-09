import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Property } from '../types';
import { propertyService } from '../services/supabase';
import Navbar from '../components/Navbar';
import ImageCarousel from '../components/ImageCarousel';
import { useLanguage } from '../i18n/LanguageContext';
import PropertyCard from '../components/PropertyCard';
import AiAssistant from '../components/AiAssistant';
import Footer from '../components/Footer';

const PropertyDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) return;
            setLoading(true);
            const data = await propertyService.getPropertyById(id);
            setProperty(data);
            setLoading(false);
        };
        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green"></div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col animate-fade-in">
                <Navbar />
                <main className="flex-grow pt-24 md:pt-32 pb-20 px-4 md:px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Back button */}
                        <h2 className="text-2xl font-bold text-brand-black mb-4">{t.details.notFound}</h2>
                        <button onClick={() => navigate('/')} className="text-brand-green hover:underline font-bold">
                            {t.details.returnHome}
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const formatPrice = (price: number, type: 'sale' | 'rent') => {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(price);
        return type === 'rent' ? `${formatted}${t.details.perMonth}` : formatted;
    };

    return (
        <div className="min-h-screen bg-brand-white">
            <Navbar currentView="listings" onNavigate={(view) => navigate(view === 'home' ? '/' : '/')} onOpenForm={() => { }} />

            <main>
                {/* Hero Image */}
                <div className="h-[60vh] relative w-full overflow-hidden">
                    <img
                        src={property.image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-8 max-w-7xl mx-auto">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold text-white uppercase tracking-wider mb-4 ${property.listingType === 'rent' ? 'bg-brand-blue' : 'bg-brand-green'}`}>
                            {property.listingType === 'rent' ? t.hero.types.rent : t.hero.types.sale}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-2">{property.title}</h1>
                        <p className="text-xl text-white/90 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {property.location}
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">
                        {/* Image Carousel */}
                        {/* If there are additional images, show carousel. Otherwise show nothing (hero image is enough) 
                            Actually user said "add this carousel", so we should show it if images exist. */}
                        {/* Image Carousel */}
                        {/* Always render the carousel area, passing the images we have */}
                        <ImageCarousel
                            mainImage={property.image}
                            images={property.images}
                            title={property.title}
                        />

                        {/* Key Stats */}
                        <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-2xl shadow-sm border border-brand-black/5">
                            <div className="text-center">
                                <span className="block text-3xl font-bold text-brand-green">{property.beds}</span>
                                <span className="text-sm text-brand-black/60 uppercase tracking-widest font-bold">{t.common.beds}</span>
                            </div>
                            <div className="text-center border-l border-brand-black/10">
                                <span className="block text-3xl font-bold text-brand-green">{property.baths}</span>
                                <span className="text-sm text-brand-black/60 uppercase tracking-widest font-bold">{t.common.baths}</span>
                            </div>
                            <div className="text-center border-l border-brand-black/10">
                                <span className="block text-3xl font-bold text-brand-green">{property.sqft.toLocaleString()}</span>
                                <span className="text-sm text-brand-black/60 uppercase tracking-widest font-bold">{t.common.sqft}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-2xl font-serif font-bold text-brand-black mb-6">{t.details.description}</h3>
                            <div className="prose prose-lg text-brand-black/80 whitespace-pre-line">
                                {property.description}
                            </div>
                        </div>

                        {/* Features */}
                        {property.features && (
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-brand-black mb-6">{t.details.features}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {property.features.general?.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-brand-green uppercase tracking-widest text-sm mb-4">{t.details.general}</h4>
                                            <ul className="space-y-2">
                                                {property.features.general.map((f, i) => (
                                                    <li key={i} className="flex items-center text-brand-black/80">
                                                        <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {property.features.interior?.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-brand-green uppercase tracking-widest text-sm mb-4">{t.details.interior}</h4>
                                            <ul className="space-y-2">
                                                {property.features.interior.map((f, i) => (
                                                    <li key={i} className="flex items-center text-brand-black/80">
                                                        <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {property.features.exterior?.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-brand-green uppercase tracking-widest text-sm mb-4">{t.details.exterior}</h4>
                                            <ul className="space-y-2">
                                                {property.features.exterior.map((f, i) => (
                                                    <li key={i} className="flex items-center text-brand-black/80">
                                                        <svg className="w-5 h-5 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-2xl shadow-xl border border-brand-black/5 sticky top-24">
                            <div className="mb-8">
                                <span className="block text-lg text-brand-black/60 mb-1">{t.details.priceLabel}</span>
                                <span className="block text-4xl font-bold text-brand-green">{formatPrice(property.price, property.listingType)}</span>
                            </div>

                            <button className="w-full bg-brand-green text-white font-bold py-4 rounded-xl mb-4 hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20">
                                {t.details.schedule}
                            </button>
                            <button className="w-full bg-white border-2 border-brand-black/10 text-brand-black font-bold py-4 rounded-xl hover:bg-brand-black hover:text-white transition-colors">
                                {t.details.contactAgent}
                            </button>

                            <div className="mt-8 pt-8 border-t border-brand-black/10 flex items-center">
                                <div className="w-12 h-12 bg-brand-black rounded-full flex items-center justify-center text-white font-serif font-bold text-xl mr-4">
                                    LR
                                </div>
                                <div>
                                    <span className="block font-bold text-brand-black">Lago Realty</span>
                                    <span className="text-sm text-brand-black/60">{t.details.officialAgent}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <AiAssistant properties={property ? [property] : []} />
            <Footer />
        </div>
    );
};

export default PropertyDetails;
