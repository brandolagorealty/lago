import React, { useState, useEffect } from 'react';
import { Search, Link as LinkIcon, AlertTriangle, CheckCircle2, User, Building, MessageSquare, Copy, Settings, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

interface ProspectResult {
  title: string;
  price: string;
  isAgent: boolean;
  reasoning: string;
  hookMessage: string;
}

export default function ProspectorModule() {
    const { session } = useAuth();
    const [rawText, setRawText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ProspectResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Comprobar si hay apiKey configurada (aunque sea via env)
    const [apiKeySet, setApiKeySet] = useState(true); // Simulamos true porque confiamos en el ENV del backend

    useEffect(() => {
        // Al cargar, verificamos si venimos de un bookmarklet leyendo la URL
        const params = new URLSearchParams(window.location.search);
        const textParam = params.get('text');
        
        if (textParam) {
            setRawText(textParam);
            // Limpiamos la URL para evitar recargas raras
            window.history.replaceState({}, document.title, window.location.pathname + '?tab=prospector');
            // Auto procesar
            processText(textParam);
        }
    }, []);

    const processText = async (textToProcess: string = rawText) => {
        if (!textToProcess.trim()) {
            setError('Por favor ingresa o pega el texto del anuncio.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/.netlify/functions/prospector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToProcess })
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.details ? `${responseData.error}: ${responseData.details}` : (responseData.error || 'Error al procesar con IA'));
            }

            setResult(responseData);
        } catch (err: any) {
            setError(err.message || 'Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.hookMessage) {
            navigator.clipboard.writeText(result.hookMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Generador Dinámico del Bookmarklet
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lagorealty.com.ve';
    const bookmarkletCode = `javascript:(function(){var s=window.getSelection().toString();if(!s){alert('❗ Por favor, primero resalta/selecciona el texto de la descripción del inmueble y luego haz clic en este botón.');return;}window.open('${origin}/admin?tab=prospector&text='+encodeURIComponent(s.substring(0,4000)),'_blank');})();`;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Search className="w-7 h-7 text-indigo-600" />
                        Prospector Inteligente (Captación)
                    </h2>
                    <p className="text-slate-500 mt-1">Extrae propiedades de dueños directos desde Facebook o WhatsApp y recibe un guion de contacto.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna Izquierda: Entrada y Herramientas */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Tarjeta del Bookmarklet */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <LinkIcon className="w-16 h-16" />
                        </div>
                        <h3 className="text-lg font-semibold text-indigo-900 mb-2">1. Captura con 1 Clic 🪄</h3>
                        <p className="text-sm text-indigo-700 mb-4">
                            Arrastra el siguiente botón hacia la <b>Barra de Marcadores</b> (Favoritos) de tu navegador. Luego ve a Facebook Marketplace, selecciona el texto de un anuncio y pulsa tu nuevo marcador.
                        </p>
                        
                        <div className="flex justify-center py-4 bg-white/50 rounded-lg border border-indigo-200 border-dashed">
                            <a 
                                href={bookmarkletCode}
                                onClick={(e) => e.preventDefault()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium shadow-md shadow-indigo-200 transition-transform active:scale-95 cursor-grab active:cursor-grabbing flex items-center gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Capturar para Lago
                            </a>
                        </div>
                        <p className="text-xs text-center text-indigo-500 mt-3 font-medium">← Arrástralo a tu barra superior →</p>
                    </div>

                    {/* Entrada Manual */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">2. O pégalo manual</h3>
                        <p className="text-sm text-slate-500 mb-4">Si estás en el móvil, simplemente pega el texto del anuncio aquí abajo.</p>
                        
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="Ej: Se vende hermosa casa en zona norte, 3 habs, 2 baños. Trato directo con dueño... $35,000"
                            className="w-full h-40 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-700 placeholder-slate-400 text-sm"
                        />
                        
                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span className="break-words">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={() => processText()}
                            disabled={loading || !rawText.trim()}
                            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Analizando prospecto...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Analizar Prospecto
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Columna Derecha: Resultados */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col h-full">
                        {result ? (
                            <div className="p-8 space-y-8">
                                {/* Veredicto */}
                                <div className={`p-6 rounded-xl border ${result.isAgent ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${result.isAgent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            {result.isAgent ? <Building className="w-8 h-8" /> : <User className="w-8 h-8" />}
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-bold ${result.isAgent ? 'text-red-900' : 'text-green-900'}`}>
                                                {result.isAgent ? '¡Alerta! Probablemente es una Agencia' : '¡Trato Directo! (Dueño)'}
                                            </h3>
                                            <p className={`mt-1 text-sm ${result.isAgent ? 'text-red-700' : 'text-green-700'}`}>
                                                {result.reasoning}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Datos Extraídos */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 border border-slate-100 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Título Inferido</p>
                                        <p className="font-semibold text-slate-800">{result.title}</p>
                                    </div>
                                    <div className="p-4 border border-slate-100 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Precio Detectado</p>
                                        <p className="font-semibold text-slate-800 text-xl">{result.price}</p>
                                    </div>
                                </div>

                                {/* Guion de Venta */}
                                <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                                            Guion Rompehielos Sugerido
                                        </div>
                                        <button 
                                            onClick={copyToClipboard}
                                            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm hover:border-indigo-200 hover:bg-indigo-50"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                            {copied ? '¡Copiado!' : 'Copiar Guion'}
                                        </button>
                                    </div>
                                    <div className="p-6 bg-white">
                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                                            {result.hookMessage}
                                        </p>
                                    </div>
                                    <div className="bg-indigo-50 px-6 py-3 text-sm text-indigo-700 font-medium flex items-center justify-between border-t border-indigo-100">
                                        <span>Pro tip: Envíalo por WhatsApp de inmediato para no enfriar el prospecto.</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 text-center p-12 text-slate-500">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Search className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">Esperando datos</h3>
                                <p className="max-w-sm">Utiliza el botón mágico desde Facebook Marketplace o pega el texto directamente para que la IA extraiga el perfil del vendedor.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
