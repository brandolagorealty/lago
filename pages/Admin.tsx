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
        const success = await propertyService.updateProperty(id, { status });
        if (success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        }
    };

    const updatePropertyAgent = async (id: string, agentId: string) => {
        const success = await propertyService.updateProperty(id, { agent_id: agentId });
        if (success) {
            setProperties(prev => prev.map(p => p.id === id ? { ...p, agentId } : p));
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
                                {d.sales} ventas
                            </div>
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{d.month}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-500">
            <nav className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo.png" alt="Lago Realty" className="h-14 w-auto object-contain" />
                    <div className="h-8 w-[1px] bg-slate-200"></div>
                    <span className="text-lg font-bold text-slate-900">CRM Master</span>
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
                        <span className="text-sm text-slate-500 hidden md:inline">{user?.email}</span>
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
                                            <tr key={property.id} className="hover:bg-slate-50/80 transition-colors group">
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
        </div>
    );
};

export default Admin;
