import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const Footer: React.FC = () => {
    const { t } = useLanguage();

    const socialLinks = [
        { name: 'Instagram', url: '#', icon: 'M16 3H8C5.23858 3 3 5.23858 3 8V16C3 18.7614 5.23858 21 8 21H16C18.7614 21 21 18.7614 21 16V8C21 5.23858 18.7614 3 16 3ZM12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17ZM16.5 7.5C16.5 8.05228 16.0523 8.5 15.5 8.5C14.9477 8.5 14.5 8.05228 14.5 7.5C14.5 6.94772 14.9477 6.5 15.5 6.5C16.0523 6.5 16.5 6.94772 16.5 7.5Z' },
        { name: 'Facebook', url: '#', icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z' },
        { name: 'LinkedIn', url: '#', icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 2a2 2 0 11-2 2 2 2 0 012-2z' }
    ];

    return (
        <footer className="bg-brand-black text-white pt-20 pb-10 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand Info */}
                    <div className="space-y-6">
                        <Link to="/" className="flex items-center">
                            <img src="/assets/logo2.png" alt="Lago Realty" className="h-16 w-auto" />
                        </Link>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                            {t.footer.description}
                        </p>
                        <div className="flex space-x-4">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-green hover:text-white transition-all text-slate-400"
                                    aria-label={social.name}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={social.icon} />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">{t.footer.quickLinks}</h4>
                        <ul className="space-y-4">
                            <li><Link to="/" className="text-slate-400 hover:text-brand-green text-sm transition-colors">{t.navbar.home}</Link></li>
                            <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-slate-400 hover:text-brand-green text-sm transition-colors">{t.navbar.listings}</button></li>
                            <li><Link to="/contact" className="text-slate-400 hover:text-brand-green text-sm transition-colors">{t.navbar.contact}</Link></li>
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">{t.footer.legal}</h4>
                        <ul className="space-y-4">
                            <li><Link to="/privacy" className="text-slate-400 hover:text-brand-green text-sm transition-colors">{t.support.privacy.title}</Link></li>
                            <li><Link to="/terms" className="text-slate-400 hover:text-brand-green text-sm transition-colors">{t.support.terms.title}</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-xs">{t.footer.contact}</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start group">
                                <svg className="w-5 h-5 text-brand-green mt-0.5 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-slate-400 text-sm group-hover:text-white transition-colors">Maracaibo, Estado Zulia, Venezuela.</span>
                            </li>
                            <li className="flex items-center group">
                                <svg className="w-5 h-5 text-brand-green mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-slate-400 text-sm group-hover:text-white transition-colors">+58 (424) 688-8229</span>
                            </li>
                            <li className="flex items-center group">
                                <svg className="w-5 h-5 text-brand-green mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-slate-400 text-sm group-hover:text-white transition-colors">contacto@lagorealty.com.ve</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-500 text-xs">
                        &copy; {new Date().getFullYear()} Lago Realty. {t.footer.rights}
                    </p>
                    <div className="flex space-x-6">
                        <span className="text-slate-600 text-[10px] uppercase font-bold tracking-tighter">Designed for Elite Performance</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
