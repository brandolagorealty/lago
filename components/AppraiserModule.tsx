import React, { useState } from 'react';
import { marked } from 'marked';
import { Calculator, CheckCircle2, RotateCw, AlertTriangle, Building, MapPin, Ruler, BedDouble, Plus, Copy } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../services/supabase';
import { MARACAIBO_SECTORS } from '../constants/locations';

interface AppraiserResult {
    markdownReport: string;
    suggestedValue: {
        base: number;
        high: number;
        low: number;
    };
}

const AppraiserModule: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AppraiserResult | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState({
        ubicacion: '',
        superficie: '',
        distribucion: '',
        edad: '',
        estadoFisico: '',
        extras: {
            piscina: false,
            pozo: false,
            planta: false,
            marmol: false
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            extras: {
                ...formData.extras,
                [e.target.name as keyof typeof formData.extras]: e.target.checked
            }
        });
    };

    const handleCopy = () => {
        if (result?.markdownReport) {
            navigator.clipboard.writeText(result.markdownReport);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setIsLoading(true);

        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            
            const selectedExtras = Object.entries(formData.extras)
                .filter(([_, isChecked]) => isChecked)
                .map(([key]) => {
                    switch(key) {
                        case 'piscina': return 'Piscina';
                        case 'pozo': return 'Pozo de agua';
                        case 'planta': return 'Planta eléctrica';
                        case 'marmol': return 'Piso de mármol';
                        default: return key;
                    }
                }).join(', ');

            const payload = {
                ubicacion: formData.ubicacion,
                superficie: formData.superficie,
                distribucion: formData.distribucion,
                estado: `${formData.edad} años de antigüedad, estado: ${formData.estadoFisico}`,
                extras: selectedExtras || 'Ninguno'
            };

            const response = await fetch('/.netlify/functions/appraiser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${await token}` })
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            if (!response.ok) {
                const errorMsg = responseData.details ? `${responseData.error}: ${responseData.details}` : (responseData.error || 'Error al generar la tasación');
                throw new Error(errorMsg);
            }

            setResult(responseData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Calculator className="w-6 h-6" />
                    </div>
                    Tasador AI
                </h2>
                <p className="text-slate-500 mt-2 ml-15 text-lg">
                    Generador de avalúos impulsado por Gemini adaptado al mercado inmobiliario de Maracaibo.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* FORMULARIO */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full bg-orange-500"></div>
                        <h3 className="font-bold text-slate-800 text-lg">Datos de Inspección</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                Ubicación / Sector
                            </label>
                            <select
                                required
                                name="ubicacion"
                                value={formData.ubicacion}
                                onChange={handleChange}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium appearance-none"
                            >
                                <option value="" disabled>Seleccionar Sector...</option>
                                {MARACAIBO_SECTORS.map(sector => (
                                    <option key={sector} value={sector}>{sector}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-slate-400" />
                                Superficie (m²)
                            </label>
                            <input
                                required
                                name="superficie"
                                value={formData.superficie}
                                onChange={handleChange}
                                placeholder="Ej: 200m2 de construcción y 300m2 de terreno"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <BedDouble className="w-4 h-4 text-slate-400" />
                                Distribución
                            </label>
                            <input
                                required
                                name="distribucion"
                                value={formData.distribucion}
                                onChange={handleChange}
                                placeholder="Ej: 3 habitaciones, 3 baños, 2 puestos"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Building className="w-4 h-4 text-slate-400" />
                                    Edad (Años)
                                </label>
                                <select
                                    required
                                    name="edad"
                                    value={formData.edad}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium appearance-none"
                                >
                                    <option value="" disabled>Seleccionar</option>
                                    <option value="A estrenar">A estrenar (0)</option>
                                    {Array.from({ length: 100 }, (_, i) => i + 1).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                    Estado Físico
                                </label>
                                <select
                                    required
                                    name="estadoFisico"
                                    value={formData.estadoFisico}
                                    onChange={handleChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium appearance-none"
                                >
                                    <option value="" disabled>Seleccionar</option>
                                    <option value="Obra Gris">Obra Gris</option>
                                    <option value="Obra Blanca">Obra Blanca</option>
                                    <option value="Para Actualizar">Para Actualizar</option>
                                    <option value="Bien Conservado">Bien Conservado</option>
                                    <option value="Actualizado">Actualizado</option>
                                    <option value="Totalmente Nuevo / Lujo">Totalmente Nuevo / Lujo</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-slate-400" />
                                Extras Adicionales
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                                {[
                                    { id: 'piscina', label: 'Piscina' },
                                    { id: 'pozo', label: 'Pozo de Agua' },
                                    { id: 'planta', label: 'Planta Eléctrica' },
                                    { id: 'marmol', label: 'Piso de Mármol' }
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            name={item.id}
                                            checked={formData.extras[item.id as keyof typeof formData.extras]}
                                            onChange={handleCheckboxChange}
                                            className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500/20 border-slate-300"
                                        />
                                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex gap-2 items-center">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <RotateCw className="w-5 h-5 animate-spin" />
                                    Evaluando Mercado...
                                </>
                            ) : (
                                <>
                                    <Calculator className="w-5 h-5 text-orange-400" />
                                    Generar Tasación Pericial
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* RESULTADO */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {result ? (
                        <>
                            {/* CAJA DE PRECIOS */}
                            <div className="bg-white rounded-3xl p-6 md:p-8 border border-orange-100 shadow-xl shadow-orange-500/5 relative overflow-hidden animate-in zoom-in duration-500">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
                                
                                <h4 className="text-sm font-bold tracking-widest text-orange-500 uppercase mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Valores Estimados
                                </h4>
                                
                                <div className="flex flex-col items-center text-center mb-8">
                                    <span className="text-slate-400 font-medium mb-2">Valor Base Sugerido</span>
                                    <span className="text-6xl font-black text-slate-900 tracking-tighter">
                                        {formatCurrency(result.suggestedValue.base)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                        <span className="block text-sm text-slate-400 font-medium mb-1">Precio Oportunidad</span>
                                        <span className="block text-2xl font-bold text-slate-700">{formatCurrency(result.suggestedValue.low)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                        <span className="block text-sm text-slate-400 font-medium mb-1">Precio Optimista</span>
                                        <span className="block text-2xl font-bold text-slate-700">{formatCurrency(result.suggestedValue.high)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* INFORME MARKDOWN */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={handleCopy}
                                        className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 shadow-sm"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copiado' : 'Copiar Informe'}
                                    </button>
                                </div>
                                <div 
                                    className="p-8 prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-slate-600 prose-strong:text-slate-800"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(result.markdownReport) }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 p-8">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <Calculator className="w-10 h-10 text-slate-300" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-700 mb-2">Esperando datos</h4>
                            <p className="text-slate-500 max-w-sm">
                                Completa el formulario con los detalles del inmueble y presiona calcular. La IA cruzará la información para generar un reporte pericial.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppraiserModule;
