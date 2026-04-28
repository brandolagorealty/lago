import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Agent } from '../types';
import { propertyService } from '../services/supabase';

interface AgentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingAgent: Agent | null;
    setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}

export default function AgentFormModal({ isOpen, onClose, onSave, editingAgent, setToast }: AgentFormModalProps) {
    const [isSavingAgent, setIsSavingAgent] = useState(false);
    const [agentAvatarUrl, setAgentAvatarUrl] = useState<string>(editingAgent?.avatar || '');

    // Cropper states
    const [cropImgSrc, setCropImgSrc] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

    if (!isOpen) return null;

    const handleSaveAgent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSavingAgent(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const agentData: any = {
            name: (formData.get('name') as string),
            role: (formData.get('role') as string),
            email: (formData.get('email') as string),
            phone: (formData.get('phone') as string),
            avatar: agentAvatarUrl || (formData.get('avatar_url') as string) || null,
            bookingUrl: (formData.get('booking_url') as string)
        };

        let result;
        if (editingAgent) {
            result = await propertyService.updateAgent(editingAgent.id, agentData);
        } else {
            result = await propertyService.createAgent(agentData);
        }

        if (result.success) {
            setToast({ message: editingAgent ? 'Asesor actualizado' : 'Asesor agregado', type: 'success' });
            onSave();
            onClose();
        } else {
            alert('Error: ' + result.error);
        }
        setIsSavingAgent(false);
    };

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined);
            setCompletedCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setCropImgSrc(reader.result?.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const crop = centerCrop(
            makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
            width, height
        );
        setCrop(crop);
    };

    const handleAvatarUpload = async () => {
        if (!completedCrop || !imgRef.current) return;
        setToast({ message: 'Preparando foto...', type: 'success' });
        
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(
            imgRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0, 0, completedCrop.width, completedCrop.height
        );

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setToast({ message: 'Subiendo foto...', type: 'success' });
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const url = await propertyService.uploadAgentAvatar(file);
            if (url) {
                setAgentAvatarUrl(url);
                setToast({ message: '✅ Foto subida con éxito', type: 'success' });
                setCropImgSrc('');
            } else {
                setToast({ message: 'Error al subir foto. Revisa la consola.', type: 'error' });
            }
        }, 'image/jpeg', 0.95);
    };

    return (
        <>
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-slate-900">{editingAgent ? 'Editar Asesor' : 'Agregar Asesor'}</h2>
                            <p className="text-slate-500 text-sm">Gestiona la información del miembro de tu equipo.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <form onSubmit={handleSaveAgent} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                <input required name="name" defaultValue={editingAgent?.name} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Cargo / Especialidad</label>
                                <input required name="role" defaultValue={editingAgent?.role} placeholder="Ej: Especialista en Captaciones" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Email</label>
                                <input type="email" name="email" defaultValue={editingAgent?.email} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Teléfono</label>
                                <input name="phone" defaultValue={editingAgent?.phone} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Foto del Asesor</label>
                                <label className="text-xs font-bold text-brand-green hover:underline cursor-pointer uppercase tracking-widest flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    Subir desde PC
                                    <input type="file" className="hidden" accept="image/*" onChange={onSelectFile} />
                                </label>
                            </div>
                            <input 
                                name="avatar_url"
                                value={agentAvatarUrl}
                                onChange={e => setAgentAvatarUrl(e.target.value)}
                                placeholder="https://... o sube una foto desde tu PC" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" 
                            />
                            {agentAvatarUrl && (
                                <div className="relative h-24 w-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                                    <img src={agentAvatarUrl} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Link de Reservas (Calendly/Google/Zoom)</label>
                            <input 
                                name="booking_url" 
                                defaultValue={editingAgent?.bookingUrl} 
                                placeholder="https://calendly.com/..." 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" 
                            />
                        </div>
                        <button disabled={isSavingAgent} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
                            {isSavingAgent && (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isSavingAgent ? 'Guardando...' : (editingAgent ? 'Guardar Cambios' : 'Registrar Asesor')}
                        </button>
                    </form>
                </div>
            </div>

            {cropImgSrc && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setCropImgSrc('')}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-900 text-lg">Recortar Foto de Perfil</h3>
                            <button type="button" onClick={() => setCropImgSrc('')} className="p-2 text-slate-400 hover:bg-white rounded-full transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-grow flex flex-col items-center bg-slate-100/50">
                            <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={1} circularCrop>
                                <img ref={imgRef} alt="Crop" src={cropImgSrc} onLoad={onImageLoad} className="max-h-[50vh] object-contain rounded-xl shadow-sm" />
                            </ReactCrop>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex gap-4 bg-white">
                            <button type="button" onClick={() => setCropImgSrc('')} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="button" onClick={handleAvatarUpload} className="flex-1 py-3 font-bold text-white bg-brand-green rounded-xl hover:bg-brand-green/90 transition-colors shadow-lg shadow-brand-green/20">Aplicar y Subir</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
