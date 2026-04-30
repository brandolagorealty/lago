import React, { useState, useEffect } from 'react';
import { MapPin, Trash2, Users, Target, Plus, X } from 'lucide-react';
import { propertyService } from '../services/supabase';
import { ZonaFarming, UserRole } from '../types';

interface Props {
  zonas: ZonaFarming[];
  recorridos: any[];
  userRoles: UserRole[];
  isAdmin: boolean;
  onRefresh: () => void;
  onSelectZona: (z: ZonaFarming | null) => void;
  selectedZona: ZonaFarming | null;
}

export default function FarmingZonesPanel({ zonas, recorridos, userRoles, isAdmin, onRefresh, onSelectZona, selectedZona }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', asignado_a: '', asignado_email: '', meta_km: 25, color: '#10b981' });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (poligono: any[]) => {
    if (!form.nombre) return;
    setIsSaving(true);
    await propertyService.createZonaFarming({ ...form, poligono, estado: 'pendiente', km_recorridos: 0 });
    setIsSaving(false);
    setShowForm(false);
    setForm({ nombre: '', asignado_a: '', asignado_email: '', meta_km: 25, color: '#10b981' });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    await propertyService.deleteZonaFarming(id);
    onRefresh();
  };

  const getProgress = (z: ZonaFarming) => {
    if (z.meta_km <= 0) return 0;
    return Math.min(100, Math.round((z.km_recorridos / z.meta_km) * 100));
  };

  const getColor = (pct: number) => pct >= 75 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-500';

  const totalMeta = zonas.reduce((s, z) => s + z.meta_km, 0);
  const totalRecorrido = zonas.reduce((s, z) => s + z.km_recorridos, 0);
  const globalPct = totalMeta > 0 ? Math.round((totalRecorrido / totalMeta) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" /> Panel de Zonas
        </h3>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Crear Zona
          </button>
        )}
      </div>

      {/* Global progress */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Cobertura Global</span>
          <span>{globalPct}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${getColor(globalPct)}`} style={{ width: `${globalPct}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{totalRecorrido.toFixed(1)} / {totalMeta.toFixed(1)} km cubiertos</p>
      </div>

      {/* Create zone form */}
      {showForm && isAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700">1. Llena los datos, luego dibuja el polígono en el mapa haciendo clic en los vértices.</p>
          <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre de la zona (Ej: La Lago)" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
          <select value={form.asignado_a} onChange={e => { const u = userRoles.find(r => r.user_id === e.target.value); setForm({...form, asignado_a: e.target.value, asignado_email: u?.email || ''}); }} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="">Asignar a un asesor...</option>
            {userRoles.map(r => <option key={r.user_id} value={r.user_id}>{r.email}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" value={form.meta_km} onChange={e => setForm({...form, meta_km: Number(e.target.value)})} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
            <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer" />
          </div>
          <p className="text-xs text-emerald-600 font-medium">Ahora haz clic en el mapa para dibujar los vértices del polígono. Doble clic para terminar.</p>
        </div>
      )}

      {/* Zone list */}
      <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
        {zonas.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No hay zonas creadas.</p>}
        {zonas.map(z => {
          const pct = getProgress(z);
          return (
            <div key={z.id} onClick={() => onSelectZona(selectedZona?.id === z.id ? null : z)}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${selectedZona?.id === z.id ? 'border-emerald-400 bg-emerald-50 shadow' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: z.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{z.nombre}</p>
                  <p className="text-[10px] text-slate-500">{z.asignado_email || 'Sin asignar'} · {pct}%</p>
                </div>
                {isAdmin && <button onClick={e => { e.stopPropagation(); handleDelete(z.id); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${getColor(pct)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export the save handler for the parent to call when polygon drawing is complete
export { type Props as FarmingZonesPanelProps };
