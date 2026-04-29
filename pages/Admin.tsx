import React, { useState, useEffect, useMemo } from 'react';

import PropertyForm from '../components/PropertyForm';
import TasksModule from '../components/TasksModule';
import AppraiserModule from '../components/AppraiserModule';
import ProspectorModule from '../components/ProspectorModule';
import DashboardTab from '../components/DashboardTab';
import CRMTab from '../components/CRMTab';
import InventoryTab from '../components/InventoryTab';
import TeamTab from '../components/TeamTab';
import SecurityTab from '../components/SecurityTab';
import AuditTab from '../components/AuditTab';
import AgentFormModal from '../components/AgentFormModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import NotificationCenter from '../components/NotificationCenter';
import { Property, Agent, PropertyStatus, PropertyNote, Lead, LeadStatus, UserRole, AuditLog } from '../types';
import { propertyService } from '../services/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);
};



const Admin: React.FC = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'tasks' | 'crm' | 'appraiser' | 'prospector' | 'team' | 'seguridad' | 'auditoria'>('dashboard');
    const [properties, setProperties] = useState<Property[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [userRoles, setUserRoles] = useState<UserRole[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<'superadmin' | 'asesor' | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [agentFilter, setAgentFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
    const [textFilter, setTextFilter] = useState('');
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [showAgentForm, setShowAgentForm] = useState(false);
    const [isSavingAgent, setIsSavingAgent] = useState(false);
    const [agentAvatarUrl, setAgentAvatarUrl] = useState<string>('');

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Responsive state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
        // Auto-navigate functionality was removed along with the bookmarklet.
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // First, get the current user's role via a safe RPC function (avoids recursive RLS)
            console.log('[DEBUG] Admin: Fetching role via RPC...');
            const myRole = await propertyService.getMyRole();
            console.log('[DEBUG] Admin: Role fetched:', myRole);
            setCurrentUserRole(myRole as 'superadmin' | 'asesor');

            // Fetch common data for all users (page 0, large page size to get all for now)
            const [propsResult, agentsData, leadsResult] = await Promise.all([
                propertyService.getAdminProperties(0, 200),
                propertyService.getAgents(),
                propertyService.getLeads(0, 200),
            ]);
            setProperties(propsResult.data);
            setAgents(agentsData);
            setLeads(leadsResult.data);

            // Only fetch sensitive security data for superadmins
            if (myRole === 'superadmin') {
                const [rolesData, logsResult] = await Promise.all([
                    propertyService.getUserRoles(),
                    propertyService.getAuditLogs(0, 200)
                ]);
                setUserRoles(rolesData);
                setAuditLogs(logsResult.data);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setIsLoading(false);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteEmail.includes('@')) {
            setInviteResult({ type: 'error', message: 'Por favor ingresa un correo electrónico válido.' });
            return;
        }
        setIsInviting(true);
        setInviteResult(null);
        try {
            const { supabase: supabaseClient } = await import('../services/supabase');
            const session = (await supabaseClient?.auth.getSession())?.data?.session;
            const token = session?.access_token;
            const response = await fetch('/.netlify/functions/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: inviteEmail }),
            });
            const result = await response.json();
            if (response.ok) {
                setInviteResult({ type: 'success', message: `✅ Invitación enviada con éxito a ${inviteEmail}` });
                setInviteEmail('');
                fetchData(); // Refresh user roles list
            } else {
                setInviteResult({ type: 'error', message: `Error: ${result.error}` });
            }
        } catch {
            setInviteResult({ type: 'error', message: 'Error de conexión. Verifica que el servidor esté activo.' });
        }
        setIsInviting(false);
    };

    const handleSaveProperty = async (property: Property, isPublished: boolean = true) => {
        const isEditing = !!properties.find(p => p.id === property.id);
        let result;

        if (isEditing) {
            // Pass isPublished so that "Save as Draft" correctly sets is_published=false
            result = await propertyService.updateProperty(property.id, { ...property, isPublished });
        } else {
            const { id, ...propertyData } = property;
            result = await propertyService.createProperty(propertyData, isPublished);
        }

        if (result.success) {
            await fetchData();
            setShowForm(false);
            setEditingProperty(null);
            const msg = isPublished
                ? (isEditing ? 'Propiedad publicada' : 'Propiedad publicada')
                : (isEditing ? 'Borrador guardado' : 'Borrador creado');
            setToast({ message: msg, type: 'success' });
        } else {
            alert('Error: ' + (result.error?.message || result.error));
        }
    };

    const updatePropertyStatus = async (id: string, status: PropertyStatus) => {
        const result = await propertyService.updateProperty(id, { status });
        if (result.success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setToast({ message: 'Estatus actualizado correctamente', type: 'success' });
        } else {
            setToast({ message: 'Error al actualizar el estatus', type: 'error' });
        }
    };

    const updatePropertyAgent = async (id: string, agentId: string) => {
        // Multi-agent support: for table quick action, we just set this as the only agent or add it?
        // Let's make it "replace/set primary" for the quick select
        const result = await propertyService.updateProperty(id, { agentIds: agentId ? [agentId] : [] });
        if (result.success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, agentIds: agentId ? [agentId] : [] } : p));
            setToast({ message: 'Agente asignado correctamente', type: 'success' });
        } else {
            setToast({ message: 'Error al asignar el agente', type: 'error' });
        }
    };

    const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
        const result = await propertyService.updateProperty(id, updates);
        if (result.success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            if (selectedProperty?.id === id) {
                setSelectedProperty(prev => prev ? { ...prev, ...updates } : null);
            }
            setToast({ message: 'Propiedad actualizada con éxito', type: 'success' });
        } else {
            setToast({ message: 'Error al actualizar la propiedad', type: 'error' });
        }
    };

    const handleDeleteProperty = async (id: string) => {
        console.log('Procediendo con la eliminación en Supabase para ID:', id);
        setToast({ message: 'Eliminando propiedad...', type: 'success' });

        const result = await propertyService.deleteProperty(id);
        if (result.success) {
            if (result.count === 0) {
                console.warn('Eliminación exitosa pero 0 filas afectadas. Posible restricción de RLS.');
                setToast({ message: 'Error: No tienes permisos para eliminar este registro en la base de datos.', type: 'error' });
                // We keep it in the list since it wasn't really deleted
            } else {
                console.log('Propiedad eliminada con éxito');
                setProperties(prev => prev.filter(p => p.id !== id));
                setToast({ message: 'Propiedad eliminada correctamente', type: 'success' });
            }
        } else {
            console.error('Error al eliminar propiedad:', result.error);
            setToast({ message: 'Error al eliminar la propiedad: ' + result.error, type: 'error' });
        }
        setPropertyToDelete(null);
    };

    const handleDeleteAgent = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este asesor?')) return;
        const result = await propertyService.deleteAgent(id);
        if (result.success) {
            setAgents(prev => prev.filter(a => a.id !== id));
            setToast({ message: 'Asesor eliminado', type: 'success' });
        } else {
            setToast({ message: 'Error al eliminar: ' + result.error, type: 'error' });
        }
    };

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesAgent = agentFilter ? p.agentIds?.includes(agentFilter) : true;
            const matchesStatus = statusFilter === 'draft' 
                ? !p.isPublished 
                : statusFilter !== 'all' 
                    ? p.status === statusFilter 
                    : true;
            const matchesText = textFilter ?
                (p.title.toLowerCase().includes(textFilter.toLowerCase()) ||
                    p.location.toLowerCase().includes(textFilter.toLowerCase())) : true;

            return matchesAgent && matchesStatus && matchesText;
        });
    }, [properties, agentFilter, statusFilter, textFilter]);

    const StatusBadge = ({ status }: { status: PropertyStatus }) => {
        const colors = {
            available: 'bg-green-100 text-green-700 border-green-200',
            sold: 'bg-slate-100 text-slate-700 border-slate-200',
            rented: 'bg-blue-100 text-blue-700 border-blue-200',
            reserved: 'bg-amber-100 text-amber-700 border-amber-200',
        };
        const labels = {
            available: 'Disponible',
            sold: 'Vendida',
            rented: 'Alquilada',
            reserved: 'Reservada',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${colors[status]}`}>
                {labels[status]}
            </span>
        );
    };



    const PropertyDetailModal = ({ property, onClose, onUpdate }: { property: Property, onClose: () => void, onUpdate: (id: string, updates: Partial<Property>) => Promise<void> }) => {
        const [newNote, setNewNote] = useState('');
        const [isAddingNote, setIsAddingNote] = useState(false);

        const handleAddNote = async () => {
            if (!newNote.trim()) return;
            setIsAddingNote(true);
            const note: PropertyNote = {
                id: Date.now().toString(),
                agentName: user?.email?.split('@')[0] || 'Admin',
                text: newNote,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const updatedNotes = [note, ...(property.agentNotes || [])];
            await onUpdate(property.id, { agentNotes: updatedNotes });
            setNewNote('');
            setIsAddingNote(false);
        };

        const handleDeleteNote = async (id: string) => {
            if (!confirm('¿Eliminar esta nota?')) return;
            const updatedNotes = (property.agentNotes || []).filter(n => n.id !== id);
            await onUpdate(property.id, { agentNotes: updatedNotes });
        };

        const formatNoteDate = (isoDate: string) => {
            return new Date(isoDate).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
                <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                        <div className="flex gap-4">
                            <img src={property.image} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl font-serif font-bold text-slate-900">{property.title}</h2>
                                    <StatusBadge status={property.status} />
                                </div>
                                <p className="text-slate-500 flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {property.location}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">
                        <div className="space-y-6">
                            <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gestión de Estatus</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {['available', 'reserved', 'sold', 'rented'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => onUpdate(property.id, { status: s as PropertyStatus })}
                                            className={`py-3 rounded-xl text-xs font-bold uppercase transition-all ${property.status === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {s === 'available' ? 'Disponible' : s === 'reserved' ? 'Reservada' : s === 'sold' ? 'Vendida' : 'Alquilada'}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Detalles de Venta</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Precio</p>
                                        <p className="text-xl font-serif font-bold text-slate-900">{formatCurrency(property.price)}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tipo de Listado</p>
                                        <p className="text-xl font-serif font-bold text-slate-900 uppercase tracking-tighter">{property.listingType === 'sale' ? 'Venta' : 'Alquiler'}</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Bitácora del Agente</h3>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-green/20 transition-all">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Escribe un avance..."
                                    className="w-full p-4 text-sm outline-none resize-none bg-slate-50/50"
                                    rows={3}
                                />
                                <div className="p-3 bg-slate-50 flex justify-end">
                                    <button
                                        onClick={handleAddNote}
                                        disabled={isAddingNote || !newNote.trim()}
                                        className="px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center"
                                    >
                                        {isAddingNote && (
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        {isAddingNote ? 'Guardando...' : 'Añadir Nota'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mt-6">
                                {(property.agentNotes || []).length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 italic text-sm border-2 border-dashed border-slate-100 rounded-3xl">
                                        No hay notas registradas.
                                    </div>
                                ) : (
                                    (property.agentNotes || []).map((note) => (
                                        <div key={note.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group/note">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-brand-green uppercase tracking-wider">{note.agentName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400">{formatNoteDate(note.createdAt)}</span>
                                                    <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover/note:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{note.text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#EFEFEF] flex animate-in fade-in duration-500 overflow-x-hidden">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-[#1A1A1A] border-r border-white/5 flex flex-col fixed h-screen z-50 text-[#EFEFEF]/70 shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div 
                    className="h-20 flex items-center px-6 gap-3 border-b border-white/5 cursor-pointer shrink-0"
                    onClick={() => {
                        setActiveTab('inventory');
                        setAgentFilter(null);
                        setSelectedProperty(null);
                    }}
                >
                    <img 
                        src="https://scdztnzkzrvjgyefunkw.supabase.co/storage/v1/object/public/assets/logos/LAGO%20BLANCO-01.png" 
                        alt="Lago Realty" 
                        className="h-10 w-auto object-contain" 
                    />
                </div>
                
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
                    <p className="px-4 text-[10px] font-bold text-[#EFEFEF]/40 uppercase tracking-widest mb-2 mt-2">Gestión</p>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'dashboard' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Panel Principal
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'inventory' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Propiedades
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'tasks' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="truncate">Tareas</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('crm')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'crm' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Embudo CRM
                    </button>
                    <button
                        onClick={() => setActiveTab('appraiser')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'appraiser' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-orange-500 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            Tasador Inteligente
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('prospector'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'prospector' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-indigo-500 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            Captación AI
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('team'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'team' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Equipo
                    </button>

                    {currentUserRole === 'superadmin' && (
                        <>
                            <p className="px-4 text-[10px] font-bold text-[#EFEFEF]/40 uppercase tracking-widest mb-2 mt-8">Administración</p>
                            <button
                                onClick={() => { setActiveTab('seguridad'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'seguridad' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                            >
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                <span className="truncate">Roles y Accesos</span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('auditoria'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'auditoria' ? 'bg-[#1F5566] text-[#EFEFEF] shadow-lg shadow-[#1F5566]/20' : 'text-[#EFEFEF]/60 hover:bg-white/5 hover:text-[#EFEFEF]'}`}
                            >
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2v1M12 12h.01M12 16h.01M16 12h.01M16 16h.01" /></svg>
                                <span className="truncate">Auditoría</span>
                            </button>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-white/5 shrink-0">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                        <div className="w-8 h-8 rounded-full bg-[#88C3D8] flex items-center justify-center text-[#1A1A1A] font-extrabold text-xs shrink-0 shadow-inner">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[#EFEFEF] truncate">{user?.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-[#88C3D8] uppercase font-bold truncate tracking-widest">{currentUserRole || 'Asesor'}</p>
                        </div>
                        <NotificationCenter 
                            direction="up"
                            align="left"
                            onNavigate={(tab) => {
                                setActiveTab(tab as any);
                                setIsMobileMenuOpen(false);
                            }} 
                        />
                        <button onClick={handleLogout} className="p-2 text-[#EFEFEF]/50 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors shrink-0" title="Cerrar Sesión">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 flex flex-col min-w-0 transition-all duration-300">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="font-serif font-bold text-slate-900 text-lg">Lago Realty</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="mr-1">
                            <NotificationCenter 
                                direction="down"
                                onNavigate={(tab) => {
                                    setActiveTab(tab as any);
                                    setIsMobileMenuOpen(false);
                                }} 
                            />
                        </div>
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </button>
                    </div>
                </div>

                <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 md:px-10">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900">Dashboard de Ventas</h1>
                            <p className="text-slate-500">Métricas clave y rendimiento general del inventario.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Total Inventario</p>
                                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(properties.reduce((sum, p) => p.status === 'available' ? sum + p.price : sum, 0))}</h3>
                                </div>
                                <div className="text-sm font-bold text-brand-green">En Propiedades Activas</div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Prospectos Activos</p>
                                    <h3 className="text-3xl font-bold text-slate-900">{leads.filter(l => l.status !== 'closed' && l.status !== 'lost').length}</h3>
                                </div>
                                <div className="text-sm font-bold text-brand-blue">Total Leads: {leads.length}</div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Tasa de Cierre General</p>
                                    <h3 className="text-3xl font-bold text-slate-900">
                                        {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'closed').length / leads.length) * 100) : 0}%
                                    </h3>
                                </div>
                                <div className="text-sm font-bold text-amber-500">A partir de {leads.filter(l => l.status === 'closed').length} tratos cerrados</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'crm' && (
                    <CRMTab leads={leads} properties={properties} onRefresh={fetchData} />
                )}

                {activeTab === 'inventory' && (
                    <InventoryTab
                        properties={properties}
                        agents={agents}
                        currentUserRole={currentUserRole}
                        isLoading={isLoading}
                        agentFilter={agentFilter}
                        onClearAgentFilter={() => setAgentFilter(null)}
                        onShowForm={() => setShowForm(true)}
                        onEditProperty={setEditingProperty}
                        onSelectProperty={setSelectedProperty}
                        onDeleteProperty={setPropertyToDelete}
                        onPropertiesChange={setProperties}
                        setToast={setToast}
                    />
                )}

                {activeTab === 'team' && (
                    <TeamTab
                        agents={agents}
                        properties={properties}
                        onEditAgent={(agent) => {
                            setEditingAgent(agent);
                            setAgentAvatarUrl(agent.avatar);
                            setShowAgentForm(true);
                        }}
                        onDeleteAgent={handleDeleteAgent}
                        onShowAgentForm={() => {
                            setEditingAgent(null);
                            setAgentAvatarUrl('');
                            setShowAgentForm(true);
                        }}
                        onFilterByAgent={(agentId) => {
                            setAgentFilter(agentId);
                            setActiveTab('inventory');
                        }}
                    />
                )}

                {activeTab === 'seguridad' && currentUserRole === 'superadmin' && (
                    <SecurityTab userRoles={userRoles} onRefresh={fetchData} setToast={setToast} />
                )}

                {activeTab === 'auditoria' && currentUserRole === 'superadmin' && (
                    <AuditTab auditLogs={auditLogs} />
                )}
                {/* Modulo de Tareas / Lago Realty */}
                {activeTab === 'tasks' && (
                    <div className="flex-1 animate-in fade-in space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestor de Tareas y Actividades Corporativas</h1>
                            </div>
                        </div>
                        <TasksModule currentUserRole={currentUserRole} />
                    </div>
                )}
                {/* Modulo de Tasador AI */}
                {activeTab === 'appraiser' && (
                    <div className="flex-1 animate-in fade-in space-y-4">
                        <AppraiserModule />
                    </div>
                )}
                {/* Modulo de Prospector AI */}
                {activeTab === 'prospector' && (
                    <div className="flex-1 animate-in fade-in space-y-4">
                        <ProspectorModule />
                    </div>
                )}

            </main>
            </div>

            {(showForm || editingProperty) && (
                <PropertyForm
                    initialData={editingProperty || undefined}
                    onClose={() => {
                        setShowForm(false);
                        setEditingProperty(null);
                    }}
                    onSave={handleSaveProperty}
                    userRole={currentUserRole || 'asesor'}
                />
            )}

            {selectedProperty && (
                <PropertyDetailModal
                    property={selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    onUpdate={handleUpdateProperty}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
                    <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-green-100 text-green-700' : 'bg-white border-red-100 text-red-700'}`}>
                        {toast.type === 'success' ? (
                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                    </div>
                </div>
            )}
            {/* Delete Confirm Modal (Inline replacement) */}
            {propertyToDelete && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPropertyToDelete(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-hidden animate-in zoom-in duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                        <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6 mx-auto">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">¿Eliminar Propiedad?</h3>
                        <p className="text-slate-500 text-center mb-8">
                            Estás a punto de eliminar <span className="font-semibold text-slate-700">"{propertyToDelete.title}"</span>. Esta acción es permanente y no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPropertyToDelete(null)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteProperty(propertyToDelete.id)}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Agent Form Modal */}
            <AgentFormModal
                isOpen={showAgentForm}
                onClose={() => { setShowAgentForm(false); setAgentAvatarUrl(''); }}
                onSave={fetchData}
                editingAgent={editingAgent}
                setToast={setToast}
            />
        </div>
    );
};

export default Admin;
