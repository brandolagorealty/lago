import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { BlogPost } from '../types';
import { propertyService } from '../services/supabase';

interface BlogEditorProps {
  post: BlogPost | null;
  onClose: () => void;
  onSave: () => void;
  onToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ post, onClose, onSave, onToast }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [authorName, setAuthorName] = useState(post?.author_name || 'Redacción Lago');
  const [content, setContent] = useState(post?.content_markdown || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(post?.image_url || '');
  const [isPublished, setIsPublished] = useState(post?.is_published || false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate slug from title if not editing an existing post
  useEffect(() => {
    if (!post && title) {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
      setSlug(generatedSlug);
    }
  }, [title, post]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const noOfWords = text.split(/\s/g).length;
    const minutes = noOfWords / wordsPerMinute;
    const readTime = Math.ceil(minutes);
    return readTime;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !content) {
      onToast({ message: 'El título, el slug y el contenido son obligatorios.', type: 'error' });
      return;
    }

    setIsSaving(true);
    let imageUrl = post?.image_url || null;

    if (imageFile) {
      onToast({ message: 'Subiendo imagen...', type: 'success' });
      const uploadedUrl = await propertyService.uploadBlogImage(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        onToast({ message: 'Error al subir la imagen', type: 'error' });
        setIsSaving(false);
        return;
      }
    }

    const readTime = calculateReadTime(content);

    const postData: Partial<BlogPost> = {
      title,
      slug,
      excerpt,
      author_name: authorName,
      content_markdown: content,
      image_url: imageUrl || undefined,
      is_published: isPublished,
      read_time_minutes: readTime,
      updated_at: new Date().toISOString()
    };

    if (isPublished && !post?.published_at) {
      postData.published_at = new Date().toISOString();
    }

    let result;
    if (post) {
      result = await propertyService.updateBlogPost(post.id, postData);
    } else {
      result = await propertyService.createBlogPost(postData);
    }

    setIsSaving(false);

    if (result.success) {
      onSave();
    } else {
      onToast({ message: 'Error al guardar el artículo: ' + result.error, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900">
              {post ? 'Editar Artículo' : 'Nuevo Artículo'}
            </h2>
            <p className="text-slate-500 text-sm">Crea contenido de valor para tus clientes.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
          <form id="blog-form" onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Título</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                    placeholder="Ej. Guía para invertir en 2026..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Slug (URL amigable)</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all font-mono text-sm"
                    placeholder="guia-para-invertir"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Autor</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Extracto Corto</label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all resize-none"
                    placeholder="Un breve resumen del artículo para las tarjetas..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Imagen Principal</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-white hover:bg-slate-50 transition-colors relative group h-[250px] flex flex-col items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="font-bold text-sm">Clic para subir imagen</p>
                      <p className="text-xs">PNG, JPG o WEBP (Máx. 2MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contenido (Markdown / WYSIWYG)</label>
              <div data-color-mode="light" className="rounded-xl overflow-hidden border border-slate-200">
                <MDEditor
                  value={content}
                  onChange={(val) => setContent(val || '')}
                  height={400}
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${isPublished ? 'bg-brand-green' : 'bg-slate-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isPublished ? 'translate-x-6' : ''}`}></div>
            </div>
            <span className="font-bold text-slate-700 text-sm">
              {isPublished ? 'Publicar Artículo' : 'Guardar como Borrador'}
            </span>
          </label>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="blog-form"
              disabled={isSaving}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center min-w-[120px] disabled:opacity-50"
            >
              {isSaving ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
