import React, { useState } from 'react';
import { Search, Globe, AlertTriangle, User, Building, MessageSquare, Copy, ExternalLink, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

interface ProspectResult {
  title: string;
  price: string;
  url: string;
  isAgent: boolean;
  reasoning: string;
  hookMessage: string;
}

export default function ProspectorModule() {
    const { session } = useAuth();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ProspectResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const processSearch = async () => {
        if (!query.trim()) {
            setError('Por favor ingresa una búsqueda válida.');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const response = await fetch('/.netlify/functions/prospector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
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
                        Búsqueda agresiva en portales inmobiliarios para encontrar dueños directos usando Gemini 2.0.
                    </p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="max-w-3xl mx-auto flex gap-4">
                    <div className="flex-1 relative">
                        <Globe className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && processSearch()}
                            placeholder="Ej: Apartamentos en alquiler zona norte trato directo..."
                            className="w-full pl-14 pr-4 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <button
                        onClick={processSearch}
                        disabled={loading || !query.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 text-lg"
                    >
                        {loading ? (
                            <><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Escaneando...</>
                        ) : (
                            <><Search className="w-6 h-6" /> Buscar Prospectos</>
                        )}
                    </button>
                </div>
                {error && (
                    <div className="max-w-3xl mx-auto mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
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

                            <div className="mt-auto border-t border-slate-100 bg-slate-50/50">
                                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                                        <MessageSquare className="w-4 h-4 text-slate-400" />
                                        Guion Rompehielos Generado
                                    </div>
                                    <button 
                                        onClick={() => copyToClipboard(result.hookMessage, index)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-2.5 py-1.5 border border-slate-200 rounded-md shadow-sm hover:border-indigo-200 hover:bg-indigo-50"
                                    >
                                        {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedIndex === index ? 'Copiado' : 'Copiar para WhatsApp'}
                                    </button>
                                </div>
                                <div className="p-4">
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed italic">
                                        "{result.hookMessage}"
                                    </p>
                                </div>
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
