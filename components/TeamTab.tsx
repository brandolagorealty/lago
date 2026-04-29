import React, { useMemo } from 'react';
import { Agent, Property } from '../types';

interface TeamTabProps {
    agents: Agent[];
    properties: Property[];
    onEditAgent: (agent: Agent) => void;
    onDeleteAgent: (id: string) => void;
    onShowAgentForm: () => void;
    onFilterByAgent: (agentId: string) => void;
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const PerformanceChart = ({ data }: { data: { month: string, sales: number }[] }) => {
    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const maxSales = Math.max(...data.map(d => d.sales), 1);
    
    if (totalSales === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-24 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin cierres recientes</p>
            </div>
        );
    }

    return (
        <div className="flex items-end justify-between h-24 gap-1 mt-4">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group">
                    <div
                        className="w-full bg-brand-green/20 group-hover:bg-brand-green transition-all rounded-t-sm relative"
                        style={{ height: `${(d.sales / maxSales) * 100}%` }}
                    >
                        {d.sales > 0 && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {d.sales} cierres
                            </div>
                        )}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{d.month}</span>
                </div>
            ))}
        </div>
    );
};

export default function TeamTab({ agents, properties, onEditAgent, onDeleteAgent, onShowAgentForm, onFilterByAgent }: TeamTabProps) {
    const statsByAgent = useMemo(() => {
        const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        
        return agents.map(agent => {
            const agentProps = properties.filter(p => p.agentIds?.includes(agent.id));
            const totalValue = agentProps.reduce((sum, p) => sum + p.price, 0);
            const soldCount = agentProps.filter(p => p.status === 'sold' || p.status === 'rented').length;
            const availableCount = agentProps.filter(p => p.status === 'available').length;

            // Identificar si el rol es de ventas (Asesor, Broker, Agente)
            const roleLower = (agent.role || '').toLowerCase();
            const isSeller = roleLower.includes('asesor') || 
                             roleLower.includes('vendedor') || 
                             roleLower.includes('agente') || 
                             roleLower.includes('broker') ||
                             roleLower.includes('realtor');

            // Calcular ventas reales de los últimos 6 meses
            const monthlySales = [];
            for (let i = 5; i >= 0; i--) {
                const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthIndex = monthDate.getMonth();
                const year = monthDate.getFullYear();
                
                const salesInMonth = agentProps.filter(p => {
                    if (p.status !== 'sold' && p.status !== 'rented') return false;
                    if (!p.updatedAt) return false;
                    const updateDate = new Date(p.updatedAt);
                    return updateDate.getMonth() === monthIndex && updateDate.getFullYear() === year;
                }).length;

                monthlySales.push({ month: monthsShort[monthIndex], sales: salesInMonth });
            }

            return { 
                ...agent, 
                totalProps: agentProps.length, 
                totalValue, 
                soldCount, 
                availableCount, 
                monthlySales,
                isSeller
            };
        });
    }, [agents, properties]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900">Equipo de Ventas</h1>
                    <p className="text-slate-500">Gestión de asesores y rendimiento de cartera.</p>
                </div>
                <button
                    onClick={onShowAgentForm}
                    className="px-6 py-3 bg-brand-green text-white rounded-2xl font-bold shadow-lg shadow-brand-green/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Agregar Miembro
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
                                            onClick={() => onEditAgent(agent)}
                                            className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                            title="Editar Datos"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => onDeleteAgent(agent.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar Miembro"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {agent.isSeller ? (
                            <>
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
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Ventas vs Tiempo (6 meses)</p>
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
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 bg-slate-200/50 rounded-full flex items-center justify-center mb-3 text-slate-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Perfil Operativo</p>
                                <p className="text-[10px] text-slate-400 text-center">Este miembro no tiene métricas comerciales asignadas.</p>
                            </div>
                        )}

                        <button
                            onClick={() => onFilterByAgent(agent.id)}
                            className="w-full mt-6 py-3 rounded-xl border border-slate-100 text-sm font-bold text-slate-600 hover:bg-brand-green hover:text-white hover:border-brand-green transition-all active:scale-[0.98]"
                        >
                            Ver Cartera / Actividad
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
