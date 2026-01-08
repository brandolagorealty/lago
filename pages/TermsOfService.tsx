import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../i18n/LanguageContext';

const TermsOfService: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-brand-white flex flex-col">
            <Navbar currentView="none" onNavigate={() => { }} onOpenForm={() => { }} />

            <main className="flex-grow pt-32 pb-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-black mb-8 border-b border-brand-black/10 pb-6 uppercase tracking-tight">
                        {t.support.terms.title}
                    </h1>

                    <div className="prose prose-lg max-w-none text-brand-black/80 space-y-6 leading-relaxed">
                        <p className="font-medium text-brand-green uppercase tracking-widest text-xs">Versión 1.0 - {new Date().getFullYear()}</p>

                        <p>{t.support.terms.content}</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">1. Aceptación de los Términos</h2>
                        <p>Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones, todas las leyes y regulaciones aplicables.</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">2. Propiedad Intelectual</h2>
                        <p>Todo el contenido, incluyendo logotipos, textos, imágenes y el software de nuestro asistente virtual LaGuia, es propiedad exclusiva de Lago Realty o sus licenciantes.</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">3. Uso del Sitio</h2>
                        <p>Este sitio es para uso personal y para la búsqueda de servicios inmobiliarios. Queda prohibido el uso de técnicas de scraping o la reproducción del contenido sin autorización.</p>

                        <div className="bg-brand-green text-white p-8 rounded-3xl mt-12 shadow-xl shadow-brand-green/20">
                            <p className="text-lg font-serif italic">"Excelencia, integridad y transparencia en cada transacción."</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default TermsOfService;
