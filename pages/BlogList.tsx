import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyService } from '../services/supabase';
import { BlogPost } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const data = await propertyService.getBlogPosts(true); // Only published
      setPosts(data);
      setIsLoading(false);
    };
    fetchPosts();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-10">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-green"></span>
            <span className="text-xs font-bold text-brand-green uppercase tracking-[0.2em]">Blog Inmobiliario</span>
            <span className="w-2 h-2 rounded-full bg-brand-green"></span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-[#222831] mb-4">
            Últimos <span className="text-brand-green">Artículos</span>
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto mb-16 text-lg">
            Análisis, tendencias y consejos para tomar las mejores decisiones en bienes raíces
          </p>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-slate-500">Próximamente publicaremos nuevos artículos.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                {posts.map(post => (
                  <div key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                    
                    {/* Card Image */}
                    <div className="relative h-56 overflow-hidden bg-slate-100">
                      {post.image_url ? (
                        <img 
                          src={post.image_url} 
                          alt={post.title} 
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                           <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      
                      {/* Category Tag */}
                      <div className="absolute top-4 left-4">
                        <span className="bg-brand-green text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full">
                          MERCADO INMOBILIARIO
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-8 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 text-slate-400 text-sm mb-4 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>{formatDate(post.published_at)}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-slate-500 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                        {post.excerpt || post.content_markdown.substring(0, 150).replace(/[#*`_]/g, '') + '...'}
                      </p>
                      
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-brand-green font-bold text-sm uppercase tracking-wider inline-flex items-center gap-1 hover:gap-2 transition-all group mt-auto"
                      >
                        LEER ARTÍCULO 
                        <svg className="w-4 h-4 text-brand-green transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {posts.length > 0 && (
                <div className="mt-16 text-center">
                  <button className="bg-[#1F5566] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all inline-flex items-center gap-2">
                    Ver todos los artículos
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogList;
