import React, { useState } from 'react';
import { Trash2, Target, Plus, ChevronDown } from 'lucide-react';
import { propertyService } from '../services/supabase';
import { ZonaFarming, UserRole } from '../types';
import { MARACAIBO_ZONES } from '../constants/maracaiboZones';

interface Props {
  zonas: ZonaFarming[];
  userRoles: UserRole[];
  isAdmin: boolean;
  onRefresh: () => void;
  onSelectZona: (z: ZonaFarming | null) => void;
  selectedZona: ZonaFarming | null;
}

export default function FarmingZonesPanel({ zonas, userRoles, isAdmin, onRefresh, onSelectZona, selectedZona }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedAsesor, setSelectedAsesor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter out sectors already added as zones
  const usedNames = zonas.map(z => z.nombre);
  const availableSectors = MARACAIBO_ZONES.filter(z => !usedNames.includes(z.nombre));

  const handleAdd = async () => {
    if (!selectedSector || !selectedAsesor) return;
    const sector = MARACAIBO_ZONES.find(z => z.nombre === selectedSector);
    if (!sector) return;
    const asesor = userRoles.find(r => r.user_id === selectedAsesor);

    setIsSaving(true);
    await propertyService.createZonaFarming({
      nombre: sector.nombre,
      poligono: sector.poligono,
      color: sector.color,
      meta_km: sector.meta_km,
      asignado_a: selectedAsesor,
      asignado_email: asesor?.email || '',
      estado: 'pendiente',
      km_recorridos: 0
    });
    setIsSaving(false);
    setSelectedSector('');
    setSelectedAsesor('');
    setShowForm(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta zona?')) return;
    await propertyService.deleteZonaFarming(id);
    onRefresh();
  };

  const getProgress = (z: ZonaFarming) => z.meta_km <= 0 ? 0 : Math.min(100, Math.round((z.km_recorridos / z.meta_km) * 100));
  const getBarColor = (pct: number) => pct >= 75 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-400';

  const totalMeta = zonas.reduce((s, z) => s + z.meta_km, 0);
  const totalRec = zonas.reduce((s, z) => s + z.km_recorridos, 0);
  const globalPct = totalMeta > 0 ? Math.round((totalRec / totalMeta) * 100) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" /> Zonas
        </h3>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            {showForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Agregar</>}
          </button>
        )}
      </div>

      {/* Global progress */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Cobertura Global</span><span>{globalPct}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${getBarColor(globalPct)}`} style={{ width: `${globalPct}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{totalRec.toFixed(1)} / {totalMeta.toFixed(1)} km · {zonas.length} zonas</p>
      </div>

      {/* Simple add form: just select sector + asesor */}
      {showForm && isAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-700 mb-1">Selecciona un sector y asigna un asesor:</p>
          <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none appearance-none font-medium">
            <option value="">📍 Seleccionar sector...</option>
            {availableSectors.map(s => <option key={s.nombre} value={s.nombre}>{s.nombre} (~{s.meta_km} km)</option>)}
          </select>
          <select value={selectedAsesor} onChange={e => setSelectedAsesor(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none appearance-none font-medium">
            <option value="">👤 Asignar a un asesor...</option>
            {userRoles.map(r => <option key={r.user_id} value={r.user_id}>{r.email}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!selectedSector || !selectedAsesor || isSaving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
            {isSaving ? 'Guardando...' : '✅ Agregar Zona al Mapa'}
          </button>
        </div>
      )}

      {/* Zone list */}
      <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar">
        {zonas.length === 0 && <p className="text-sm text-slate-400 italic text-center py-6">No hay zonas asignadas aún. {isAdmin ? 'Presiona "+ Agregar" para comenzar.' : ''}</p>}
        {zonas.map(z => {
          const pct = getProgress(z);
          return (
            <div key={z.id} onClick={() => onSelectZona(selectedZona?.id === z.id ? null : z)}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${selectedZona?.id === z.id ? 'border-emerald-400 bg-emerald-50 shadow' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: z.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{z.nombre}</p>
                  <p className="text-[10px] text-slate-500">{z.asignado_email?.split('@')[0] || 'Sin asignar'} · {z.km_recorridos.toFixed(1)}/{z.meta_km} km</p>
                </div>
                <span className="text-xs font-bold" style={{ color: pct >= 75 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                {isAdmin && <button onClick={e => { e.stopPropagation(); handleDelete(z.id); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
