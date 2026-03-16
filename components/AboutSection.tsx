import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const AboutSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-brand-green/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-slate-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://picsum.photos/seed/team/800/800"
                alt="Our Team"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-4 block">{t.about.tagline}</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-8 leading-tight">
              {t.about.title}
            </h2>

            <div className="space-y-8">
              <div className="border-l-4 border-brand-green pl-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t.about.mission}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {t.about.missionContent}
                </p>
              </div>

              <div className="border-l-4 border-slate-900 pl-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{t.about.vision}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {t.about.visionContent}
                </p>
              </div>

              <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Audiovisual Pillar */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{t.about.pillars.audiovisual.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{t.about.pillars.audiovisual.subtitle}</p>
                  </div>
                </div>

                {/* Marketing Pillar */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{t.about.pillars.marketing.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{t.about.pillars.marketing.subtitle}</p>
                  </div>
                </div>

                {/* Sales Pillar */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{t.about.pillars.sales.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{t.about.pillars.sales.subtitle}</p>
                  </div>
                </div>

                {/* Strategy Pillar */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{t.about.pillars.strategy.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{t.about.pillars.strategy.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
