import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLanguage } from '../i18n/LanguageContext';

const PrivacyPolicy: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-brand-white flex flex-col">
            <Navbar currentView="none" onNavigate={() => { }} onOpenForm={() => { }} />

            <main className="flex-grow pt-32 pb-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-black mb-8 border-b border-brand-black/10 pb-6 uppercase tracking-tight">
                        {t.support.privacy.title}
                    </h1>

                    <div className="prose prose-lg max-w-none text-brand-black/80 space-y-6 leading-relaxed">
                        <p className="font-medium text-brand-green uppercase tracking-widest text-xs">{new Date().toLocaleDateString()}</p>

                        <p>{t.support.privacy.content}</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">1. Información que Recopilamos</h2>
                        <p>Recopilamos información personal cuando te pones en contacto con nosotros o utilizas nuestro asistente virtual LaGuia, incluyendo tu nombre, correo electrónico y número de teléfono.</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">2. Uso de la Información</h2>
                        <p>Utilizamos tus datos exclusivamente para proporcionarte servicios inmobiliarios personalizados, procesar tus solicitudes y mejorar tu experiencia en nuestra plataforma.</p>

                        <h2 className="text-2xl font-bold text-brand-black pt-6">3. Seguridad de los Datos</h2>
                        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal contra el acceso no autorizado o la pérdida.</p>

                        <div className="bg-brand-black/5 p-8 rounded-3xl mt-12 border border-brand-black/5">
                            <h3 className="text-xl font-bold text-brand-black mb-4 uppercase tracking-tighter italic">Compromiso Lago Realty</h3>
                            <p className="text-sm">Nos comprometemos a nunca vender ni compartir tus datos personales con terceros para fines de marketing sin tu consentimiento explícito.</p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
