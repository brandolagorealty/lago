import React, { useState } from 'react';
import { Lead, Property, LeadStatus } from '../types';
import { propertyService } from '../services/supabase';
import { Search, Layout, List, Phone, Mail, Home, MapPin, MessageSquare, X, Send, Calendar, Plus, Trash2, Pencil } from 'lucide-react';

interface CRMTabProps {
    leads: Lead[];
    properties: Property[];
    onRefresh: () => void;
}

export default function CRMTab({ leads, properties, onRefresh }: CRMTabProps) {
    const [view, setView] = useState<'board' | 'list'>('board');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', phone: '', message: '' });

    const [isEditingLead, setIsEditingLead] = useState(false);
    const [editLeadForm, setEditLeadForm] = useState({ name: '', email: '', phone: '' });

    const columns: { id: LeadStatus; title: string; color: string }[] = [
        { id: 'new', title: 'NUEVO', color: 'border-slate-200 bg-slate-50' },
        { id: 'contacted', title: 'CONTACTADO', color: 'border-blue-200 bg-blue-50/50' },
        { id: 'visiting', title: 'AGENDANDO VISITA', color: 'border-purple-200 bg-purple-50/50' },
        { id: 'negotiating', title: 'NEGOCIANDO', color: 'border-amber-200 bg-amber-50/50' },
        { id: 'closed', title: 'CERRADO/GANADO', color: 'border-emerald-200 bg-emerald-50/50' },
        { id: 'lost', title: 'PERDIDO', color: 'border-red-200 bg-red-50/50' }
    ];

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este prospecto? Esta acción no se puede deshacer.')) return;
        setIsSaving(true);
        const { success, error } = await propertyService.deleteLead(leadId);
        setIsSaving(false);
        if (success) {
            setSelectedLead(null);
            onRefresh();
        } else {
            alert('Error al eliminar el prospecto: ' + error);
        }
    };

    const startEditingLead = () => {
        if (selectedLead) {
            setEditLeadForm({
                name: selectedLead.name || '',
                email: selectedLead.email || '',
                phone: selectedLead.phone || ''
            });
            setIsEditingLead(true);
        }
    };

    const handleEditSave = async () => {
        if (!selectedLead || !editLeadForm.name) return;
        setIsSaving(true);
        const { success, error } = await propertyService.updateLead(selectedLead.id, {
            name: editLeadForm.name,
            email: editLeadForm.email,
            phone: editLeadForm.phone
        });
        setIsSaving(false);
        if (success) {
            setIsEditingLead(false);
            // Update the selectedLead locally to reflect changes immediately
            setSelectedLead({ ...selectedLead, ...editLeadForm });
            onRefresh();
        } else {
            alert('Error al actualizar el prospecto: ' + error);
        }
    };

    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone && l.phone.includes(searchQuery))
    );

    const getProperty = (id?: string) => properties.find(p => p.id === id);

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            const el = document.getElementById(`lead-${leadId}`);
            if (el) el.classList.add('opacity-50');
        }, 0);
    };

    const handleDragEnd = (leadId: string) => {
        const el = document.getElementById(`lead-${leadId}`);
        if (el) el.classList.remove('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        const lead = leads.find(l => l.id === leadId);
        if (!lead || lead.status === newStatus) return;

        await propertyService.updateLeadStatus(leadId, newStatus);
        onRefresh();
    };

    // --- Interaction History Handlers ---
    const handleAddNote = async () => {
        if (!newNote.trim() || !selectedLead) return;
        setIsSaving(true);
        try {
            const noteObj = {
                text: newNote,
                date: new Date().toISOString(),
                author: 'Asesor' 
            };
            const updatedNotes = [...(selectedLead.notes || []), noteObj];
            const { success } = await propertyService.updateLead(selectedLead.id, { notes: updatedNotes });
            if (success) {
                setSelectedLead({ ...selectedLead, notes: updatedNotes });
                setNewNote('');
                onRefresh();
            }
        } finally {
            setIsSaving(false);
        }
    };

    // --- Create Lead Handler ---
    const handleCreateLead = async () => {
        if (!newLeadForm.name.trim() || !newLeadForm.email.trim()) {
            alert('Nombre y Correo son obligatorios.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                name: newLeadForm.name,
                email: newLeadForm.email,
                phone: newLeadForm.phone,
                message: newLeadForm.message || 'Prospecto creado manualmente desde el CRM.',
                status: 'new' as LeadStatus
            };
            const { success, error } = await propertyService.createLead(payload);
            if (success) {
                setIsCreatingLead(false);
                setNewLeadForm({ name: '', email: '', phone: '', message: '' });
                onRefresh();
            } else {
                alert('Error al crear el prospecto: ' + error);
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-fade-in">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar prospectos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setView('board')}
                            className={`px-3 py-1.5 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                                view === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Layout className="w-4 h-4" /> Kanban
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                                view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <List className="w-4 h-4" /> Tabla
                        </button>
                    </div>
                    
                    <button
                        onClick={() => setIsCreatingLead(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors font-medium text-sm shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Prospecto
                    </button>
                </div>
            </div>

            {/* Kanban View */}
            {view === 'board' ? (
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
                    {columns.map(col => (
                        <div 
                            key={col.id} 
                            className={`flex flex-col min-w-[300px] w-72 rounded-xl border ${col.color} h-full max-h-[calc(100vh-250px)]`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="p-3 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-xl">
                                <h3 className="text-xs font-bold text-slate-600 tracking-wider">
                                    {col.title}
                                </h3>
                                <span className="bg-white/60 text-slate-500 text-xs py-0.5 px-2 rounded-full font-medium shadow-sm">
                                    {filteredLeads.filter(l => l.status === col.id).length}
                                </span>
                            </div>
                            
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                {filteredLeads.filter(l => l.status === col.id).map(lead => {
                                    const prop = getProperty(lead.property_id);
                                    return (
                                        <div
                                            key={lead.id}
                                            id={`lead-${lead.id}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={() => handleDragEnd(lead.id)}
                                            onClick={() => setSelectedLead(lead)}
                                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:ring-1 hover:ring-brand-green/50 transition-all cursor-pointer border border-slate-100 relative group"
                                        >
                                            <div className="mb-2">
                                                <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors line-clamp-1">{lead.name}</p>
                                                {lead.phone && (
                                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                                        <Phone className="w-3 h-3" />
                                                        <span>{lead.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {prop && (
                                                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded inline-flex max-w-full">
                                                    <Home className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{prop.title}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {filteredLeads.filter(l => l.status === col.id).length === 0 && (
                                    <div className="h-20 border-2 border-dashed border-slate-200/50 rounded-lg flex items-center justify-center">
                                        <p className="text-xs text-slate-400 font-medium">Soltar aquí</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <th className="px-6 py-4">Prospecto</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Interés</th>
                                <th className="px-6 py-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLeads.map(lead => {
                                const prop = getProperty(lead.property_id);
                                const statusCol = columns.find(c => c.id === lead.status);
                                return (
                                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">{lead.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{new Date(lead.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" /> {lead.email}
                                            </div>
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead.phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {prop ? (
                                                <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2.5 py-1 rounded-md inline-block">
                                                    {prop.title}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400 italic">Interés General</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${statusCol?.color} text-slate-700`}>
                                                {statusCol?.title}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                        No hay prospectos que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Lead Modal (Interaction History) */}
            {selectedLead && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Left Column: Lead Info */}
                        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-6 flex flex-col overflow-y-auto">
                            <div className="flex justify-between items-start mb-6 md:hidden">
                                <h2 className="text-xl font-bold text-slate-900">Prospecto</h2>
                                <div className="flex gap-2">
                                    <button onClick={startEditingLead} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors" title="Editar Prospecto">
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDeleteLead(selectedLead.id)} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors" title="Eliminar Prospecto">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="w-16 h-16 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center text-2xl font-bold mb-4 mx-auto md:mx-0 border border-brand-green/20">
                                {selectedLead.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {isEditingLead ? (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Nombre</label>
                                        <input 
                                            type="text" 
                                            value={editLeadForm.name} 
                                            onChange={e => setEditLeadForm({...editLeadForm, name: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                                        <input 
                                            type="email" 
                                            value={editLeadForm.email} 
                                            onChange={e => setEditLeadForm({...editLeadForm, email: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">Teléfono</label>
                                        <input 
                                            type="text" 
                                            value={editLeadForm.phone} 
                                            onChange={e => setEditLeadForm({...editLeadForm, phone: e.target.value})}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-green/20 outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={handleEditSave}
                                            disabled={isSaving}
                                            className="flex-1 bg-brand-green text-white text-sm font-bold py-2 rounded-xl hover:bg-[#1a5b48] transition-colors"
                                        >
                                            {isSaving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingLead(false)}
                                            disabled={isSaving}
                                            className="flex-1 bg-slate-200 text-slate-600 text-sm font-bold py-2 rounded-xl hover:bg-slate-300 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 mb-1 text-center md:text-left">{selectedLead.name}</h2>
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500 mb-6">
                                        <Calendar className="w-4 h-4" /> Registrado el {new Date(selectedLead.created_at).toLocaleDateString()}
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contacto</h3>
                                            <div className="space-y-3">
                                                <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-brand-green transition-colors">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Mail className="w-4 h-4" /></div>
                                                    <span className="truncate">{selectedLead.email}</span>
                                                </a>
                                                {selectedLead.phone && (
                                                    <a href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-700 hover:text-[#25D366] transition-colors group">
                                                        <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center border border-[#25D366]/20 group-hover:bg-[#25D366] group-hover:text-white transition-colors"><Phone className="w-4 h-4" /></div>
                                                        <span>{selectedLead.phone}</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Interés / Mensaje</h3>
                                            {selectedLead.property_id && getProperty(selectedLead.property_id) ? (
                                                <div className="mb-4">
                                                    <div className="text-xs font-bold text-brand-green bg-brand-green/10 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-2 mb-2">
                                                        <Home className="w-4 h-4" /> {getProperty(selectedLead.property_id)?.title}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic">
                                                "{selectedLead.message}"
                                            </p>
                                        </div>
                                        
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Estado del Embudo</h3>
                                            <select
                                                value={selectedLead.status}
                                                onChange={async (e) => {
                                                    const newStat = e.target.value as LeadStatus;
                                                    setSelectedLead({ ...selectedLead, status: newStat });
                                                    await propertyService.updateLeadStatus(selectedLead.id, newStat);
                                                    onRefresh();
                                                }}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                                            >
                                                {columns.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right Column: Interaction History */}
                        <div className="w-full md:w-2/3 bg-white flex flex-col h-[60vh] md:h-[90vh]">
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10 hidden md:flex">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-brand-green" /> Historial de Interacciones
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={startEditingLead} 
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                        title="Editar Prospecto"
                                        disabled={isSaving}
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteLead(selectedLead.id)} 
                                        className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors"
                                        title="Eliminar Prospecto"
                                        disabled={isSaving}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => { setSelectedLead(null); setIsEditingLead(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar space-y-6">
                                {(!selectedLead.notes || selectedLead.notes.length === 0) ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                        <MessageSquare className="w-12 h-12 opacity-20" />
                                        <p className="text-sm font-medium">Aún no hay interacciones registradas.</p>
                                    </div>
                                ) : (
                                    selectedLead.notes.map((note: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                            <div className="w-10 h-10 rounded-full bg-brand-green text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white flex-shrink-0 mt-1">
                                                {note.author ? note.author.charAt(0) : 'A'}
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold text-slate-800">{note.author || 'Asesor'}</span>
                                                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                        {new Date(note.date).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="flex gap-3 items-end">
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Registra una llamada, mensaje o acuerdo..."
                                        className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all custom-scrollbar"
                                        rows={2}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddNote();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim() || isSaving}
                                        className="bg-[#1a1a1a] text-white p-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 shadow-md flex-shrink-0"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">Presiona Enter para enviar, Shift+Enter para salto de línea.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Lead Modal */}
            {isCreatingLead && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-900">Nuevo Prospecto</h2>
                            <button onClick={() => setIsCreatingLead(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={newLeadForm.name}
                                    onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo Electrónico *</label>
                                    <input
                                        type="email"
                                        value={newLeadForm.email}
                                        onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        placeholder="juan@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={newLeadForm.phone}
                                        onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        placeholder="+507 6000-0000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nota o Mensaje Inicial</label>
                                <textarea
                                    value={newLeadForm.message}
                                    onChange={e => setNewLeadForm({...newLeadForm, message: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all resize-none"
                                    placeholder="Detalles sobre el cliente, qué está buscando..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                            <button
                                onClick={() => setIsCreatingLead(false)}
                                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateLead}
                                disabled={isSaving || !newLeadForm.name || !newLeadForm.email}
                                className="px-6 py-2.5 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-black disabled:opacity-50 transition-colors shadow-lg"
                            >
                                {isSaving ? 'Guardando...' : 'Crear Prospecto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
