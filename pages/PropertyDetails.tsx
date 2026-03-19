import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Property, Agent } from '../types';
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
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.phone) {
            setToast({ message: 'Por favor completa nombre, email y teléfono', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        const result = await propertyService.createLead({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            message: formData.message || `Interesado en la propiedad: ${property?.title}`,
            property_id: property?.id
        });

        if (result.success) {
            setToast({ message: '¡Gracias! Tu información fue enviada.', type: 'success' });
            setFormData({ name: '', email: '', phone: '', message: '' });
        } else {
            setToast({ message: 'Error al enviar información.', type: 'error' });
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) return;
            setLoading(true);
            const data = await propertyService.getPropertyById(id);
            if (data) {
                // If it's a draft and not authenticated as admin, we should treat it as not found
                // For now, let's just check if it's published. 
                // In a real scenario, we'd check auth too if we wanted admins to preview.
                if (!data.isPublished) {
                    setProperty(null);
                } else {
                    setProperty(data);
                    if (data.agentIds && data.agentIds.length > 0) {
                        const agentsData = await propertyService.getAgentsByIds(data.agentIds);
                        setAgents(agentsData);
                    }
                }
            } else {
                setProperty(null);
            }
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

                            <div className="space-y-6 mt-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Asesores de Ventas</h4>
                                {agents.length > 0 ? (
                                    agents.map(agent => (
                                        <div key={agent.id} className="group p-4 bg-slate-50 hover:bg-brand-green/5 border border-slate-100 rounded-2xl transition-all">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-brand-green/20 transition-all">
                                                    <img src={agent.avatar || '/assets/agent-placeholder.jpg'} alt={agent.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">{agent.name}</h5>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{agent.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <a href={`https://wa.me/${agent.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-brand-green hover:underline">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.483 8.413-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.308 1.654zm6.749-17.588c-.285-.635-.588-.648-.86-.66l-.438-.014c-.334 0-.88.125-1.339.627-.459.502-1.756 1.717-1.756 4.187 0 2.47 1.798 4.859 2.05 5.109.25.252 3.538 5.401 8.572 7.577 4.191 1.813 5.041 1.452 5.946 1.369.905-.083 2.933-1.196 3.351-2.348.419-1.152.419-2.137.293-2.348-.125-.21-.46-.334-.963-.502-.501-.168-2.933-1.442-3.393-1.611-.46-.168-.795-.252-1.13.252-.335.503-1.298 1.634-1.59 1.97-.293.334-.587.376-1.089.125-.503-.251-2.122-.78-4.041-2.493-1.492-1.331-2.5-2.977-2.793-3.479-.293-.503-.032-.774.219-1.025.226-.227.503-.586.753-.88.252-.293.335-.503.503-.837.167-.334.084-.627-.041-.88-.125-.251-1.11-2.677-1.554-3.664z" /></svg>
                                                    WhatsApp
                                                </a>
                                                <a href={`mailto:${agent.email}`} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-green hover:underline">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    {agent.email}
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-xl mr-4 shadow-lg">
                                            LR
                                        </div>
                                        <div>
                                            <span className="block font-bold text-slate-900">Lago Realty</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Agente Oficial</span>
                                        </div>
                                    </div>
                                )}
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
