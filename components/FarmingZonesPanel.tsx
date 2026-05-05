import React, { useState } from 'react';
import { Trash2, Target, Edit2, Check, X, Compass } from 'lucide-react';
import { propertyService } from '../services/supabase';
import { ZonaFarming, UserRole } from '../types';

interface Props {
  zonas: ZonaFarming[];
  userRoles: UserRole[];
  isAdmin: boolean;
  onRefresh: () => void;
  onSelectZona: (z: ZonaFarming | null) => void;
  selectedZona: ZonaFarming | null;
  onNavigate?: (z: ZonaFarming) => void;
  isNavigating?: boolean;
  navTarget?: ZonaFarming | null;
}

export default function FarmingZonesPanel({ zonas, userRoles, isAdmin, onRefresh, onSelectZona, selectedZona, onNavigate, isNavigating, navTarget }: Props) {
  const [renameZoneId, setRenameZoneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    setIsSaving(true);
    await propertyService.updateZonaFarming(id, { nombre: renameValue });
    setIsSaving(false);
    setRenameZoneId(null);
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
          <Target className="w-5 h-5 text-emerald-600" /> Zonas Asignadas
        </h3>
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

      {isAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-emerald-800">¿Quieres agregar una zona?</p>
          <p className="text-xs text-emerald-600 mt-1">Haz clic en cualquier cuadrante vacío directamente en el mapa.</p>
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
                  {renameZoneId === z.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="w-full text-sm font-bold text-slate-900 border-b border-emerald-500 outline-none bg-transparent" autoFocus />
                      <button onClick={() => handleRename(z.id)} disabled={isSaving} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setRenameZoneId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate">{z.nombre}</p>
                      {isAdmin && <button onClick={(e) => { e.stopPropagation(); setRenameValue(z.nombre); setRenameZoneId(z.id); }} className="text-slate-300 hover:text-emerald-600"><Edit2 className="w-3 h-3" /></button>}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">{z.asignado_email?.split('@')[0] || 'Sin asignar'} · {z.km_recorridos.toFixed(1)}/{z.meta_km} km</p>
                </div>
                <span className="text-xs font-bold" style={{ color: pct >= 75 ? '#10b981' : pct >= 25 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                {!isAdmin && onNavigate && (
                  <button onClick={e => { e.stopPropagation(); onNavigate(z); }} disabled={isNavigating && navTarget?.id !== z.id}
                    className={`p-1.5 rounded-xl transition-all ${isNavigating && navTarget?.id === z.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                    title={isNavigating && navTarget?.id === z.id ? 'Navegando...' : 'Navegar a esta zona'}>
                    <Compass className="w-4 h-4" />
                  </button>
                )}
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
