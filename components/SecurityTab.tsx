import React, { useState } from 'react';
import { UserRole } from '../types';
import { propertyService, supabase } from '../services/supabase';

interface SecurityTabProps {
    userRoles: UserRole[];
    currentUserId?: string;
    onRefresh: () => void;
    setToast: (t: { message: string; type: 'success' | 'error' } | null) => void;
}

export default function SecurityTab({ userRoles, currentUserId, onRefresh, setToast }: SecurityTabProps) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleInviteUser = async () => {
        if (!inviteEmail || !inviteEmail.includes('@')) {
            setInviteResult({ type: 'error', message: 'Por favor ingresa un correo electrónico válido.' });
            return;
        }
        setIsInviting(true);
        setInviteResult(null);
        try {
            const session = (await supabase?.auth.getSession())?.data?.session;
            const token = session?.access_token;
            const response = await fetch('/.netlify/functions/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: inviteEmail }),
            });
            const result = await response.json();
            if (response.ok) {
                setInviteResult({ type: 'success', message: `✅ Invitación enviada con éxito a ${inviteEmail}` });
                setInviteEmail('');
                onRefresh();
            } else {
                setInviteResult({ type: 'error', message: `Error: ${result.error}` });
            }
        } catch {
            setInviteResult({ type: 'error', message: 'Error de conexión. Verifica que el servidor esté activo.' });
        }
        setIsInviting(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-serif font-bold text-slate-900">Control de Accesos</h1>
                <p className="text-slate-500">Gestiona los permisos de los asesores en el sistema.</p>
            </div>
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Invitar Nuevo Asesor</h2>
                <p className="text-sm text-slate-500 mb-6">
                    Introduce el correo corporativo del asesor. Le llegará un correo de bienvenida con el logo de Lago Realty y un enlace para establecer su contraseña.
                </p>
                <div className="flex gap-3 mb-4">
                    <input
                        type="email"
                        placeholder="asesor@lagorealty.com.ve"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-green/20 text-sm font-medium"
                    />
                    <button
                        onClick={handleInviteUser}
                        disabled={isInviting || !inviteEmail}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                        {isInviting && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isInviting ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                </div>
                {inviteResult && (
                    <div className={`p-4 rounded-xl text-sm font-medium ${inviteResult.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {inviteResult.message}
                    </div>
                )}
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Usuarios Activos en el Sistema</h2>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Rol</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Ingreso</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {userRoles.map((role: UserRole) => (
                                <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{role.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${role.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-brand-green/10 text-brand-green'}`}>
                                            {role.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(role.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        {(role as any).user_id !== currentUserId && (
                                            <div className="flex justify-end gap-2">
                                                {role.role !== 'superadmin' ? (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(`¿Estás seguro de promover a ${role.email} a SUPERADMIN?`)) return;
                                                            setToast({ message: 'Promoviendo...', type: 'success' });
                                                            const res = await propertyService.promoteUser(role.id);
                                                            if (res.success) {
                                                                setToast({ message: 'Promovido a Superadmin', type: 'success' });
                                                                onRefresh();
                                                            } else {
                                                                setToast({ message: 'Error al promover: ' + res.error, type: 'error' });
                                                            }
                                                        }}
                                                        className="px-3 py-1 text-xs font-bold text-brand-green border border-brand-green/30 hover:bg-brand-green hover:text-white rounded-lg transition-colors"
                                                    >
                                                        ⬆ Promover
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(`¿Degradar a ${role.email} de Superadmin a Asesor?`)) return;
                                                            setToast({ message: 'Degradando...', type: 'success' });
                                                            const res = await propertyService.demoteUser(role.id);
                                                            if (res.success) {
                                                                setToast({ message: 'Degradado a Asesor', type: 'success' });
                                                                onRefresh();
                                                            } else {
                                                                setToast({ message: 'Error al degradar: ' + res.error, type: 'error' });
                                                            }
                                                        }}
                                                        className="px-3 py-1 text-xs font-bold text-amber-600 border border-amber-500/30 hover:bg-amber-500 hover:text-white rounded-lg transition-colors"
                                                    >
                                                        ⬇ Degradar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        const userId = (role as any).user_id;
                                                        if (!userId) {
                                                            setToast({ message: 'Este usuario no tiene un ID asociado', type: 'error' });
                                                            return;
                                                        }
                                                        if (!confirm(`¿Estás seguro de ELIMINAR a ${role.email}?`)) return;
                                                        setToast({ message: 'Eliminando...', type: 'success' });
                                                        const res = await propertyService.deleteAuthUser(userId);
                                                        if (res.success) {
                                                            setToast({ message: 'Usuario eliminado exitosamente', type: 'success' });
                                                            onRefresh();
                                                        } else {
                                                            setToast({ message: 'Error al eliminar: ' + res.error, type: 'error' });
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-xs font-bold text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
