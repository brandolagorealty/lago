import React, { useState } from 'react';
import { authService } from '../services/supabase';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Por favor, ingresa tu correo electrónico.');
            return;
        }

        setLoading(true);
        setError(null);
        
        // El enlace a donde redigirá el correo tras hacer clic
        const redirectTo = `${window.location.origin}/reset-password`;

        try {
            const { success: resetSuccess, error: resetError } = await authService.resetPassword(email, redirectTo);
            
            if (resetSuccess) {
                setSuccess(true);
            } else {
                setError(resetError || 'No se pudo enviar el correo de recuperación.');
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado del servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            {/* Logo */}
            <div className="mb-10 flex justify-center">
                <img 
                    src="https://scdztnzkzrvjgyefunkw.supabase.co/storage/v1/object/public/assets/logos/LAGO%20AZUL-01.png" 
                    alt="Lago Realty Logo" 
                    className="h-20 w-auto object-contain"
                />
            </div>

            <div className="bg-white rounded-3xl p-10 shadow-xl shadow-slate-200/50 w-full max-w-md border border-slate-100">
                <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Recuperar Contraseña</h1>
                <p className="text-slate-500 mb-8 text-sm">
                    Ingresa el correo electrónico asociado a tu cuenta de Lago Realty. Si está registrado, recibirás un enlace de acceso temporal.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl animate-shake">
                        {error}
                    </div>
                )}

                {success ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">¡Correo Enviado!</h2>
                        <p className="text-slate-500 text-sm mb-6">Revisa tu bandeja de entrada o la carpeta de spam para obtener el enlace de acceso.</p>
                        <Link 
                            to="/login"
                            className="block w-full bg-slate-900 text-white rounded-2xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                        >
                            Volver al Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Correo Electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-medium"
                                placeholder="tu-correo@ejemplo.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1a1a1a] text-[#EFEFEF] rounded-2xl py-4 font-bold text-sm uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading && (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {loading ? 'Enviando...' : 'Enviar enlace'}
                        </button>
                    </form>
                )}
            </div>
            
            {!success && (
                <div className="mt-8 text-center">
                    <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                        ← Volver a Iniciar Sesión
                    </Link>
                </div>
            )}
            
            <p className="mt-10 text-slate-400 text-xs">
                © 2025 Lago Realty. Seguridad y gestión inmobiliaria avanzada.
            </p>
        </div>
    );
};

export default ForgotPassword;
