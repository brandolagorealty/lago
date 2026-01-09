import React, { useState, useEffect, useMemo } from 'react';
import PropertyForm from '../components/PropertyForm';
import { Property, Agent, PropertyStatus } from '../types';
import { propertyService } from '../services/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const Admin: React.FC = () => {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'inventory' | 'team'>('inventory');
    const [properties, setProperties] = useState<Property[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [agentFilter, setAgentFilter] = useState<string | null>(null);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
            const [propsData, agentsData] = await Promise.all([
                propertyService.getAdminProperties(),
                propertyService.getAgents()
            ]);
            setProperties(propsData);
            setAgents(agentsData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }
        setIsLoading(false);
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleSaveProperty = async (property: Property) => {
        const { id, ...propertyData } = property;
        const result = await propertyService.createProperty(propertyData, true);
        if (result.success) {
            await fetchData();
            setShowForm(false);
        } else {
            alert('Error: ' + result.error?.message);
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
        const result = await propertyService.updateProperty(id, { agent_id: agentId });
        if (result.success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, agentId } : p));
            setToast({ message: 'Agente asignado correctamente', type: 'success' });
        } else {
            setToast({ message: 'Error al asignar el agente', type: 'error' });
        }
    };

    const handleUpdateProperty = async (id: string, updates: Partial<Property>) => {
        // Convert camelCase to snake_case for Supabase
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.agentId !== undefined) dbUpdates.agent_id = updates.agentId || null;
        if (updates.agentNotes !== undefined) dbUpdates.agent_notes = updates.agentNotes;
        if (updates.price) dbUpdates.price = updates.price;

        const result = await propertyService.updateProperty(id, dbUpdates);
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

    const filteredProperties = useMemo(() => {
        if (!agentFilter) return properties;
        return properties.filter(p => p.agentId === agentFilter);
    }, [properties, agentFilter]);

    const statsByAgent = useMemo(() => {
        return agents.map(agent => {
            const agentProps = properties.filter(p => p.agentId === agent.id);
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
        const [notes, setNotes] = useState(property.agentNotes || '');
        const [isSaving, setIsSaving] = useState(false);

        const handleSaveNotes = async () => {
            setIsSaving(true);
            await onUpdate(property.id, { agentNotes: notes });
            setIsSaving(false);
        };

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="relative h-48 md:h-64">
                        <img src={property.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="absolute bottom-6 left-6 right-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{property.title}</h2>
                                    <p className="text-white/80 text-sm flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {property.location}
                                    </p>
                                </div>
                                <StatusBadge status={property.status} />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Gestión Operativa</h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Cambiar Estatus</label>
                                        <select
                                            value={property.status}
                                            onChange={(e) => onUpdate(property.id, { status: e.target.value as PropertyStatus })}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        >
                                            <option value="available">Disponible</option>
                                            <option value="reserved">Reservada</option>
                                            <option value="sold">Vendida</option>
                                            <option value="rented">Alquilada</option>
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Reasignar Agente</label>
                                        <select
                                            value={property.agentId || ''}
                                            onChange={(e) => onUpdate(property.id, { agentId: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        >
                                            <option value="">Sin Asignar</option>
                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Precio</p>
                                    <p className="text-sm font-bold text-slate-900">{formatCurrency(property.price)}</p>
                                </div>
                                <div className="text-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">M2</p>
                                    <p className="text-sm font-bold text-slate-900">{property.sqft}</p>
                                </div>
                                <div className="text-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Hab/Baños</p>
                                    <p className="text-sm font-bold text-slate-900">{property.beds} / {property.baths}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                Notas de Seguimiento
                                {property.agentNotes !== notes && (
                                    <span className="text-[10px] text-brand-green animate-pulse">Sin guardar</span>
                                )}
                            </h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Escribe aquí las observaciones internas sobre esta propiedad..."
                                className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-brand-green/10 focus:border-brand-green/30 transition-all resize-none"
                            ></textarea>
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSaving || property.agentNotes === notes}
                                className="w-full py-3 bg-brand-green text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Observaciones'}
                            </button>
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
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white shadow-sm text-brand-green translate-y-[-1px]' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Inventario Global
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
                {activeTab === 'inventory' ? (
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
                                        Limpiar Filtro
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
                                                        <img src={property.image} className="w-12 h-12 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                        <div className="max-w-[200px]">
                                                            <p className="font-bold text-slate-900 leading-tight truncate">{property.title}</p>
                                                            <p className="text-xs text-slate-400">{property.location}</p>
                                                            {property.agentNotes && (
                                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-brand-green font-bold">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                                    <span className="truncate max-w-[150px]">{property.agentNotes}</span>
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
                                                        {property.agentId ? (
                                                            <div
                                                                className="flex items-center gap-2 group/agent cursor-pointer"
                                                                onClick={() => setAgentFilter(property.agentId!)}
                                                            >
                                                                <img
                                                                    src={agents.find(a => a.id === property.agentId)?.avatar}
                                                                    className="w-8 h-8 rounded-full border border-white shadow-sm transition-transform group-hover/agent:scale-110"
                                                                />
                                                                <select
                                                                    className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer p-0"
                                                                    value={property.agentId}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => updatePropertyAgent(property.id, e.target.value)}
                                                                >
                                                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <select
                                                                className="bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg px-2 py-1 outline-none border-none focus:ring-0"
                                                                onChange={(e) => updatePropertyAgent(property.id, e.target.value)}
                                                            >
                                                                <option value="">Sin Asignar</option>
                                                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 text-slate-400 hover:text-brand-green transition-colors hover:bg-white rounded-full">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900">Equipo de Ventas</h1>
                            <p className="text-slate-500">Métricas de rendimiento y salud de la cartera por agente.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {statsByAgent.map(agent => (
                                <div key={agent.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative">
                                            <img src={agent.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{agent.name}</h3>
                                            <p className="text-xs text-brand-green font-bold uppercase tracking-wider">{agent.role}</p>
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

            {showForm && (
                <PropertyForm
                    onClose={() => setShowForm(false)}
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
        </div>
    );
};

export default Admin;
