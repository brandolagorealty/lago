import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyService } from '../services/supabase';
import { BlogPost } from '../types';

const BlogSection: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPosts = async () => {
      setIsLoading(true);
      try {
        const data = await propertyService.getBlogPosts(true);
        setPosts(data.slice(0, 3));
      } catch (error) {
        console.error('Error loading latest blog posts:', error);
      }
      setIsLoading(false);
    };

    fetchLatestPosts();
  }, []);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Section always renders - shows empty state if no posts

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Subtitle Badge */}
        <div className="inline-flex items-center justify-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-green"></span>
          <span className="text-xs font-bold text-brand-green uppercase tracking-[0.2em]">Blog Inmobiliario</span>
          <span className="w-2 h-2 rounded-full bg-brand-green"></span>
        </div>
        
        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-black text-[#222831] mb-4">
          Últimos <span className="text-brand-green">Artículos</span>
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto mb-16 text-lg">
          Todo lo que necesitas saber para invertir, vender o alquilar en Venezuela.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-96 animate-pulse shadow-sm border border-slate-100"></div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100 max-w-2xl mx-auto">
            <svg className="w-16 h-16 mx-auto text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Próximamente</h3>
            <p className="text-slate-400">Estamos preparando contenido de valor para ti. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full border border-slate-100"
                >
                  {/* Image Container */}
                  <div className="relative h-52 overflow-hidden bg-slate-100">
                    {post.image_url ? (
                      <img 
                        src={post.image_url} 
                        alt={post.title} 
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Category Tag */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-brand-green text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full shadow-md">
                        MERCADO INMOBILIARIO
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-3 font-medium">
                      <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(post.published_at)}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug line-clamp-2 hover:text-brand-green transition-colors">
                      <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>
                    
                    <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                      {post.excerpt || post.content_markdown.substring(0, 140).replace(/[#*`_]/g, '') + '...'}
                    </p>
                    
                    <Link 
                      to={`/blog/${post.slug}`}
                      className="text-brand-green font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 hover:gap-2 transition-all mt-auto"
                    >
                      LEER ARTÍCULO 
                      <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Button - Ver más */}
            <div className="mt-14 text-center">
              <Link 
                to="/blog"
                className="bg-[#1F5566] hover:bg-[#1A3D48] text-white font-bold py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center gap-2 text-sm"
              >
                Ver todos los artículos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
