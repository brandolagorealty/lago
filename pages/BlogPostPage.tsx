import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { propertyService } from '../services/supabase';
import { BlogPost } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoadingScreen from '../components/LoadingScreen';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      setIsLoading(true);
      const data = await propertyService.getBlogPostBySlug(slug);
      setPost(data);
      setIsLoading(false);
    };
    fetchPost();
  }, [slug]);

  if (isLoading) return <LoadingScreen />;

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow pt-32 pb-20 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Artículo no encontrado</h1>
          <p className="text-slate-500 mb-8">El artículo que buscas no existe o ha sido eliminado.</p>
          <Link to="/blog" className="px-6 py-3 bg-brand-green text-white font-bold rounded-xl hover:-translate-y-1 transition-transform">
            Volver al Blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const shareUrl = window.location.href;
  const shareTitle = encodeURIComponent(post.title);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        
        {/* Header Section (Dark Blue Background) */}
        <div className="bg-[#1F3347] pt-12 pb-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Link to="/blog" className="text-brand-green hover:text-white transition-colors flex items-center gap-2 font-bold text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Volver al Blog
              </Link>
              <span className="bg-brand-green text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-full">
                MERCADO INMOBILIARIO
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-[#88C3D8] text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span>{formatDate(post.published_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span>Redacción Lago</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{post.read_time_minutes} min de lectura</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          
          {/* Main Image */}
          {post.image_url && (
            <div className="rounded-3xl overflow-hidden shadow-2xl mb-12 bg-white p-2">
              <img 
                src={post.image_url} 
                alt={post.title}
                className="w-full h-auto max-h-[500px] object-cover rounded-2xl"
              />
            </div>
          )}

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 mb-12">
            
            {/* Markdown Content */}
            <div className="prose prose-lg md:prose-xl prose-slate max-w-none prose-headings:font-serif prose-headings:text-[#1F3347] prose-headings:font-bold prose-h2:border-l-4 prose-h2:border-brand-green prose-h2:pl-4 prose-a:text-brand-green prose-img:rounded-xl">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeSanitize]}
              >
                {post.content_markdown}
              </ReactMarkdown>
            </div>

            {/* Call To Action Block */}
            <div className="mt-16 bg-[#1F3347] rounded-3xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>
              </div>
              
              <h3 className="text-2xl md:text-3xl font-black mb-4 relative z-10">
                ¿Buscas invertir en propiedades?
              </h3>
              <p className="text-[#88C3D8] mb-8 text-lg relative z-10">
                Con años de experiencia, te acompañamos en cada paso del proceso de inversión.
              </p>
              
              <a 
                href={`https://wa.me/58414XXXXXXX?text=Hola,%20leí%20el%20artículo%20"${post.title}"%20y%20quisiera%20asesoría`}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-green hover:bg-[#00D09B] text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 shadow-lg relative z-10"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                Contáctanos por WhatsApp
              </a>
            </div>
            
            {/* Share Section */}
            <div className="mt-8 border-t border-slate-100 pt-8 flex items-center gap-4">
              <span className="font-bold text-slate-900 text-sm">Compartir:</span>
              <a 
                href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`}
                target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a 
                href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
                target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
            </div>

          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
