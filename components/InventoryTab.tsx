import React, { useState, useMemo } from 'react';
import { Property, PropertyStatus, Agent } from '../types';
import { propertyService } from '../services/supabase';

interface InventoryTabProps {
    properties: Property[];
    agents: Agent[];
    currentUserRole: string | null;
    isLoading: boolean;
    agentFilter: string | null;
    onClearAgentFilter: () => void;
    onShowForm: () => void;
    onEditProperty: (property: Property) => void;
    onSelectProperty: (property: Property) => void;
    onDeleteProperty: (property: Property) => void;
    onPropertiesChange: (updater: (prev: Property[]) => Property[]) => void;
    setToast: (t: { message: string; type: 'success' | 'error' } | null) => void;
}

const PAGE_SIZE = 15;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

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

export default function InventoryTab({
    properties, agents, currentUserRole, isLoading, agentFilter,
    onClearAgentFilter, onShowForm, onEditProperty, onSelectProperty, onDeleteProperty,
    onPropertiesChange, setToast
}: InventoryTabProps) {
    const [textFilter, setTextFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(0);

    const filteredProperties = useMemo(() => {
        setCurrentPage(0); // Reset page on filter change
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

    const totalPages = Math.ceil(filteredProperties.length / PAGE_SIZE);
    const paginatedProperties = filteredProperties.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    const updatePropertyStatus = async (id: string, status: PropertyStatus) => {
        const result = await propertyService.updateProperty(id, { status });
        if (result.success) {
            onPropertiesChange(prev => prev.map(p => p.id === id ? { ...p, status } : p));
            setToast({ message: 'Estatus actualizado correctamente', type: 'success' });
        } else {
            setToast({ message: 'Error al actualizar el estatus', type: 'error' });
        }
    };

    const toggleFeatured = async (e: React.MouseEvent, property: Property) => {
        e.stopPropagation();
        const newFeatured = !property.featured;
        const result = await propertyService.updateProperty(property.id, { featured: newFeatured });
        if (result.success) {
            onPropertiesChange(prev => prev.map(p => p.id === property.id ? { ...p, featured: newFeatured } : p));
            setToast({ message: newFeatured ? 'Propiedad marcada como destacada' : 'Propiedad removida de destacadas', type: 'success' });
        }
    };

    const togglePublish = async (e: React.MouseEvent, property: Property) => {
        e.stopPropagation();
        const newPublished = !property.isPublished;
        const result = await propertyService.updateProperty(property.id, { isPublished: newPublished });
        if (result.success) {
            onPropertiesChange(prev => prev.map(p => p.id === property.id ? { ...p, isPublished: newPublished } : p));
            setToast({ message: newPublished ? 'Propiedad publicada' : 'Movida a borradores', type: 'success' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900">Inventario Global</h1>
                    <p className="text-slate-500">Supervisión técnica de activos y asignaciones.</p>
                </div>
                <div className="flex gap-3">
                    {agentFilter && (
                        <button onClick={onClearAgentFilter} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors">
                            Limpiar Filtro Agente
                        </button>
                    )}
                    <button onClick={onShowForm} className="bg-brand-green text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-green/90 transition-all shadow-lg shadow-brand-green/20">
                        + Nueva Propiedad
                    </button>
                </div>
            </div>

            {/* Filters */}
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
                        <option value="draft">📝 Borradores</option>
                        <option value="available">✨ Disponibles</option>
                        <option value="reserved">⏳ Reservadas</option>
                        <option value="sold">🎉 Vendidas</option>
                        <option value="rented">🔑 Alquiladas</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Propiedad</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Destacar</th>
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
                                        <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : paginatedProperties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No se encontraron propiedades.</td>
                                </tr>
                            ) : paginatedProperties.map(property => (
                                <tr
                                    key={property.id}
                                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                    onClick={() => onSelectProperty(property)}
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
                                                <p
                                                    className="font-bold text-slate-900 leading-tight truncate hover:text-brand-green hover:underline cursor-pointer transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                                                    title="Clic para editar"
                                                >{property.title}</p>
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
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={(e) => toggleFeatured(e, property)}
                                            className={`p-2 rounded-full transition-all active:scale-90 ${property.featured ? 'text-amber-400 bg-amber-50 shadow-inner' : 'text-slate-200 hover:text-amber-300 hover:bg-slate-50'}`}
                                            title={property.featured ? 'Remover de destacadas' : 'Marcar como destacada'}
                                        >
                                            <svg className={`w-6 h-6 ${property.featured ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            className="bg-transparent border-none text-[10px] uppercase font-bold text-slate-500 focus:ring-0 cursor-pointer p-0 mb-1 block"
                                            value={property.status}
                                            onClick={(e) => e.stopPropagation()}
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
                                                            <img key={id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src={agent.avatar} title={agent.name} />
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
                                                onClick={(e) => togglePublish(e, property)}
                                                className={`p-2 transition-colors hover:bg-white rounded-full ${property.isPublished ? 'text-slate-400 hover:text-amber-500' : 'text-amber-500 hover:text-brand-green'}`}
                                                title={property.isPublished ? 'Mover a Borradores' : 'Publicar'}
                                            >
                                                {property.isPublished ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditProperty(property); }}
                                                className="p-2 text-slate-400 hover:text-brand-green transition-colors hover:bg-white rounded-full"
                                                title="Editar"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            {currentUserRole === 'superadmin' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDeleteProperty(property); }}
                                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors hover:bg-white rounded-full"
                                                    title="Eliminar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-sm text-slate-500 font-medium">
                            Mostrando {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filteredProperties.length)} de <strong>{filteredProperties.length}</strong> propiedades
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                ← Anterior
                            </button>
                            <span className="text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
