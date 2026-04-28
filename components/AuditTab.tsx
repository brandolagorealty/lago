import React, { useState } from 'react';
import { AuditLog } from '../types';
import { FileText, UserCheck, Edit3, PlusCircle, Trash2, LogIn } from 'lucide-react';

interface AuditTabProps {
    auditLogs: AuditLog[];
}

const PAGE_SIZE = 20;

export default function AuditTab({ auditLogs }: AuditTabProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = Math.ceil(auditLogs.length / PAGE_SIZE);
    const paginatedLogs = auditLogs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    
    const getTableNameReadable = (tableName: string) => {
        const map: Record<string, string> = {
            'properties': 'Propiedad',
            'leads': 'Prospecto',
            'lago_tasks': 'Tarea',
            'user_roles': 'Rol de Usuario',
            'auth': 'Sistema',
            'tasks': 'Tarea'
        };
        return map[tableName] || tableName;
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'INSERT': return <PlusCircle className="w-5 h-5 text-emerald-500" />;
            case 'UPDATE': return <Edit3 className="w-5 h-5 text-blue-500" />;
            case 'DELETE': return <Trash2 className="w-5 h-5 text-red-500" />;
            case 'LOGIN': return <LogIn className="w-5 h-5 text-purple-500" />;
            default: return <FileText className="w-5 h-5 text-slate-400" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'INSERT': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
            case 'UPDATE': return 'bg-blue-50 border-blue-100 text-blue-700';
            case 'DELETE': return 'bg-red-50 border-red-100 text-red-700';
            case 'LOGIN': return 'bg-purple-50 border-purple-100 text-purple-700';
            default: return 'bg-slate-50 border-slate-200 text-slate-700';
        }
    };

    const renderDetails = (log: AuditLog) => {
        if (log.action === 'LOGIN') {
            return <span className="text-sm text-slate-600">Inició sesión en la plataforma.</span>;
        }

        if (log.action === 'INSERT') {
            let title = '';
            if (log.new_data?.title) title = `"${log.new_data.title}"`;
            else if (log.new_data?.name) title = `"${log.new_data.name}"`;
            else if (log.new_data?.email) title = `"${log.new_data.email}"`;
            
            return <span className="text-sm text-slate-600">Creó un nuevo registro {title} en <strong>{getTableNameReadable(log.table_name)}</strong>.</span>;
        }

        if (log.action === 'DELETE') {
            let title = '';
            if (log.old_data?.title) title = `"${log.old_data.title}"`;
            else if (log.old_data?.name) title = `"${log.old_data.name}"`;
            else if (log.old_data?.email) title = `"${log.old_data.email}"`;

            return <span className="text-sm text-slate-600">Eliminó el registro {title} de <strong>{getTableNameReadable(log.table_name)}</strong>.</span>;
        }

        if (log.action === 'UPDATE') {
            if (!log.old_data || !log.new_data) {
                return <span className="text-sm text-slate-600">Actualizó un registro en <strong>{getTableNameReadable(log.table_name)}</strong>.</span>;
            }

            const changes: string[] = [];
            
            // Comparar campos
            for (const key in log.new_data) {
                const oldVal = log.old_data[key];
                const newVal = log.new_data[key];

                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    // Ignorar campos técnicos de auditoría
                    if (key === 'updated_at' || key === 'created_at') continue;
                    
                    // Manejo especial para notas
                    if (key === 'notes' && Array.isArray(newVal)) {
                        changes.push(`Añadió un nuevo comentario o nota de seguimiento`);
                    } else if (key === 'status') {
                        changes.push(`Cambió el estado de "${oldVal || 'vacío'}" a "${newVal}"`);
                    } else if (key === 'is_published') {
                        changes.push(newVal ? `Publicó el registro haciéndolo visible` : `Ocultó el registro (Borrador)`);
                    } else if (key === 'assignees') {
                        changes.push(`Actualizó los responsables asignados`);
                    } else {
                        changes.push(`Modificó el campo "${key}"`);
                    }
                }
            }

            let title = '';
            if (log.new_data?.title) title = `"${log.new_data.title}"`;
            else if (log.new_data?.name) title = `"${log.new_data.name}"`;

            if (changes.length === 0) {
                return <span className="text-sm text-slate-600">Actualizó {title} en <strong>{getTableNameReadable(log.table_name)}</strong> sin cambios visibles.</span>;
            }

            return (
                <div className="text-sm text-slate-600 space-y-2">
                    <p>Actualizó <strong>{getTableNameReadable(log.table_name)}</strong> {title}:</p>
                    <ul className="list-disc pl-5 text-sm text-slate-500 space-y-1 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {changes.map((change, i) => (
                            <li key={i}>{change}</li>
                        ))}
                    </ul>
                </div>
            );
        }

        return <span className="text-sm text-slate-600">Acción general del sistema.</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900">Registro de Actividad</h1>
                    <p className="text-slate-500">Historial inalterable de cada acción, edición y comentario en la plataforma.</p>
                </div>
                <div className="bg-brand-green/10 text-brand-green px-4 py-2 rounded-xl text-sm font-bold border border-brand-green/20 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Nivel de Seguridad: Máximo
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                    {auditLogs.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 text-slate-200 mb-4" />
                            <p className="text-slate-500 font-medium text-lg">El registro de actividad está vacío.</p>
                            <p className="text-slate-400 text-sm mt-1">Las acciones de los asesores aparecerán aquí en tiempo real.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {paginatedLogs.map((log: AuditLog) => (
                                <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors flex gap-6">
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${getActionColor(log.action)} shadow-sm`}>
                                            {getActionIcon(log.action)}
                                        </div>
                                        <div className="w-px h-full bg-slate-100 mt-4"></div>
                                    </div>
                                    
                                    <div className="flex-1 pb-2">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 text-base">{log.user_email || 'Sistema'}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full shrink-0">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-3">
                                            {renderDetails(log)}
                                        </div>
                                        
                                        {log.record_id && (
                                            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-slate-300">
                                                <span>ID Ref:</span>
                                                <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{log.record_id}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-sm text-slate-500 font-medium">
                        Mostrando {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, auditLogs.length)} de <strong>{auditLogs.length}</strong> registros
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            ← Anterior
                        </button>
                        <span className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
