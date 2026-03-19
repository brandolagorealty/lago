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
                                                <a href={`https://wa.me/${agent.phone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 text-sm font-bold text-white bg-[#25D366] hover:bg-[#128C7E] px-6 py-3 rounded-2xl transition-all shadow-lg shadow-[#25D366]/30 group active:scale-95">
                                                    <svg className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .011 5.403.008 12.039c0 2.12.54 4.188 1.564 6.09L0 24l6.101-1.599a11.82 11.82 0 005.946 1.599h.005c6.635 0 12.038-5.403 12.041-12.039a11.85 11.85 0 00-3.538-8.513z" /></svg>
                                                    Contactar por WhatsApp
                                                </a>
                                                <a href={`mailto:${agent.email}`} className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 px-4 py-2 rounded-xl transition-all shadow-sm">
                                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    Enviar Email
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
