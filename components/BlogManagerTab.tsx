import React, { useState, useEffect } from 'react';
import { BlogPost } from '../types';
import { propertyService } from '../services/supabase';
import BlogEditor from './BlogEditor';

interface BlogManagerTabProps {
  onToast: (toast: { message: string; type: 'success' | 'error' }) => void;
}

const BlogManagerTab: React.FC<BlogManagerTabProps> = ({ onToast }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    const data = await propertyService.getBlogPosts(false); // fetch all, including drafts
    setPosts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleOpenEditor = (post?: BlogPost) => {
    setEditingPost(post || null);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditingPost(null);
    setIsEditorOpen(false);
  };

  const handleSave = async () => {
    await fetchPosts();
    handleCloseEditor();
    onToast({ message: 'Artículo guardado exitosamente', type: 'success' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este artículo?')) return;
    const result = await propertyService.deleteBlogPost(id);
    if (result.success) {
      onToast({ message: 'Artículo eliminado', type: 'success' });
      fetchPosts();
    } else {
      onToast({ message: 'Error al eliminar el artículo', type: 'error' });
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Blog Inmobiliario</h2>
          <p className="text-slate-500 text-sm mt-1">Gestiona los artículos de noticias y consejos para tus clientes.</p>
        </div>
        <button
          onClick={() => handleOpenEditor()}
          className="px-6 py-3 bg-brand-green text-white font-bold rounded-xl shadow-lg shadow-brand-green/30 hover:scale-105 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Artículo
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Cargando artículos...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold">No hay artículos creados aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Artículo</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Lectura</th>
                  <th className="px-6 py-4">Fecha Pub.</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {post.image_url ? (
                          <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{post.title}</p>
                          <p className="text-xs text-slate-400">/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${post.is_published ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {post.is_published ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{post.read_time_minutes} min</td>
                    <td className="px-6 py-4 font-medium">{formatDate(post.published_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditor(post)}
                        className="p-2 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors inline-block"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block ml-1"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditorOpen && (
        <BlogEditor
          post={editingPost}
          onClose={handleCloseEditor}
          onSave={handleSave}
          onToast={onToast}
        />
      )}
    </div>
  );
};

export default BlogManagerTab;
