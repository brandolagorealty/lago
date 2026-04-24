import React, { useState } from 'react';
import { Search, Globe, AlertTriangle, User, Building, MapPin, Tag, Filter, ExternalLink } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { MARACAIBO_SECTORS } from '../constants/locations';

interface ProspectResult {
  title: string;
  price: string;
  url: string;
  isAgent: boolean;
  operacion: string;
  reasoning: string;
}

export default function ProspectorModule() {
    const { session } = useAuth();
    
    const [formData, setFormData] = useState({
        operacion: 'Venta',
        tipoInmueble: '',
        ubicacion: '',
        keywords: '',
        soloDuenos: true
    });

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ProspectResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const processSearch = async () => {
        if (!formData.tipoInmueble) {
            setError('Por favor selecciona un Tipo de Inmueble para iniciar la búsqueda.');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);

        let queryParts = [`"${formData.operacion} de ${formData.tipoInmueble}"`];
        if (formData.ubicacion) queryParts.push(`"${formData.ubicacion}"`);
        if (formData.soloDuenos) queryParts.push(`(trato directo OR dueño vende OR sin intermediarios)`);
        if (formData.keywords) queryParts.push(formData.keywords);
        
        const finalQuery = queryParts.join(' ');

        try {
            const response = await fetch('/.netlify/functions/prospector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: finalQuery })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.details ? `${responseData.error}: ${responseData.details}` : (responseData.error || 'Error al buscar en la web'));
            }

            if (!Array.isArray(responseData)) {
                 throw new Error("El formato de respuesta es incorrecto.");
            }

            if (responseData.length === 0) {
                 setError('No se encontraron publicaciones recientes útiles con esos términos.');
            }

            setResults(responseData);
        } catch (err: any) {
            setError(err.message || 'Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        if (text) {
            navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
                        <Search className="w-8 h-8 text-indigo-600" />
                        Prospector Dedicado
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Búsqueda agresiva en portales inmobiliarios para encontrar dueños directos en tiempo real.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Operación</label>
                        <select name="operacion" value={formData.operacion} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none">
                            <option value="Venta">Venta</option>
                            <option value="Alquiler">Alquiler</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
                        <select name="tipoInmueble" value={formData.tipoInmueble} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none">
                            <option value="" disabled>Seleccionar...</option>
                            <option value="Apartamento">Apartamento</option>
                            <option value="Casa">Casa</option>
                            <option value="Townhouse">Townhouse</option>
                            <option value="Galpón">Galpón</option>
                            <option value="Oficina">Oficina</option>
                            <option value="Local Comercial">Local Comercial</option>
                            <option value="Terreno">Terreno</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400"/>Sector / Zona</label>
                        <select name="ubicacion" value={formData.ubicacion} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium appearance-none">
                            <option value="">Cualquier sector (Búsqueda amplia)</option>
                            {MARACAIBO_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full relative">
                        <Tag className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            name="keywords"
                            value={formData.keywords}
                            onChange={handleChange}
                            placeholder="Palabras clave extra (Ej: amoblado, piscina)..."
                            className="w-full pl-12 pr-4 py-3.5 text-md border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer shrink-0 bg-indigo-50 px-4 py-3.5 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
                        <input type="checkbox" name="soloDuenos" checked={formData.soloDuenos} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500/20" />
                        <span className="font-bold text-indigo-900 text-sm flex flex-col">Modo Francotirador <span className="text-xs font-medium text-indigo-500">Solo dueños directos</span></span>
                    </label>
                    <button
                        onClick={processSearch}
                        disabled={loading || !formData.tipoInmueble}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Buscando...</>
                        ) : (
                            <><Search className="w-5 h-5" /> Buscar</>
                        )}
                    </button>
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{error}</span>
                    </div>
                )}
            </div>

            {results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <div className="col-span-full">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Prospectos Encontrados ({results.length})</h3>
                    </div>
                    {results.map((result, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className={`p-5 flex items-start gap-4 border-b ${result.isAgent ? 'bg-red-50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                                <div className={`p-3 rounded-full shrink-0 ${result.isAgent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {result.isAgent ? <Building className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-lg font-bold leading-tight truncate mb-1 ${result.isAgent ? 'text-red-900' : 'text-green-900'}`}>
                                        {result.isAgent ? 'Agencia / Comercializadora' : 'Dueño Directo Identificado'}
                                    </h4>
                                    <p className={`text-xs font-medium leading-relaxed ${result.isAgent ? 'text-red-600' : 'text-green-700'}`}>
                                        {result.reasoning}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col gap-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Inmueble Detectado</p>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${result.operacion === 'Venta' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{result.operacion}</span>
                                        </div>
                                        <h5 className="font-semibold text-slate-800 line-clamp-2 leading-tight">{result.title}</h5>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Precio</p>
                                        <p className="font-bold text-slate-900 text-lg bg-slate-100 px-2 rounded-md">{result.price}</p>
                                    </div>
                                </div>

                                <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-indigo-600 font-bold hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors mt-auto w-max">
                                    <ExternalLink className="w-4 h-4" />
                                    Abrir Anuncio Original
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Globe className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-serif font-bold text-slate-600 mb-2">Motor de Búsqueda Proxy</h3>
                    <p className="max-w-md text-center text-slate-500">
                        Escribe qué propiedad estás buscando. La aplicación leerá los resultados y Gemini analizará las publicaciones para encontrar a los verdaderos dueños directos.
                    </p>
                </div>
            )}
        </div>
    );
}
