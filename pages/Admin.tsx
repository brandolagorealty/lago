import React, { useState, useEffect, useMemo } from 'react';
import PropertyForm from '../components/PropertyForm';
import { Property, Agent, PropertyStatus, PropertyNote, Lead, LeadStatus } from '../types';
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

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6 mx-auto">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">¿Eliminar Propiedad?</h3>
                <p className="text-slate-500 text-center mb-8">
                    Estás a punto de eliminar <span className="font-semibold text-slate-700">"{title}"</span>. Esta acción es permanente y no se puede deshacer.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
};

const Admin: React.FC = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'crm' | 'team'>('dashboard');
    const [properties, setProperties] = useState<Property[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
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

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [propsData, agentsData, leadsData] = await Promise.all([
                propertyService.getAdminProperties(),
                propertyService.getAgents(),
                propertyService.getLeads()
            ]);
            setProperties(propsData);
            setAgents(agentsData);
            setLeads(leadsData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setIsLoading(false);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleSaveProperty = async (property: Property, isPublished: boolean = true) => {
        const isEditing = !!properties.find(p => p.id === property.id);
        let result;

        if (isEditing) {
            // We pass is_published explicitly or keep it.
            // propertyService.updateProperty maps to DB
            result = await propertyService.updateProperty(property.id, property);
        } else {
            const { id, ...propertyData } = property;
            result = await propertyService.createProperty(propertyData, isPublished);
        }

        if (result.success) {
            await fetchData();
            setShowForm(false);
            setEditingProperty(null);
            setToast({ message: isEditing ? 'Propiedad actualizada' : 'Propiedad creada', type: 'success' });
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

    const handleSaveAgent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSavingAgent(true);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const agentData = {
            name: formData.get('name') as string,
            role: formData.get('role') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            avatar: (formData.get('avatar_url') as string) || (editingAgent?.avatar || '')
        };

        let result;
        if (editingAgent) {
            result = await propertyService.updateAgent(editingAgent.id, agentData);
        } else {
            result = await propertyService.createAgent(agentData);
        }

        if (result.success) {
            await fetchData();
            setShowAgentForm(false);
            setEditingAgent(null);
            setToast({ message: editingAgent ? 'Asesor actualizado' : 'Asesor agregado', type: 'success' });
        } else {
            alert('Error: ' + result.error);
        }
        setIsSavingAgent(false);
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setToast({ message: 'Subiendo foto...', type: 'success' });
        const url = await propertyService.uploadAgentAvatar(file);
        if (url) {
            const avatarInput = document.getElementById('agent-avatar-input') as HTMLInputElement;
            if (avatarInput) avatarInput.value = url;
            setToast({ message: 'Foto subida con éxito', type: 'success' });
        } else {
            setToast({ message: 'Error al subir foto', type: 'error' });
        }
    };

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesAgent = agentFilter ? p.agentIds?.includes(agentFilter) : true;
            const matchesStatus = statusFilter !== 'all' ? p.status === statusFilter : true;
            const matchesText = textFilter ?
                (p.title.toLowerCase().includes(textFilter.toLowerCase()) ||
                    p.location.toLowerCase().includes(textFilter.toLowerCase())) : true;

            return matchesAgent && matchesStatus && matchesText;
        });
    }, [properties, agentFilter, statusFilter, textFilter]);

    const statsByAgent = useMemo(() => {
        return agents.map(agent => {
            const agentProps = properties.filter(p => p.agentIds?.includes(agent.id));
            const totalValue = agentProps.reduce((sum, p) => sum + p.price, 0);
            const soldCount = agentProps.filter(p => p.status === 'sold' || p.status === 'rented').length;
            const availableCount = agentProps.filter(p => p.status === 'available').length;

            // Monthly sales simulation (for the chart)
            const monthlySales = Array.from({ length: 6 }, (_, i) => ({
                month: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][i],
                sales: Math.floor(Math.random() * (agentProps.length + 1))
            }));

            return {
                ...agent,
                totalProps: agentProps.length,
                totalValue,
                soldCount,
                availableCount,
                monthlySales
            };
        });
    }, [agents, properties]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

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

    const PerformanceChart = ({ data }: { data: { month: string, sales: number }[] }) => {
        const maxSales = Math.max(...data.map(d => d.sales), 1);
        return (
            <div className="flex items-end justify-between h-24 gap-1 mt-4">
                {data.map((d, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 group">
                        <div
                            className="w-full bg-brand-green/20 group-hover:bg-brand-green transition-all rounded-t-sm relative"
                            style={{ height: `${(d.sales / maxSales) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {d.sales} cierres
                            </div>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{d.month}</span>
                    </div>
                ))}
            </div>
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
                                        className="px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                                    >
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
        <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-500">
            <nav className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center sticky top-0 z-40">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                        setActiveTab('inventory');
                        setAgentFilter(null);
                        setSelectedProperty(null);
                    }}
                >
                    <img src="/assets/logo.png" alt="Lago Realty" className="h-14 w-auto object-contain" />
                    <div className="h-8 w-[1px] bg-slate-200"></div>
                    <span className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Panel de Control</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-brand-green translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white shadow-sm text-brand-green translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Inventario Global
                        </button>
                        <button
                            onClick={() => setActiveTab('crm')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'crm' ? 'bg-white shadow-sm text-brand-green translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            CRM Prospectos
                        </button>
                        <button
                            onClick={() => setActiveTab('team')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-white shadow-sm text-brand-green translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Equipo de Ventas
                        </button>
                    </div>
                    <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
                        <span className="text-sm text-slate-500 hidden md:inline font-medium">Conectado como: {user?.email}</span>
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Cerrar Sesión">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
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
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900">CRM Prospectos</h1>
                            <p className="text-slate-500">Gestión de oportunidades y embudo de ventas.</p>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Prospecto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Alojamiento de Interés</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estado (Pipeline)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {leads.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium italic">Sin prospectos registrados aún.</td></tr>
                                    ) : (
                                        leads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">{lead.name}</p>
                                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1">
                                                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap"><a href={`mailto:${lead.email}`} className="hover:text-brand-green">{lead.email}</a></span>
                                                        {lead.phone && <span className="text-xs text-slate-500 font-medium whitespace-nowrap"><a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-brand-green">{lead.phone}</a></span>}
                                                    </div>
                                                    <div className="mt-3 p-3 bg-slate-100 rounded-xl text-xs text-slate-600 italic">
                                                        "{lead.message}"
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {lead.property_id ? (
                                                        <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded inline-block">
                                                            {properties.find(p => p.id === lead.property_id)?.title || 'Propiedad ' + lead.property_id.slice(0, 6)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400">Interés General</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={lead.status}
                                                        onChange={async (e) => {
                                                            await propertyService.updateLeadStatus(lead.id, e.target.value);
                                                            fetchData();
                                                        }}
                                                        className="bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 uppercase focus:ring-2 focus:ring-brand-green/20 outline-none"
                                                    >
                                                        <option value="new">💡 Nuevo (Sin Contacto)</option>
                                                        <option value="contacted">📞 Contactado</option>
                                                        <option value="visiting">🏠 Agendando Visita</option>
                                                        <option value="negotiating">🤝 Negociando</option>
                                                        <option value="closed">🎉 Ganado (Cierre)</option>
                                                        <option value="lost">❌ Perdido</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-slate-900">Inventario Global</h1>
                                <p className="text-slate-500">Supervisión técnica de activos y asignaciones.</p>
                            </div>
                            <div className="flex gap-3">
                                {agentFilter && (
                                    <button
                                        onClick={() => setAgentFilter(null)}
                                        className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors"
                                    >
                                        Limpiar Filtro Agente
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-brand-green text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20"
                                >
                                    + Nueva Propiedad
                                </button>
                            </div>
                        </div>

                        {/* Inventory Filters */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar por título, ID o ubicación..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                    value={textFilter}
                                    onChange={(e) => setTextFilter(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-64">
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all uppercase"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | 'all')}
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="available">✨ Disponibles</option>
                                    <option value="reserved">⏳ Reservadas</option>
                                    <option value="sold">🎉 Vendidas</option>
                                    <option value="rented">🔑 Alquiladas</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Propiedad</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Estatus</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Precio</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Agente Asignado</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            Array(5).fill(0).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                                </tr>
                                            ))
                                        ) : filteredProperties.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron propiedades.</td>
                                            </tr>
                                        ) : filteredProperties.map(property => (
                                            <tr
                                                key={property.id}
                                                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                                onClick={() => setSelectedProperty(property)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <img src={property.image} className="w-12 h-12 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                            {!property.isPublished && (
                                                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg ring-2 ring-white uppercase">Borrador</div>
                                                            )}
                                                        </div>
                                                        <div className="max-w-[200px]">
                                                            <p className="font-bold text-slate-900 leading-tight truncate">{property.title}</p>
                                                            <p className="text-xs text-slate-400">{property.location}</p>
                                                            {property.agentNotes && property.agentNotes.length > 0 && (
                                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-brand-green font-bold">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                                    <span className="truncate max-w-[150px]">{property.agentNotes[0].text}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        className="bg-transparent border-none text-[10px] uppercase font-bold text-slate-500 focus:ring-0 cursor-pointer p-0 mb-1 block"
                                                        value={property.status}
                                                        onChange={(e) => updatePropertyStatus(property.id, e.target.value as PropertyStatus)}
                                                    >
                                                        <option value="available">Disponible</option>
                                                        <option value="reserved">Reservada</option>
                                                        <option value="sold">Vendida</option>
                                                        <option value="rented">Alquilada</option>
                                                    </select>
                                                    <StatusBadge status={property.status} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-700">{formatCurrency(property.price)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{property.listingType === 'sale' ? 'Venta' : 'Alquiler'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-3 overflow-hidden">
                                                            {property.agentIds && property.agentIds.length > 0 ? (
                                                                property.agentIds.slice(0, 3).map(id => {
                                                                    const agent = agents.find(a => a.id === id);
                                                                    return agent ? (
                                                                        <img
                                                                            key={id}
                                                                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                                                                            src={agent.avatar}
                                                                            title={agent.name}
                                                                        />
                                                                    ) : null;
                                                                })
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold ring-2 ring-white">?</div>
                                                            )}
                                                            {property.agentIds && property.agentIds.length > 3 && (
                                                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                                                                    +{property.agentIds.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500 ml-1">
                                                            {property.agentIds?.length || 0}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingProperty(property);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-brand-green transition-colors hover:bg-white rounded-full"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPropertyToDelete(property);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-600 transition-colors hover:bg-white rounded-full"
                                                            title="Eliminar"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-slate-900">Equipo de Ventas</h1>
                                <p className="text-slate-500">Gestión de asesores y rendimiento de cartera.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingAgent(null);
                                    setShowAgentForm(true);
                                }}
                                className="px-6 py-3 bg-brand-green text-white rounded-2xl font-bold shadow-lg shadow-brand-green/20 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                Agregar Asesor
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {statsByAgent.map(agent => (
                                <div key={agent.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative">
                                            <img src={agent.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 leading-tight">{agent.name}</h3>
                                                    <p className="text-xs text-brand-green font-bold uppercase tracking-wider">{agent.role}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAgent(agents.find(a => a.id === agent.id) || null);
                                                            setShowAgentForm(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                                        title="Editar Datos"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAgent(agent.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Eliminar Asesor"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Valor Cartera</p>
                                            <p className="font-bold text-slate-900 truncate">{formatCurrency(agent.totalValue)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Propiedades</p>
                                            <p className="font-bold text-slate-900">{agent.totalProps}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-2">
                                                <span className="text-slate-500 text-[10px] uppercase">Tasa de Cierre</span>
                                                <span className="text-brand-green">{agent.totalProps > 0 ? Math.round((agent.soldCount / agent.totalProps) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-green transition-all duration-1000 shadow-[0_0_10px_rgba(30,195,129,0.3)]"
                                                    style={{ width: `${agent.totalProps > 0 ? (agent.soldCount / agent.totalProps) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-50 pt-4">
                                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Ventas vs Tiempo</p>
                                            <PerformanceChart data={agent.monthlySales} />
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] font-bold bg-slate-50 p-3 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-slate-600">{agent.availableCount} Libres</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                <span className="text-slate-600">{agent.soldCount} Cerradas</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setAgentFilter(agent.id);
                                            setActiveTab('inventory');
                                        }}
                                        className="w-full mt-6 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-600 hover:bg-brand-green hover:text-white hover:border-brand-green transition-all active:scale-[0.98]"
                                    >
                                        Ver Cartera en Inventario
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {(showForm || editingProperty) && (
                <PropertyForm
                    initialData={editingProperty || undefined}
                    onClose={() => {
                        setShowForm(false);
                        setEditingProperty(null);
                    }}
                    onSave={handleSaveProperty}
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
            {propertyToDelete && (
                <DeleteConfirmModal
                    isOpen={!!propertyToDelete}
                    title={propertyToDelete.title}
                    onClose={() => setPropertyToDelete(null)}
                    onConfirm={() => handleDeleteProperty(propertyToDelete.id)}
                />
            )}

            {/* Agent Form Modal */}
            {showAgentForm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAgentForm(false)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-slate-900">{editingAgent ? 'Editar Asesor' : 'Agregar Asesor'}</h2>
                                <p className="text-slate-500 text-sm">Gestiona la información del miembro de tu equipo.</p>
                            </div>
                            <button onClick={() => setShowAgentForm(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
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
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">URL de Foto (Avatar)</label>
                                    <label className="text-xs font-bold text-brand-green hover:underline cursor-pointer uppercase tracking-widest">
                                        Subir Archivo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </label>
                                </div>
                                <input id="agent-avatar-input" name="avatar_url" defaultValue={editingAgent?.avatar} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20" />
                            </div>
                            <button disabled={isSavingAgent} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50">
                                {isSavingAgent ? 'Guardando...' : (editingAgent ? 'Guardar Cambios' : 'Registrar Asesor')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
