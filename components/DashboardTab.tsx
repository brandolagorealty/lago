import React from 'react';
import { Property, Lead } from '../types';

interface DashboardTabProps {
    properties: Property[];
    leads: Lead[];
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export default function DashboardTab({ properties, leads }: DashboardTabProps) {
    return (
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
    );
}
