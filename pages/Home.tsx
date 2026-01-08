import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import PropertyCard from '../components/PropertyCard';
import SkeletonCard from '../components/SkeletonCard';
import AboutSection from '../components/AboutSection';
import AiAssistant from '../components/AiAssistant';
import Footer from '../components/Footer';
import PropertyForm from '../components/PropertyForm';
import { ViewState, FilterState, Property } from '../types';
import { propertyService } from '../services/supabase';
import { PROPERTIES } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

const Home: React.FC = () => {
    const { t } = useLanguage();
    const [currentView, setCurrentView] = useState<ViewState>('home');
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        type: 'Any Type',
        minPrice: '',
        maxPrice: '',
        location: '',
    });

    useEffect(() => {
        const fetchProperties = async () => {
            setIsLoading(true);
            try {
                const data = await propertyService.getPublishedProperties();
                setProperties(data.length > 0 ? data : PROPERTIES);
            } catch (error) {
                console.log('Using local property data (Supabase not configured)');
                setProperties(PROPERTIES);
            }
            setIsLoading(false);
        };

        fetchProperties();
    }, []);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchType = filters.type === 'Any Type' || p.type === filters.type;
            const matchListingType = !filters.listingType || filters.listingType === 'any' || p.listingType === filters.listingType; // listingType filter
            const matchLocation = !filters.location || p.location.toLowerCase().includes(filters.location.toLowerCase());
            const matchMaxPrice = !filters.maxPrice || p.price <= parseInt(filters.maxPrice);
            return matchType && matchListingType && matchLocation && matchMaxPrice;
        });
    }, [properties, filters]);

    const handleSearch = (newFilters: FilterState) => {
        setFilters(newFilters);
        setCurrentView('listings');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Deprecated for public user (now handled in Admin), but kept for potential "List Property" request flow if needed later
    const handleSaveNewProperty = async (property: Property) => {
        try {
            const { id, ...propertyData } = property;
            // Public submissions are NOT published by default (is_published: false)
            const result = await propertyService.createProperty(propertyData, false);

            if (result.success) {
                alert(t.form.successMessage);
                setIsFormOpen(false);
            } else {
                console.error('Error saving:', result.error);
                alert(`${t.form.errorTitle}: ${result.error?.message || t.common.error}`);
            }
        } catch (error) {
            console.error('Error processing property:', error);
            alert(t.common.error);
        }
    };

    const renderHome = () => (
        <>
            <Hero onSearch={handleSearch} />

            <section className="py-24 bg-brand-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                        <div className="max-w-xl">
                            <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 block">{t.listings.selected}</span>
                            <h2 className="text-4xl md:text-5xl font-serif font-bold text-brand-black leading-tight">{t.listings.featured}</h2>
                        </div>
                        <button onClick={() => setCurrentView('listings')} className="group flex items-center bg-brand-white border border-brand-black/10 px-6 py-3 rounded-full text-sm font-bold text-brand-black hover:bg-brand-black hover:text-brand-white transition-all shadow-sm">
                            {t.listings.browseAll}
                            <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {isLoading
                            ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
                            : properties.filter(p => p.featured).slice(0, 4).map(property => (
                                <PropertyCard key={property.id} property={property} />
                            ))
                        }
                    </div>
                </div>
            </section>

            <AboutSection />
        </>
    );

    const renderListings = () => (
        <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
                <h2 className="text-4xl font-serif font-bold text-brand-black mb-4">{t.listings.title}</h2>
                <p className="text-brand-black/70">{t.listings.showingResults.replace('{count}', filteredProperties.length.toString())}</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredProperties.map(property => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>
            ) : (
                <div className="bg-brand-white rounded-3xl p-16 text-center shadow-sm border border-brand-black/5">
                    <h3 className="text-2xl font-bold text-brand-black mb-2">{t.listings.noResults}</h3>
                    <button onClick={() => setFilters({ type: 'Any Type', minPrice: '', maxPrice: '', location: '' })} className="text-brand-green font-bold hover:underline">
                        {t.listings.clearFilters}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-white">
            {/* Navbar updated to not show List Property button in public view */}
            <Navbar currentView={currentView} onNavigate={setCurrentView} onOpenForm={() => { }} />

            <main>
                {currentView === 'home' && renderHome()}
                {currentView === 'listings' && renderListings()}
                {currentView === 'about' && (
                    <div className="pt-32">
                        <AboutSection />
                    </div>
                )}
                {currentView === 'contact' && <div className="pt-32 p-8 text-center text-slate-500">{t.navbar.contact} - Coming Soon</div>}
            </main>

            <AiAssistant properties={properties} />
            <Footer />
        </div>
    );
};

export default Home;
