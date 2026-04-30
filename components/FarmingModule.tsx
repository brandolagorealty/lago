import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Play, Square, Plus, X, Phone, FileText, Trash2, Navigation, Clock, Route, Flame, Target, Star, ChevronDown, ChevronRight, ClipboardList, BookOpen, Users } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { propertyService } from '../services/supabase';
import { Recorrido, Captacion, ZonaFarming, UserRole, ReporteInteligencia, RangoRapido, NivelActividad, NivelReceptividad } from '../types';
import FarmingZonesPanel from './FarmingZonesPanel';
import { useAuth } from '../auth/AuthProvider';
import { generateMaracaiboGrid, GridCell } from '../constants/maracaiboZones';
import { SECTORS_DATA } from '../constants/sectorsData';

// Load Leaflet CSS from CDN
if (!document.querySelector('link[href*="leaflet"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  document.head.appendChild(link);
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MARACAIBO_CENTER: [number, number] = [10.6666, -71.6124];
const MIN_DISTANCE_METERS = 15;

const captacionIcon = new L.DivIcon({
  className: '',
  html: `<div style="background:#10b981;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

function haversineDistance(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function formatDistance(m: number): string {
  return m >= 1000 ? (m/1000).toFixed(1) + ' km' : Math.round(m) + ' m';
}

function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, map.getZoom()); }, [position]);
  return null;
}

// Heatmap layer component
function HeatmapLayer({ points }: { points: [number, number][] }) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  useEffect(() => {
    if (points.length === 0) return;
    try {
      const heat = (L as any).heatLayer(points.map(p => [...p, 0.6]), { radius: 18, blur: 20, maxZoom: 17, gradient: { 0.2: '#3b82f6', 0.4: '#06b6d4', 0.6: '#fbbf24', 0.8: '#f97316', 1: '#ef4444' } });
      heat.addTo(map);
      layerRef.current = heat;
    } catch(e) { console.warn('Heatmap not available'); }
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [points, map]);
  return null;
}



interface FarmingProps {
  currentUserRole: 'superadmin' | 'asesor' | null;
  userRoles: UserRole[];
}

export default function FarmingModule({ currentUserRole, userRoles }: FarmingProps) {
  const isAdmin = currentUserRole === 'superadmin';
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Route tracking
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{lat:number;lng:number}[]>([]);
  const [activeRecorridoId, setActiveRecorridoId] = useState<string|null>(null);
  const [userPosition, setUserPosition] = useState<[number,number]|null>(null);
  const [gpsError, setGpsError] = useState<string|null>(null);
  const watchIdRef = useRef<number|null>(null);
  const [zoneName, setZoneName] = useState('');

  // Data
  const [recorridos, setRecorridos] = useState<Recorrido[]>([]);
  const [captaciones, setCaptaciones] = useState<Captacion[]>([]);
  const [zonas, setZonas] = useState<ZonaFarming[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // UI state
  const [showCapture, setShowCapture] = useState(false);
  const [captureForm, setCaptureForm] = useState({ tipo_inmueble: 'Casa', estatus: 'Se Vende', telefono_contacto: '', notas: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedZona, setSelectedZona] = useState<ZonaFarming|null>(null);
  const [pendingGridCell, setPendingGridCell] = useState<GridCell | null>(null);
  const [assignForm, setAssignForm] = useState({ municipio: '', parroquia: '', sector: '', asignado_a: '', asignado_email: '' });

  // Intelligence Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const defaultReport: ReporteInteligencia = { carteles_duenos: '0', carteles_competencia: '0', inmuebles_abandonados: '0', contactos_clave: '0', tarjetas_entregadas: '0', actividad_construccion: 'Nula', receptividad: 'Indiferente', potencial_captacion: 3, notas: '' };
  const [reportForm, setReportForm] = useState<ReporteInteligencia>({ ...defaultReport });

  // Bitácora state
  const [showBitacora, setShowBitacora] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [bitacoraFilter, setBitacoraFilter] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [recs, caps, zns] = await Promise.all([
      propertyService.getRecorridos(), propertyService.getCaptaciones(), propertyService.getZonasFarming()
    ]);
    setRecorridos(recs); setCaptaciones(caps); setZonas(zns);
    setIsLoading(false);
  };

  const currentDistance = routeCoords.reduce((sum, c, i) => i === 0 ? 0 : sum + haversineDistance(routeCoords[i-1], c), 0);

  // GPS tracking
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) { setGpsError('Tu navegador no soporta GPS.'); return; }
    setGpsError(null); setIsSaving(true);
    const result = await propertyService.createRecorrido({ zona_nombre: zoneName || 'Sin nombre' });
    if (!result.success) { setGpsError('Error: ' + result.error); setIsSaving(false); return; }
    setActiveRecorridoId(result.data.id); setRouteCoords([]); setIsSaving(false); setIsTracking(true);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const nc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPosition([nc.lat, nc.lng]);
        setRouteCoords(prev => {
          if (prev.length === 0) return [nc];
          if (haversineDistance(prev[prev.length-1], nc) < MIN_DISTANCE_METERS) return prev;
          return [...prev, nc];
        });
      },
      (err) => { setGpsError(err.code === 1 ? 'Permiso de GPS denegado.' : 'Error GPS: ' + err.message); },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    watchIdRef.current = id;
  }, [zoneName]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setIsTracking(false);
    if (activeRecorridoId && routeCoords.length > 0) {
      // Open the intelligence report modal instead of saving immediately
      setReportForm({ ...defaultReport });
      setShowReportModal(true);
    }
  }, [activeRecorridoId, routeCoords, currentDistance]);

  const submitReport = async () => {
    if (!activeRecorridoId) return;
    setIsSaving(true);
    await propertyService.finishRecorrido(activeRecorridoId, routeCoords, currentDistance, reportForm);
    setIsSaving(false);
    setShowReportModal(false);
    setActiveRecorridoId(null); setRouteCoords([]); setZoneName('');
    loadData();
  };

  const saveCaptacion = async () => {
    if (!userPosition) { setGpsError('No se pudo obtener ubicación GPS.'); return; }
    setIsSaving(true);
    await propertyService.createCaptacion({ recorrido_id: activeRecorridoId, latitud: userPosition[0], longitud: userPosition[1], ...captureForm });
    setIsSaving(false); setShowCapture(false);
    setCaptureForm({ tipo_inmueble: 'Casa', estatus: 'Se Vende', telefono_contacto: '', notas: '' });
    loadData();
  };

  const handleDeleteRecorrido = async (id: string) => {
    if (!confirm('¿Eliminar recorrido?')) return;
    await propertyService.deleteRecorrido(id); loadData();
  };



  // Heatmap points from all recorridos
  const heatPoints: [number,number][] = recorridos.flatMap(r => (r.coordenadas_ruta || []).map((c: any) => [c.lat, c.lng] as [number,number]));

  const todayRecs = recorridos.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString());
  const totalDist = recorridos.reduce((s, r) => s + (r.distancia_metros || 0), 0);

  // Zone color based on progress
  const getZoneOpacity = (z: ZonaFarming) => {
    const pct = z.meta_km > 0 ? (z.km_recorridos / z.meta_km) * 100 : 0;
    return pct >= 75 ? 0.15 : pct >= 25 ? 0.25 : 0.35;
  };

  // Filter: asesores only see their own zones, superadmin sees all
  const visibleZonas = isAdmin ? zonas : zonas.filter(z => z.asignado_a === currentUserId);

  // Generate and filter grid cells
  const baseGrid = React.useMemo(() => generateMaracaiboGrid(), []);
  const availableGrid = baseGrid.filter(cell => {
    if (!cell.poligono || cell.poligono.length === 0) return false;
    return !zonas.some(z => 
      z.poligono && z.poligono.length > 0 &&
      Math.abs(z.poligono[0].lat - cell.poligono[0].lat) < 0.001 &&
      Math.abs(z.poligono[0].lng - cell.poligono[0].lng) < 0.001
    );
  });

  const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#ef4444', '#64748b', '#0ea5e9'];

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
            <Navigation className="w-8 h-8 text-emerald-600" /> Farming Inmobiliario
          </h2>
          <p className="text-slate-500 mt-1">Peinado de zonas con GPS · Maracaibo y San Francisco</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center">
            <p className="text-2xl font-black text-emerald-700">{todayRecs.length}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Hoy</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl text-center">
            <p className="text-2xl font-black text-blue-700">{captaciones.length}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase">Captaciones</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 px-4 py-2 rounded-2xl text-center">
            <p className="text-2xl font-black text-purple-700">{formatDistance(totalDist)}</p>
            <p className="text-[10px] font-bold text-purple-500 uppercase">Total</p>
          </div>
        </div>
      </div>

      {gpsError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2"><MapPin className="w-5 h-5" /> {gpsError}</div>}



      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map Column */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {!isTracking && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input type="text" value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Nombre de la zona a recorrer..." className="flex-1 bg-transparent text-sm outline-none" />
            </div>
          )}
          {isTracking && (
            <div className="px-4 py-3 border-b border-emerald-200 bg-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" /><span className="text-sm font-bold text-emerald-800">Recorriendo: {zoneName || 'Sin nombre'}</span></div>
              <div className="flex gap-4 text-xs font-bold text-emerald-600"><span>{routeCoords.length} pts</span><span>{formatDistance(currentDistance)}</span></div>
            </div>
          )}

          <div style={{ height: '55vh', minHeight: 350 }}>
            <MapContainer center={MARACAIBO_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterMap position={isTracking ? userPosition : null} />
              
              {showHeatmap && <HeatmapLayer points={heatPoints} />}

              {/* Available Grid Cells */}
              {isAdmin && availableGrid.map(cell => (
                <Polygon key={cell.id} positions={cell.poligono.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5 5', fillOpacity: 0.1 }}
                  eventHandlers={{
                    click: () => {
                      setPendingGridCell(cell);
                      setAssignForm({ municipio: '', parroquia: '', sector: '', asignado_a: '', asignado_email: '' });
                    }
                  }}>
                  <Popup><div className="text-xs font-bold text-slate-500">Haz clic para asignar esta zona</div></Popup>
                </Polygon>
              ))}

              {/* Zones as polygons */}
              {visibleZonas.map(z => z.poligono && z.poligono.length >= 3 && (
                <Polygon key={z.id} positions={z.poligono.map(p => [p.lat, p.lng] as [number,number])}
                  pathOptions={{ color: z.color, fillColor: z.color, fillOpacity: getZoneOpacity(z), weight: selectedZona?.id === z.id ? 3 : 1 }}>
                  <Popup><div className="text-xs"><p className="font-bold">{z.nombre}</p><p>{z.asignado_email || 'Sin asignar'}</p><p>{z.meta_km > 0 ? Math.round((z.km_recorridos/z.meta_km)*100) : 0}% cubierto</p></div></Popup>
                </Polygon>
              ))}

              {/* Past routes */}
              {recorridos.map(r => r.coordenadas_ruta && r.coordenadas_ruta.length > 1 && (
                <Polyline key={r.id} positions={r.coordenadas_ruta.map((c: any) => [c.lat, c.lng] as [number,number])} pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '8 6' }} />
              ))}

              {/* Active route */}
              {routeCoords.length > 1 && <Polyline positions={routeCoords.map(c => [c.lat, c.lng] as [number,number])} pathOptions={{ color: '#10b981', weight: 5, opacity: 0.9 }} />}

              {/* User position */}
              {userPosition && isTracking && <Marker position={userPosition} icon={new L.DivIcon({ className: '', html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,.2)"></div>`, iconSize: [18,18], iconAnchor: [9,9] })} />}

              {/* Captacion markers */}
              {captaciones.map(c => (
                <Marker key={c.id} position={[c.latitud, c.longitud]} icon={captacionIcon}>
                  <Popup><div className="text-xs min-w-[140px]"><p className="font-bold">{c.tipo_inmueble}</p><p className="text-emerald-600">{c.estatus}</p>{c.telefono_contacto && <p>📞 {c.telefono_contacto}</p>}{c.notas && <p className="italic text-slate-500">{c.notas}</p>}</div></Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Controls */}
          <div className="px-4 py-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
            {!isTracking ? (
              <button onClick={startTracking} disabled={isSaving} className="flex-1 min-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                <Play className="w-6 h-6" /> {isSaving ? 'Iniciando...' : 'Iniciar Recorrido'}
              </button>
            ) : (
              <>
                <button onClick={stopTracking} disabled={isSaving} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                  <Square className="w-6 h-6" /> {isSaving ? 'Guardando...' : 'Detener'}
                </button>
                <button onClick={() => setShowCapture(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3">
                  <Plus className="w-6 h-6" /> Inmueble
                </button>
              </>
            )}
            <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-4 rounded-2xl transition-colors ${showHeatmap ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Mapa de Calor">
              <Flame className="w-6 h-6" />
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-4 rounded-2xl transition-colors ${showHistory ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Historial">
              <Clock className="w-6 h-6" />
            </button>
            <button onClick={() => setShowBitacora(!showBitacora)} className={`p-4 rounded-2xl transition-colors ${showBitacora ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Bitácora de Farming">
              <BookOpen className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Zones Panel (right side) */}
        <div className="w-full lg:w-80 shrink-0">
          <FarmingZonesPanel zonas={visibleZonas} userRoles={userRoles || []} isAdmin={isAdmin}
            onRefresh={loadData} onSelectZona={setSelectedZona} selectedZona={selectedZona} />
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Route className="w-5 h-5 text-slate-400" /> Historial</h3>
          {recorridos.length === 0 ? <p className="text-sm text-slate-400 italic text-center py-4">Sin recorridos.</p> : (
            <div className="space-y-2">{recorridos.map(r => (
              <div key={r.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{r.zona_nombre}</p>
                  <p className="text-xs text-slate-500">{r.agente_email?.split('@')[0]} · {new Date(r.created_at).toLocaleDateString()} · {formatDistance(r.distancia_metros)}</p>
                </div>
                {(isAdmin || true) && <button onClick={() => handleDeleteRecorrido(r.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}</div>
          )}
        </div>
      )}

      {/* Grid Assignment Modal */}
      {pendingGridCell && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target className="w-5 h-5 text-emerald-600" /> Asignar Zona</h3>
              <button onClick={() => setPendingGridCell(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Municipio</label>
                  <select value={assignForm.municipio} onChange={e => setAssignForm({...assignForm, municipio: e.target.value, parroquia: '', sector: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="">Seleccionar...</option>
                    {Object.keys(SECTORS_DATA).map(m => <option key={m} value={m}>{m.replace('Municipio ', '')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Parroquia</label>
                  <select value={assignForm.parroquia} onChange={e => setAssignForm({...assignForm, parroquia: e.target.value, sector: ''})} disabled={!assignForm.municipio} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50">
                    <option value="">Seleccionar...</option>
                    {assignForm.municipio && Object.keys(SECTORS_DATA[assignForm.municipio as keyof typeof SECTORS_DATA]).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Sector a peinar</label>
                <select value={assignForm.sector} onChange={e => setAssignForm({...assignForm, sector: e.target.value})} disabled={!assignForm.parroquia} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50">
                  <option value="">📍 Seleccionar sector...</option>
                  {assignForm.municipio && assignForm.parroquia && SECTORS_DATA[assignForm.municipio as keyof typeof SECTORS_DATA][assignForm.parroquia as keyof typeof SECTORS_DATA[keyof typeof SECTORS_DATA]].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Asesor Asignado</label>
                <select value={assignForm.asignado_a} onChange={e => {
                  const u = userRoles.find(r => r.user_id === e.target.value);
                  setAssignForm({...assignForm, asignado_a: e.target.value, asignado_email: u?.email || ''});
                }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">👤 Seleccionar Asesor...</option>
                  {userRoles.map(r => <option key={r.user_id} value={r.user_id}>{r.email}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setPendingGridCell(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">Cancelar</button>
              <button onClick={async () => {
                if (!assignForm.sector || !assignForm.asignado_a) return;
                setIsSaving(true);
                const color = COLORS[zonas.length % COLORS.length];
                await propertyService.createZonaFarming({
                  nombre: assignForm.sector,
                  poligono: pendingGridCell.poligono,
                  color,
                  meta_km: pendingGridCell.meta_km,
                  asignado_a: assignForm.asignado_a,
                  asignado_email: assignForm.asignado_email,
                  estado: 'pendiente',
                  km_recorridos: 0
                });
                setIsSaving(false);
                setPendingGridCell(null);
                loadData();
              }} disabled={isSaving || !assignForm.sector || !assignForm.asignado_a} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
                {isSaving ? 'Guardando...' : 'Asignar Zona'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Captura Rápida</h3>
              <button onClick={() => setShowCapture(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Casa','Apartamento','Local','Terreno'].map(t => (
                    <button key={t} onClick={() => setCaptureForm({...captureForm, tipo_inmueble: t})} className={`py-3 rounded-xl font-bold text-sm ${captureForm.tipo_inmueble === t ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Estatus</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Se Vende','Se Alquila','Potencial'].map(s => (
                    <button key={s} onClick={() => setCaptureForm({...captureForm, estatus: s})} className={`py-3 rounded-xl font-bold text-sm ${captureForm.estatus === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={captureForm.telefono_contacto} onChange={e => setCaptureForm({...captureForm, telefono_contacto: e.target.value})} placeholder="Teléfono" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                <textarea value={captureForm.notas} onChange={e => setCaptureForm({...captureForm, notas: e.target.value})} placeholder="Notas..." rows={2} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100">
              <button onClick={saveCaptacion} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 flex items-center justify-center gap-2">
                {isSaving ? 'Guardando...' : '📌 Guardar Captación'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Intelligence Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-end md:items-center justify-center p-0 md:p-4 overflow-y-auto">
          <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10 md:rounded-t-3xl">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-emerald-600" /> Reporte de Inteligencia</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><Route className="w-4 h-4" /> {formatDistance(currentDistance)}</div>
            </div>
            <div className="p-5 space-y-5">
              {/* Section 1: Oportunidades */}
              <div className="space-y-3">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">🎯 Oportunidades Detectadas</p>
                {([['carteles_duenos', 'Carteles de Dueños'], ['carteles_competencia', 'Carteles Competencia'], ['inmuebles_abandonados', 'Inmuebles Abandonados/Vacíos']] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{label}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['0', '1-3', '4-10', '10+'] as RangoRapido[]).map(v => (
                        <button key={v} onClick={() => setReportForm({...reportForm, [key]: v})} className={`py-2.5 rounded-xl font-bold text-sm transition-all ${reportForm[key] === v ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Section 2: Siembra */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-black text-blue-600 uppercase tracking-wider">🌱 Trabajo de Siembra</p>
                {([['contactos_clave', 'Contactos Clave (vigilantes, conserjes)'], ['tarjetas_entregadas', 'Tarjetas/Flyers Entregados']] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">{label}</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['0', '1-3', '4-10', '10+'] as RangoRapido[]).map(v => (
                        <button key={v} onClick={() => setReportForm({...reportForm, [key]: v})} className={`py-2.5 rounded-xl font-bold text-sm transition-all ${reportForm[key] === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Section 3: Termómetro */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-xs font-black text-purple-600 uppercase tracking-wider">🌡️ Termómetro de la Zona</p>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Actividad de Construcción</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Nula', 'Baja', 'Alta'] as NivelActividad[]).map(v => (
                      <button key={v} onClick={() => setReportForm({...reportForm, actividad_construccion: v})} className={`py-2.5 rounded-xl font-bold text-sm transition-all ${reportForm.actividad_construccion === v ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Receptividad de la Gente</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Hostil', 'Indiferente', 'Receptiva'] as NivelReceptividad[]).map(v => (
                      <button key={v} onClick={() => setReportForm({...reportForm, receptividad: v})} className={`py-2.5 rounded-xl font-bold text-sm transition-all ${reportForm.receptividad === v ? (v === 'Hostil' ? 'bg-red-600 text-white shadow-lg' : v === 'Receptiva' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-amber-500 text-white shadow-lg') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Potencial de Captación</label>
                  <div className="flex gap-1 justify-center py-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReportForm({...reportForm, potencial_captacion: n})} className="p-1 transition-transform hover:scale-110">
                        <Star className={`w-8 h-8 ${n <= reportForm.potencial_captacion ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Section 4: Notas */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">📝 Observaciones</label>
                <textarea value={reportForm.notas} onChange={e => setReportForm({...reportForm, notas: e.target.value})} placeholder="Detalles relevantes del recorrido..." rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 sticky bottom-0 bg-white md:rounded-b-3xl">
              <button onClick={submitReport} disabled={isSaving} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all">
                {isSaving ? 'Guardando...' : '✅ Guardar Reporte y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bitácora Personal */}
      {showBitacora && (() => {
        const filteredRecs = isAdmin && bitacoraFilter !== 'all'
          ? recorridos.filter(r => r.agente_id === bitacoraFilter)
          : isAdmin ? recorridos : recorridos.filter(r => r.agente_id === currentUserId);

        const grouped = filteredRecs.reduce<Record<string, Recorrido[]>>((acc, r) => {
          const key = r.zona_nombre || 'Sin nombre';
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {});

        const uniqueAgents = Array.from(new Set(recorridos.map(r => r.agente_id).filter(Boolean)));

        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500" /> Mi Bitácora de Farming</h3>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <select value={bitacoraFilter} onChange={e => setBitacoraFilter(e.target.value)} className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none">
                    <option value="all">Todos los asesores</option>
                    {uniqueAgents.map(id => {
                      const email = recorridos.find(r => r.agente_id === id)?.agente_email || id;
                      return <option key={id} value={id!}>{email?.split('@')[0]}</option>;
                    })}
                  </select>
                </div>
              )}
            </div>
            {Object.keys(grouped).length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">Sin recorridos registrados.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([zona, recs]) => {
                  const totalKm = recs.reduce((s, r) => s + (r.distancia_metros || 0), 0);
                  const recsWithReport = recs.filter(r => r.reporte);
                  const avgPotencial = recsWithReport.length > 0 ? Math.round(recsWithReport.reduce((s, r) => s + (r.reporte?.potencial_captacion || 0), 0) / recsWithReport.length) : 0;
                  const lastRec = recs[0];
                  const daysSince = Math.floor((Date.now() - new Date(lastRec.created_at).getTime()) / 86400000);
                  const isExpanded = expandedZones[zona] || false;

                  return (
                    <div key={zona} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <button onClick={() => setExpandedZones(prev => ({...prev, [zona]: !prev[zona]}))} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-100 transition-colors text-left">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">📍 {zona}</p>
                          <p className="text-xs text-slate-500">{recs.length} recorrido{recs.length !== 1 ? 's' : ''} · Último: {daysSince === 0 ? 'hoy' : `hace ${daysSince}d`} · {formatDistance(totalKm)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {avgPotencial > 0 && <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= avgPotencial ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}</div>}
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-2 border-t border-slate-200">
                          {recs.map(r => (
                            <div key={r.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
                              <div className="text-xs text-slate-400 pt-0.5 w-20 shrink-0 font-medium">{new Date(r.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-700">{formatDistance(r.distancia_metros)}</span>
                                  {r.reporte && <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= (r.reporte?.potencial_captacion || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div>}
                                  {isAdmin && r.agente_email && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{r.agente_email.split('@')[0]}</span>}
                                </div>
                                {r.reporte && (
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {r.reporte.carteles_duenos !== '0' && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold">🏠 {r.reporte.carteles_duenos}</span>}
                                    {r.reporte.contactos_clave !== '0' && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">🤝 {r.reporte.contactos_clave}</span>}
                                    {r.reporte.receptividad !== 'Indiferente' && <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${r.reporte.receptividad === 'Receptiva' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{r.reporte.receptividad === 'Receptiva' ? '😊' : '😠'} {r.reporte.receptividad}</span>}
                                  </div>
                                )}
                                {r.reporte?.notas && <p className="text-xs text-slate-500 italic mt-1 truncate">"{r.reporte.notas}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
