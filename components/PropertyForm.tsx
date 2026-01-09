import React, { useState } from 'react';
import { Property } from '../types';
import { propertyService } from '../services/supabase';
import { useLanguage } from '../i18n/LanguageContext';
import { ZULIA_CITIES } from '../constants/locations';

interface PropertyFormProps {
  onClose: () => void;
  onSave: (property: Property) => Promise<void>;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    location: '',
    type: 'House',
    listingType: 'sale', // Default to sale
    beds: '1',
    baths: '1',
    sqft: '500',
    description: '',
    shortDescription: '',
    features: { general: [], interior: [], exterior: [] } as { general: string[], interior: string[], exterior: string[] },
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800',
    images: [] as string[],
    status: 'available' as any,
    agentId: '',
    agentNotes: ''
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    const fetchAgents = async () => {
      const data = await propertyService.getAgents();
      setAgents(data);
    };
    fetchAgents();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'gallery') => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const files = Array.from(e.target.files) as File[];

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          continue;
        }

        const url = await propertyService.uploadImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (target === 'main') {
        if (uploadedUrls.length > 0) {
          setFormData(prev => ({ ...prev, image: uploadedUrls[0] }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      // Clear input value to allow selecting same file again
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newProperty: Property = {
      id: Date.now().toString(),
      title: formData.title,
      price: Number(formData.price),
      location: formData.location,
      type: formData.type as any,
      listingType: formData.listingType as any, // Add to property object
      beds: Number(formData.beds),
      baths: Number(formData.baths),
      sqft: Number(formData.sqft),
      image: formData.image,
      description: formData.description,
      shortDescription: formData.shortDescription,
      features: formData.features,
      images: formData.images, // Add gallery
      featured: false,
      status: formData.status,
      agentId: formData.agentId || undefined,
      agentNotes: formData.agentNotes
    };
    await onSave(newProperty);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900">{t.form.title}</h2>
            <p className="text-slate-500 text-sm">{t.form.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.title}</label>
            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={t.form.placeholders.title} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.price}</label>
            <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder={t.form.placeholders.price} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.type}</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
              <option value="House">{t.hero.types.house}</option>
              <option value="Apartment">{t.hero.types.apartment}</option>
              <option value="Commercial">{t.hero.types.commercial}</option>
              <option value="Land">{t.hero.types.land}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.hero.search.operation}</label>
            <div className="flex space-x-4 pt-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  value="sale"
                  checked={formData.listingType === 'sale'}
                  onChange={() => setFormData({ ...formData, listingType: 'sale' as any })}
                  className="form-radio text-brand-green focus:ring-brand-green"
                />
                <span className="text-sm font-bold text-brand-black">{t.hero.types.sale}</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="listingType"
                  value="rent"
                  checked={formData.listingType === 'rent'}
                  onChange={() => setFormData({ ...formData, listingType: 'rent' as any })}
                  className="form-radio text-brand-green focus:ring-brand-green"
                />
                <span className="text-sm font-bold text-brand-black">{t.hero.types.rent}</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.location}</label>
            <select
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            >
              <option value="">{t.form.placeholders.location}</option>
              {ZULIA_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.beds}</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={formData.beds} onChange={e => setFormData({ ...formData, beds: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.baths}</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={formData.baths} onChange={e => setFormData({ ...formData, baths: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.sqft}</label>
              <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={formData.sqft} onChange={e => setFormData({ ...formData, sqft: e.target.value })} />
            </div>
          </div>

          {/* Short Description */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Short Description (Card View)</label>
            <input
              type="text"
              maxLength={150}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.shortDescription}
              onChange={e => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief summary for listing card..."
            />
          </div>

          {/* Long Description */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.form.labels.description}</label>
            <textarea required rows={5} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={t.form.placeholders.description}></textarea>
          </div>

          {/* Features Management (Simplified for now - text inputs separated by commas) */}
          <div className="md:col-span-2 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900">Features (comma separated)</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">General</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                placeholder="e.g. Ocean View, Parking, Security"
                value={formData.features.general.join(', ')}
                onChange={(e) => setFormData({ ...formData, features: { ...formData.features, general: e.target.value.split(',').map(s => s.trim()) } })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Interior</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                placeholder="e.g. Furnished, AC"
                value={formData.features.interior.join(', ')}
                onChange={(e) => setFormData({ ...formData, features: { ...formData.features, interior: e.target.value.split(',').map(s => s.trim()) } })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exterior</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                placeholder="e.g. Pool, Garden"
                value={formData.features.exterior.join(', ')}
                onChange={(e) => setFormData({ ...formData, features: { ...formData.features, exterior: e.target.value.split(',').map(s => s.trim()) } })}
              />
            </div>
          </div>

          {/* CRM Details - Agent, Status & Notes */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-green uppercase tracking-widest">Asignar Agente</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20"
                value={formData.agentId}
                onChange={e => setFormData({ ...formData, agentId: e.target.value })}
              >
                <option value="">Seleccionar Agente...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-green uppercase tracking-widest">Estatus de Propiedad</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="available">Disponible</option>
                <option value="reserved">Reservada</option>
                <option value="sold">Vendida</option>
                <option value="rented">Alquilada</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-brand-green uppercase tracking-widest">Notas del Agente (Interno)</label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20 resize-none"
                placeholder="Observaciones sobre la captación o el estatus..."
                value={formData.agentNotes}
                onChange={e => setFormData({ ...formData, agentNotes: e.target.value })}
              ></textarea>
            </div>
          </div>

          {/* Main Image */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main Image</label>
              <label className={`text-xs font-bold text-brand-blue hover:text-brand-green cursor-pointer uppercase tracking-widest ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'main')}
                  disabled={uploading}
                />
              </label>
            </div>
            <input
              type="url"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.image}
              onChange={e => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://... or upload a file"
            />
          </div>

          {/* Gallery Images Management */}
          <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gallery Images</label>
              <div className="flex space-x-3">
                <label className={`text-sm font-bold text-brand-black hover:text-brand-green transition-colors flex items-center cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {uploading ? 'Uploading...' : 'Upload Photos'}
                  <input
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'gallery')}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ''] }))}
                  className="text-sm font-bold text-brand-green hover:text-brand-blue transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  Add Image URL
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.images.map((imgUrl, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-grow space-y-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-green/20"
                      value={imgUrl}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[idx] = e.target.value;
                        setFormData({ ...formData, images: newImages });
                      }}
                    />
                    {imgUrl && (
                      <div className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-200">
                        <img
                          src={imgUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = formData.images.filter((_, i) => i !== idx);
                      setFormData({ ...formData, images: newImages });
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}

              {formData.images.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  No additional images added
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? t.form.submitting : t.form.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
