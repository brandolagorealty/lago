import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../i18n/LanguageContext';

const Contact: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-brand-white flex flex-col">
            <Navbar currentView="none" onNavigate={() => { }} onOpenForm={() => { }} />

            <main className="flex-grow">
                {/* Hero Contact Section */}
                <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
                    <img
                        src="/contact_page_header_1767890406383.png"
                        alt="Lago Realty Office"
                        className="w-full h-full object-cover brightness-75 scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent flex items-center justify-center p-8">
                        <div className="max-w-4xl w-full text-center">
                            <span className="text-brand-green font-bold tracking-[0.3em] uppercase text-xs mb-6 block drop-shadow-lg scale-110">Lago Realty Experience</span>
                            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl">
                                {t.support.contact.title}
                            </h1>
                            <p className="text-xl text-white/90 max-w-2xl mx-auto font-light drop-shadow-md">
                                {t.support.contact.subtitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Form & Info */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form Card */}
                        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 border border-brand-black/5 animate-slide-up">
                            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-brand-black/40 ml-1">{t.support.contact.name}</label>
                                        <input type="text" placeholder="John Doe" className="w-full bg-brand-black/[0.03] border-none rounded-2xl p-4 text-sm focus:ring-2 ring-brand-green/20 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-brand-black/40 ml-1">{t.support.contact.email}</label>
                                        <input type="email" placeholder="john@example.com" className="w-full bg-brand-black/[0.03] border-none rounded-2xl p-4 text-sm focus:ring-2 ring-brand-green/20 transition-all outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-brand-black/40 ml-1">{t.support.contact.message}</label>
                                    <textarea rows={6} className="w-full bg-brand-black/[0.03] border-none rounded-3xl p-6 text-sm focus:ring-2 ring-brand-green/20 transition-all outline-none resize-none" placeholder="How can we help you?"></textarea>
                                </div>
                                <button className="w-full md:w-auto bg-brand-black text-white px-12 py-5 rounded-full font-bold text-sm hover:bg-brand-green transition-all shadow-xl shadow-brand-black/20 hover:shadow-brand-green/20 uppercase tracking-widest active:scale-95">
                                    {t.support.contact.send}
                                </button>
                            </form>
                        </div>

                        {/* Info Column */}
                        <div className="space-y-6">
                            <div className="bg-brand-black text-white rounded-[2rem] p-10 shadow-xl">
                                <h3 className="text-xl font-bold mb-8 italic uppercase tracking-tighter">{t.support.contact.info}</h3>
                                <div className="space-y-8">
                                    <div className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center mr-4 shrink-0">
                                            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Office</p>
                                            <p className="text-sm font-light">Av. El Milagro, Maracaibo, Zulia.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center mr-4 shrink-0">
                                            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                                            <p className="text-sm font-light">+58 424 6888229</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center mr-4 shrink-0">
                                            <svg className="w-5 h-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Email</p>
                                            <p className="text-sm font-light italic">contacto@lagorealty.com.ve</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media Mini Card */}
                            <div className="bg-brand-white border border-brand-black/5 rounded-3xl p-8 flex items-center justify-between shadow-sm">
                                <span className="font-bold text-xs uppercase tracking-widest italic">Follow Excellence</span>
                                <div className="flex space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center text-white hover:bg-brand-green transition-colors cursor-pointer">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" /></svg>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center text-white hover:bg-brand-green transition-colors cursor-pointer">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 6.75l-6.25 6.25 6.25 6.25H18.5l-5-5-5 5H4.75l6.25-6.25L4.75 6.75h3.75l5 5 5-5H22z" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Contact;
