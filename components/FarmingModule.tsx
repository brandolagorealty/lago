import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Play, Square, Plus, X, Phone, FileText, Trash2, Navigation, Clock, Route, Flame, Target, Star, ChevronDown, ChevronRight, ClipboardList, BookOpen, Users, Compass, Crosshair, Navigation2, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
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

const userPositionIcon = new L.DivIcon({
  className: '',
  html: `<style>
    @keyframes farmPulse { 0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; } 100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; } }
  </style>
  <div style="position:relative;width:24px;height:24px;">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,.5);z-index:2;"></div>
    <div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:rgba(59,130,246,.35);border-radius:50%;animation:farmPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:rgba(59,130,246,.2);border-radius:50%;animation:farmPulse 2s ease-out 0.8s infinite;"></div>
  </div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});

const DEFAULT_REPORT: ReporteInteligencia = { carteles_duenos: '0', carteles_competencia: '0', inmuebles_abandonados: '0', contactos_clave: '0', tarjetas_entregadas: '0', actividad_construccion: 'Nula', receptividad: 'Indiferente', potencial_captacion: 3, notas: '' };

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#ef4444', '#64748b', '#0ea5e9'];

const destinationIcon = new L.DivIcon({
  className: '',
  html: `<style>
    @keyframes farmDestPulse { 0% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; } 100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; } }
  </style>
  <div style="position:relative;width:40px;height:40px;">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#ef4444,#f97316);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(239,68,68,.5);display:flex;align-items:center;justify-content:center;z-index:2;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="3,11 22,2 13,21 11,13"/></svg></div>
    <div style="position:absolute;top:50%;left:50%;width:30px;height:30px;border:3px solid rgba(239,68,68,.4);border-radius:50%;animation:farmDestPulse 1.5s ease-out infinite;"></div>
  </div>`,
  iconSize: [40, 40], iconAnchor: [20, 20],
});

const ARRIVAL_DISTANCE = 150; // meters
const REROUTE_INTERVAL = 20000; // 20 seconds

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

function formatDuration(s: number): string {
  if (s < 60) return '< 1 min';
  const mins = Math.round(s / 60);
  return mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `~${mins} min`;
}

function getCentroid(poligono: {lat:number;lng:number}[]): [number,number] {
  const lat = poligono.reduce((s, p) => s + p.lat, 0) / poligono.length;
  const lng = poligono.reduce((s, p) => s + p.lng, 0) / poligono.length;
  return [lat, lng];
}

function calculateBearing(from: [number,number], to: [number,number]): number {
  const dLng = (to[1] - from[1]) * Math.PI / 180;
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0] * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function createUserIcon(heading: number | null): L.DivIcon {
  const cone = heading !== null
    ? `<div style="position:absolute;top:50%;left:50%;width:40px;height:40px;transform:translate(-50%,-50%) rotate(${heading}deg);pointer-events:none;">
        <svg width="40" height="40" viewBox="0 0 40 40" style="overflow:visible;">
          <path d="M20 20 L12 3 Q20 -1 28 3 Z" fill="rgba(59,130,246,0.22)"/>
        </svg>
      </div>`
    : '';
  return new L.DivIcon({
    className: '',
    html: `<style>@keyframes farmPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:.5}100%{transform:translate(-50%,-50%) scale(3.5);opacity:0}}</style>
    <div style="position:relative;width:40px;height:40px;">
      ${cone}
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,.5);z-index:2;"></div>
      <div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:rgba(59,130,246,.35);border-radius:50%;animation:farmPulse 2s ease-out infinite;"></div>
      <div style="position:absolute;top:50%;left:50%;width:14px;height:14px;background:rgba(59,130,246,.2);border-radius:50%;animation:farmPulse 2s ease-out .8s infinite;"></div>
    </div>`,
    iconSize: [40, 40], iconAnchor: [20, 20],
  });
}

async function fetchOSRMRoute(from: [number,number], to: [number,number]): Promise<{coords: [number,number][], distance: number, duration: number, steps: NavStep[]} | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number,number]);
      const steps: NavStep[] = (route.legs[0]?.steps || []).map((s: any) => ({
        instruction: translateManeuver(s.maneuver?.type || '', s.maneuver?.modifier || '', s.name || '', s.distance || 0),
        distance: s.distance || 0,
        location: [s.maneuver.location[1], s.maneuver.location[0]] as [number,number],
        maneuverType: s.maneuver?.type || '',
        modifier: s.maneuver?.modifier || '',
      }));
      return { coords, distance: route.distance, duration: route.duration, steps };
    }
  } catch (e) { console.error('OSRM routing error:', e); }
  return null;
}

interface NavStep {
  instruction: string;
  distance: number;
  location: [number,number];
  maneuverType: string;
  modifier: string;
}

function translateManeuver(type: string, modifier: string, street: string, distance: number): string {
  const st = street && street !== '' ? ` en ${street}` : '';
  switch(type) {
    case 'turn':
      if (modifier.includes('left') && modifier.includes('sharp')) return `Gira fuerte a la izquierda${st}`;
      if (modifier.includes('right') && modifier.includes('sharp')) return `Gira fuerte a la derecha${st}`;
      if (modifier.includes('slight') && modifier.includes('left')) return `Gira levemente a la izquierda${st}`;
      if (modifier.includes('slight') && modifier.includes('right')) return `Gira levemente a la derecha${st}`;
      if (modifier.includes('left')) return `Gira a la izquierda${st}`;
      if (modifier.includes('right')) return `Gira a la derecha${st}`;
      if (modifier === 'uturn') return `Da la vuelta en U`;
      return `Gira${st}`;
    case 'new name': case 'continue': return `Continúa por ${street || 'la vía'}`;
    case 'depart': return `Dirígete hacia ${street || 'la vía'}`;
    case 'arrive': return `Has llegado a tu destino`;
    case 'merge': return `Incorpórate${st}`;
    case 'fork':
      if (modifier.includes('left')) return `Toma el desvío izquierdo${st}`;
      if (modifier.includes('right')) return `Toma el desvío derecho${st}`;
      return `Toma el desvío${st}`;
    case 'roundabout': case 'rotary': return `Entra a la rotonda${st}`;
    case 'end of road':
      if (modifier.includes('left')) return `Al final de la calle, gira a la izquierda`;
      if (modifier.includes('right')) return `Al final de la calle, gira a la derecha`;
      return `Al final de la calle`;
    default: return `Continúa recto`;
  }
}

function getManeuverIcon(type: string, modifier: string): string {
  if (type === 'arrive') return '🏁';
  if (type === 'depart') return '🚩';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  if (modifier.includes('left') && modifier.includes('sharp')) return '⬅';
  if (modifier.includes('right') && modifier.includes('sharp')) return '➡';
  if (modifier.includes('slight') && modifier.includes('left')) return '↖';
  if (modifier.includes('slight') && modifier.includes('right')) return '↗';
  if (modifier.includes('left')) return '↰';
  if (modifier.includes('right')) return '↱';
  if (modifier === 'uturn') return '↻';
  return '⬆';
}

function speakNav(text: string) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = 1.05; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch(_) {}
}

function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, map.getZoom()); }, [position]);
  return null;
}

function FlyToPosition({ position, trigger }: { position: [number,number] | null, trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (position && trigger > 0) map.flyTo(position, Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [trigger]);
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



interface BitacoraSectionProps {
  recorridos: Recorrido[];
  isAdmin: boolean;
  currentUserId: string | undefined;
  bitacoraFilter: string;
  setBitacoraFilter: (v: string) => void;
  expandedZones: Record<string, boolean>;
  setExpandedZones: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

function BitacoraSection({ recorridos, isAdmin, currentUserId, bitacoraFilter, setBitacoraFilter, expandedZones, setExpandedZones }: BitacoraSectionProps) {
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
  const [reportForm, setReportForm] = useState<ReporteInteligencia>({ ...DEFAULT_REPORT });

  // Bitácora state
  const [showBitacora, setShowBitacora] = useState(false);
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [bitacoraFilter, setBitacoraFilter] = useState<string>('all');

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navRoute, setNavRoute] = useState<[number,number][] | null>(null);
  const [navInfo, setNavInfo] = useState<{distance: number; duration: number} | null>(null);
  const [navTarget, setNavTarget] = useState<ZonaFarming | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const lastPosRef = useRef<[number,number] | null>(null);
  const navWatchRef = useRef<number | null>(null);
  const rerouteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice navigation state
  const [navSteps, setNavSteps] = useState<NavStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentInstruction, setCurrentInstruction] = useState<string | null>(null);
  const spokenStepsRef = useRef<Set<number>>(new Set());
  const approachingSpokenRef = useRef(false);

  useEffect(() => { loadData(); }, []);

  // Cleanup all GPS watches on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (navWatchRef.current !== null) {
        navigator.geolocation.clearWatch(navWatchRef.current);
        navWatchRef.current = null;
      }
      if (rerouteTimerRef.current !== null) {
        clearInterval(rerouteTimerRef.current);
        rerouteTimerRef.current = null;
      }
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [recs, caps, zns] = await Promise.all([
      propertyService.getRecorridos(), propertyService.getCaptaciones(), propertyService.getZonasFarming()
    ]);
    setRecorridos(recs); setCaptaciones(caps); setZonas(zns);
    setIsLoading(false);
  };

  const currentDistance = useMemo(() => routeCoords.reduce((sum, c, i) => i === 0 ? 0 : sum + haversineDistance(routeCoords[i-1], c), 0), [routeCoords]);

  // ===================== NAVIGATION SYSTEM =====================
  const startNavigation = useCallback(async (zona: ZonaFarming) => {
    if (!navigator.geolocation) { setGpsError('Tu navegador no soporta GPS.'); return; }
    if (!zona.poligono || zona.poligono.length < 3) { setGpsError('Esta zona no tiene polígono definido.'); return; }
    setGpsError(null); setHasArrived(false);
    setNavTarget(zona);
    setIsNavigating(true);
    setNavSteps([]); setCurrentStepIdx(0); setCurrentInstruction(null);
    spokenStepsRef.current = new Set();
    approachingSpokenRef.current = false;

    // Unlock speech synthesis on user gesture (iOS requirement)
    try { const u = new SpeechSynthesisUtterance(''); u.volume = 0; window.speechSynthesis?.speak(u); } catch(_) {}

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from: [number,number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPosition(from);
        const to = getCentroid(zona.poligono);

        // Calculate initial route
        const result = await fetchOSRMRoute(from, to);
        if (result) {
          setNavRoute(result.coords);
          setNavInfo({ distance: result.distance, duration: result.duration });
          setNavSteps(result.steps);
          setCurrentStepIdx(0);
          spokenStepsRef.current = new Set();
          // Speak first instruction
          if (result.steps.length > 0 && voiceEnabled) {
            speakNav(result.steps[0].instruction);
            setCurrentInstruction(result.steps[0].instruction);
            spokenStepsRef.current.add(0);
          }
        } else {
          setGpsError('No se pudo calcular la ruta. Intenta de nuevo.');
        }

        // Start continuous GPS watch for navigation
        const wid = navigator.geolocation.watchPosition(
          (p) => {
            const newPos: [number,number] = [p.coords.latitude, p.coords.longitude];
            setUserPosition(newPos);
            // Update heading from GPS or calculated
            if (p.coords.heading != null && !isNaN(p.coords.heading)) {
              setUserHeading(p.coords.heading);
            } else if (lastPosRef.current) {
              const d = haversineDistance({lat: lastPosRef.current[0], lng: lastPosRef.current[1]}, {lat: newPos[0], lng: newPos[1]});
              if (d > 5) setUserHeading(calculateBearing(lastPosRef.current, newPos));
            }
            lastPosRef.current = newPos;
          },
          (err) => { setGpsError(err.code === 1 ? 'Permiso de GPS denegado.' : 'Error GPS: ' + err.message); },
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
        navWatchRef.current = wid;
      },
      (err) => {
        setGpsError(err.code === 1 ? 'Permiso de GPS denegado.' : 'Error GPS: ' + err.message);
        setIsNavigating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const stopNavigation = useCallback(() => {
    if (navWatchRef.current !== null) {
      navigator.geolocation.clearWatch(navWatchRef.current);
      navWatchRef.current = null;
    }
    if (rerouteTimerRef.current !== null) {
      clearInterval(rerouteTimerRef.current);
      rerouteTimerRef.current = null;
    }
    setIsNavigating(false);
    setNavRoute(null);
    setNavInfo(null);
    setNavTarget(null);
    setHasArrived(false);
    setNavSteps([]); setCurrentStepIdx(0); setCurrentInstruction(null);
    spokenStepsRef.current = new Set();
    approachingSpokenRef.current = false;
    try { window.speechSynthesis?.cancel(); } catch(_) {}
  }, []);

  // Re-routing & arrival detection effect
  useEffect(() => {
    if (!isNavigating || !userPosition || !navTarget?.poligono || hasArrived) return;

    const dest = getCentroid(navTarget.poligono);
    const distToDest = haversineDistance(
      { lat: userPosition[0], lng: userPosition[1] },
      { lat: dest[0], lng: dest[1] }
    );

    // Arrival detection
    if (distToDest < ARRIVAL_DISTANCE) {
      setHasArrived(true);
      setNavRoute(null);
      setNavInfo(null);
      setZoneName(navTarget.nombre);
      if (voiceEnabled) speakNav(`Has llegado a ${navTarget.nombre}`);
      try { navigator.vibrate?.(200); } catch(_) {}
      if (rerouteTimerRef.current !== null) {
        clearInterval(rerouteTimerRef.current);
        rerouteTimerRef.current = null;
      }
      return;
    }

    // Approaching destination alert
    if (distToDest < 300 && !approachingSpokenRef.current && voiceEnabled) {
      speakNav('Te estás acercando a tu destino');
      setCurrentInstruction('Te estás acercando a tu destino');
      approachingSpokenRef.current = true;
    }

    // Step-by-step voice monitoring
    if (navSteps.length > 0 && currentStepIdx < navSteps.length) {
      const step = navSteps[currentStepIdx];
      const distToStep = haversineDistance(
        { lat: userPosition[0], lng: userPosition[1] },
        { lat: step.location[0], lng: step.location[1] }
      );
      if (distToStep < 80 && !spokenStepsRef.current.has(currentStepIdx)) {
        if (voiceEnabled) speakNav(step.instruction);
        spokenStepsRef.current.add(currentStepIdx);
        setCurrentStepIdx(prev => prev + 1);
        // Show next instruction if available
        const nextIdx = currentStepIdx + 1;
        if (nextIdx < navSteps.length) {
          setCurrentInstruction(navSteps[nextIdx].instruction);
        }
      } else if (distToStep >= 80) {
        setCurrentInstruction(`En ${formatDistance(distToStep)}, ${step.instruction.toLowerCase()}`);
      }
    }

    // Set up re-routing interval
    if (rerouteTimerRef.current) clearInterval(rerouteTimerRef.current);
    rerouteTimerRef.current = setInterval(async () => {
      if (!userPosition || !navTarget?.poligono) return;
      const currentDest = getCentroid(navTarget.poligono);
      const result = await fetchOSRMRoute(userPosition, currentDest);
      if (result) {
        setNavRoute(result.coords);
        setNavInfo({ distance: result.distance, duration: result.duration });
        setNavSteps(result.steps);
        setCurrentStepIdx(0);
        spokenStepsRef.current = new Set();
      }
    }, REROUTE_INTERVAL);

    return () => {
      if (rerouteTimerRef.current) {
        clearInterval(rerouteTimerRef.current);
        rerouteTimerRef.current = null;
      }
    };
  }, [isNavigating, userPosition, navTarget, hasArrived]);

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
        const newPos: [number,number] = [nc.lat, nc.lng];
        setUserPosition(newPos);
        // Update heading
        if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading);
        } else if (lastPosRef.current) {
          const d = haversineDistance({lat: lastPosRef.current[0], lng: lastPosRef.current[1]}, nc);
          if (d > 5) setUserHeading(calculateBearing(lastPosRef.current, newPos));
        }
        lastPosRef.current = newPos;
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
      setReportForm({ ...DEFAULT_REPORT });
      setShowReportModal(true);
    }
  }, [activeRecorridoId, routeCoords, currentDistance]);

  const submitReport = async () => {
    if (!activeRecorridoId) return;
    setIsSaving(true);
    try {
      const result = await propertyService.finishRecorrido(activeRecorridoId, routeCoords, currentDistance, reportForm);
      if (!result.success) {
        setGpsError('Error al guardar reporte: ' + (result.error || 'Desconocido'));
        setIsSaving(false);
        return;
      }
      setShowReportModal(false);
      setActiveRecorridoId(null); setRouteCoords([]); setZoneName('');
      loadData();
    } catch (err: any) {
      setGpsError('Error al guardar reporte: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsSaving(false);
    }
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



  // Heatmap points from all recorridos (memoized)
  const heatPoints = useMemo<[number,number][]>(() => recorridos.flatMap(r => (r.coordenadas_ruta || []).map((c: any) => [c.lat, c.lng] as [number,number])), [recorridos]);

  const todayRecs = useMemo(() => recorridos.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()), [recorridos]);
  const totalDist = useMemo(() => recorridos.reduce((s, r) => s + (r.distancia_metros || 0), 0), [recorridos]);

  // Zone color based on progress
  const getZoneOpacity = (z: ZonaFarming) => {
    const pct = z.meta_km > 0 ? (z.km_recorridos / z.meta_km) * 100 : 0;
    return pct >= 75 ? 0.15 : pct >= 25 ? 0.25 : 0.35;
  };

  // Filter: asesores only see their own zones, superadmin sees all
  const visibleZonas = isAdmin ? zonas : zonas.filter(z => z.asignado_a === currentUserId);

  // Memoize user position icon — only re-create when heading changes by 15°
  const currentUserIcon = useMemo(() => createUserIcon(userHeading !== null ? Math.round(userHeading / 15) * 15 : null), [userHeading !== null ? Math.round(userHeading / 15) : null]);

  // Generate and filter grid cells
  const baseGrid = React.useMemo(() => generateMaracaiboGrid(), []);
  const availableGrid = useMemo(() => baseGrid.filter(cell => {
    if (!cell.poligono || cell.poligono.length === 0) return false;
    return !zonas.some(z => 
      z.poligono && z.poligono.length > 0 &&
      Math.abs(z.poligono[0].lat - cell.poligono[0].lat) < 0.001 &&
      Math.abs(z.poligono[0].lng - cell.poligono[0].lng) < 0.001
    );
  }), [baseGrid, zonas]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
            <Navigation className="w-8 h-8 text-emerald-600" /> Farming Inmobiliario
          </h2>
          <p className="text-slate-500 mt-1">Peinado de zonas con GPS · Costa Occidental y Oriental del Lago</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="px-4 py-2.5 rounded-2xl text-center border border-emerald-200/50 shadow-sm" style={{ background: 'rgba(236,253,245,0.8)', backdropFilter: 'blur(8px)' }}>
            <p className="text-2xl font-black bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">{todayRecs.length}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Hoy</p>
          </div>
          <div className="px-4 py-2.5 rounded-2xl text-center border border-blue-200/50 shadow-sm" style={{ background: 'rgba(239,246,255,0.8)', backdropFilter: 'blur(8px)' }}>
            <p className="text-2xl font-black bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">{captaciones.length}</p>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Captaciones</p>
          </div>
          <div className="px-4 py-2.5 rounded-2xl text-center border border-purple-200/50 shadow-sm" style={{ background: 'rgba(245,243,255,0.8)', backdropFilter: 'blur(8px)' }}>
            <p className="text-2xl font-black bg-gradient-to-br from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">{formatDistance(totalDist)}</p>
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
      </div>

      {gpsError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2"><MapPin className="w-5 h-5" /> {gpsError}</div>}



      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map Column */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Navigation Banner — Glass */}
          {isNavigating && !hasArrived && navInfo && (
            <div className="px-5 py-4 border-b border-blue-400/30" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.92), rgba(79,70,229,0.92))', backdropFilter: 'blur(12px)' }}>
              {/* Current instruction bar */}
              {currentInstruction && (
                <div className="flex items-center gap-2 mb-3 bg-white/10 rounded-xl px-3 py-2">
                  <span className="text-lg">{navSteps[currentStepIdx] ? getManeuverIcon(navSteps[currentStepIdx].maneuverType, navSteps[currentStepIdx].modifier) : '⬆'}</span>
                  <p className="text-sm text-white font-medium flex-1">{currentInstruction}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center"><Compass className="w-6 h-6 text-white animate-pulse" /></div>
                  <div>
                    <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Navegando a</p>
                    <p className="text-base font-bold text-white">{navTarget?.nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setVoiceEnabled(v => !v)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all active:scale-90" title={voiceEnabled ? 'Silenciar voz' : 'Activar voz'}>
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white leading-none">{formatDistance(navInfo.distance)}</p>
                    <p className="text-xs text-blue-200 font-bold">{formatDuration(navInfo.duration)}</p>
                  </div>
                  <button onClick={stopNavigation} className="bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-all active:scale-90" title="Cancelar navegación"><X className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Arrived Banner — Glass + Celebration */}
          {hasArrived && (
            <div className="px-5 py-4 border-b border-emerald-400/30 animate-in slide-in-from-top duration-500" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.92), rgba(13,148,136,0.92))', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center" style={{ animation: 'farmBounce 0.6s cubic-bezier(.36,.07,.19,.97)' }}>
                    <style>{`@keyframes farmBounce{0%{transform:scale(0)}50%{transform:scale(1.3)}100%{transform:scale(1)}}`}</style>
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200 font-medium uppercase tracking-wider">Destino alcanzado</p>
                    <p className="text-lg font-bold text-white">{navTarget?.nombre}</p>
                    <p className="text-xs text-emerald-200">Puedes iniciar tu recorrido</p>
                  </div>
                </div>
                <button onClick={() => { setHasArrived(false); setNavTarget(null); stopNavigation(); }} className="bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-90">Cerrar</button>
              </div>
            </div>
          )}

          {!isTracking && !isNavigating && !hasArrived && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 transition-all duration-300">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input type="text" value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Nombre de la zona a recorrer..." className="flex-1 bg-transparent text-sm outline-none" />
            </div>
          )}
          {isTracking && (
            <div className="px-4 py-3 border-b border-emerald-200 bg-emerald-50 flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-3"><div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" /><span className="text-sm font-bold text-emerald-800">Recorriendo: {zoneName || 'Sin nombre'}</span></div>
              <div className="flex gap-4 text-xs font-bold text-emerald-600"><span>{routeCoords.length} pts</span><span>{formatDistance(currentDistance)}</span></div>
            </div>
          )}

          <div style={{ height: '55vh', minHeight: 350, position: 'relative' }}>
            <MapContainer center={MARACAIBO_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer attribution='&copy; <a href="https://carto.com">CARTO</a>' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <RecenterMap position={isTracking ? userPosition : null} />
              <FlyToPosition position={userPosition} trigger={centerTrigger} />
              
              {showHeatmap && <HeatmapLayer points={heatPoints} />}

              {/* Navigation route — glow layer + main route */}
              {navRoute && navRoute.length > 1 && <>
                <Polyline positions={navRoute} pathOptions={{ color: '#3b82f6', weight: 14, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={navRoute} pathOptions={{ color: '#60a5fa', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
              </>}

              {/* Destination marker */}
              {isNavigating && !hasArrived && navTarget?.poligono && (
                <Marker position={getCentroid(navTarget.poligono)} icon={destinationIcon}>
                  <Popup><div className="text-xs font-bold">🎯 Destino: {navTarget.nombre}</div></Popup>
                </Marker>
              )}

              {/* User position with directional heading */}
              {userPosition && (isTracking || isNavigating) && <Marker position={userPosition} icon={currentUserIcon} />}

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

              {/* Zones as polygons — highlighted when navigating to them */}
              {visibleZonas.map(z => z.poligono && z.poligono.length >= 3 && (
                <Polygon key={z.id} positions={z.poligono.map(p => [p.lat, p.lng] as [number,number])}
                  pathOptions={{
                    color: isNavigating && navTarget?.id === z.id ? '#facc15' : z.color,
                    fillColor: isNavigating && navTarget?.id === z.id ? '#facc15' : z.color,
                    fillOpacity: isNavigating && navTarget?.id === z.id ? 0.25 : getZoneOpacity(z),
                    weight: isNavigating && navTarget?.id === z.id ? 4 : (selectedZona?.id === z.id ? 3 : 1),
                    dashArray: isNavigating && navTarget?.id === z.id ? '8 4' : undefined,
                  }}>
                  <Popup><div className="text-xs"><p className="font-bold">{z.nombre}</p><p>{z.asignado_email || 'Sin asignar'}</p><p>{z.meta_km > 0 ? Math.round((z.km_recorridos/z.meta_km)*100) : 0}% cubierto</p></div></Popup>
                </Polygon>
              ))}

              {/* Past routes — only rendered when history is toggled */}
              {showHistory && recorridos.map(r => r.coordenadas_ruta && r.coordenadas_ruta.length > 1 && (
                <Polyline key={r.id} positions={r.coordenadas_ruta.map((c: any) => [c.lat, c.lng] as [number,number])} pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '8 6' }} />
              ))}

              {/* Active tracking route (green) */}
              {routeCoords.length > 1 && <Polyline positions={routeCoords.map(c => [c.lat, c.lng] as [number,number])} pathOptions={{ color: '#10b981', weight: 5, opacity: 0.9 }} />}

              {/* Captacion markers */}
              {captaciones.map(c => (
                <Marker key={c.id} position={[c.latitud, c.longitud]} icon={captacionIcon}>
                  <Popup><div className="text-xs min-w-[140px]"><p className="font-bold">{c.tipo_inmueble}</p><p className="text-emerald-600">{c.estatus}</p>{c.telefono_contacto && <p>📞 {c.telefono_contacto}</p>}{c.notas && <p className="italic text-slate-500">{c.notas}</p>}</div></Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Center on Me floating button — AFTER MapContainer to ensure it renders on top of Leaflet layers */}
            {(isNavigating || isTracking) && userPosition && (
              <button onClick={() => setCenterTrigger(t => t + 1)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 9999 }} className="bg-white shadow-lg shadow-slate-300/50 rounded-2xl p-3 hover:bg-slate-50 active:scale-95 transition-all border border-slate-200" title="Centrar en mi posición">
                <Crosshair className="w-5 h-5 text-blue-600" />
              </button>
            )}
          </div>

          {/* Controls — Floating Glass Bar */}
          <div className="px-4 py-3 border-t border-slate-200/50" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-2.5 flex-wrap">
            {!isTracking ? (
              <button onClick={startTracking} disabled={isSaving || isNavigating} className="flex-1 min-w-[180px] text-white px-5 py-3.5 rounded-2xl font-bold text-base transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2.5 disabled:shadow-none disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                <Play className="w-5 h-5" /> {isSaving ? 'Iniciando...' : 'Iniciar Recorrido'}
              </button>
            ) : (
              <>
                <button onClick={stopTracking} disabled={isSaving} className="flex-1 text-white px-5 py-3.5 rounded-2xl font-bold text-base transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2.5" style={{ background: 'linear-gradient(135deg, #dc2626, #e11d48)' }}>
                  <Square className="w-5 h-5" /> {isSaving ? 'Guardando...' : 'Detener'}
                </button>
                <button onClick={() => setShowCapture(true)} className="flex-1 text-white px-5 py-3.5 rounded-2xl font-bold text-base transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2.5" style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                  <Plus className="w-5 h-5" /> Inmueble
                </button>
              </>
            )}
            <div className="flex gap-1.5">
              {(isNavigating || isTracking) && userPosition && (
                <button onClick={() => setCenterTrigger(t => t + 1)} className="p-3 rounded-xl transition-all bg-white/80 backdrop-blur border border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm active:scale-90" title="Centrar">
                  <Crosshair className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setShowHeatmap(!showHeatmap)} className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${showHeatmap ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Mapa de Calor">
                <Flame className="w-5 h-5" />
              </button>
              <button onClick={() => setShowHistory(!showHistory)} className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${showHistory ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Historial">
                <Clock className="w-5 h-5" />
              </button>
              <button onClick={() => setShowBitacora(!showBitacora)} className={`p-3 rounded-xl transition-all shadow-sm active:scale-90 ${showBitacora ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-white/80 backdrop-blur border border-slate-200 text-slate-500 hover:bg-slate-50'}`} title="Bitácora">
                <BookOpen className="w-5 h-5" />
              </button>
            </div>
            </div>
          </div>
        </div>

        {/* Zones Panel (right side) */}
        <div className="w-full lg:w-80 shrink-0">
          <FarmingZonesPanel zonas={visibleZonas} userRoles={userRoles || []} isAdmin={isAdmin}
            onRefresh={loadData} onSelectZona={setSelectedZona} selectedZona={selectedZona}
            onNavigate={startNavigation} isNavigating={isNavigating} navTarget={navTarget} />
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
                {(isAdmin || r.agente_id === currentUserId) && <button onClick={() => handleDeleteRecorrido(r.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
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
      {showBitacora && <BitacoraSection recorridos={recorridos} isAdmin={isAdmin} currentUserId={currentUserId} bitacoraFilter={bitacoraFilter} setBitacoraFilter={setBitacoraFilter} expandedZones={expandedZones} setExpandedZones={setExpandedZones} />}
    </div>
  );
}
