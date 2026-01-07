import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const AboutSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://picsum.photos/seed/team/800/800"
                alt="Our Team"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <span className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-4 block">{t.about.tagline}</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-8 leading-tight">
              {t.about.title}
            </h2>

            <div className="space-y-8">
              <div className="border-l-4 border-blue-600 pl-6">
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

              <div className="pt-4 grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">10+</div>
                  <div className="text-slate-500 text-sm">{t.about.years}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">500M+</div>
                  <div className="text-slate-500 text-sm">{t.about.volume}</div>
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
