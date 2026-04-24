import React, { useState, useEffect } from 'react';
import { LagoTask, TaskStatus, Agent } from '../types';
import { propertyService, supabase } from '../services/supabase';
import { Plus, Search, Layout, List, Calendar, User, Clock, CheckCircle2, MoreHorizontal, X, Trash2 } from 'lucide-react';

interface TasksModuleProps {
    currentUserRole: string;
}

export default function TasksModule({ currentUserRole }: TasksModuleProps) {
    const [tasks, setTasks] = useState<LagoTask[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'board' | 'list'>('board');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<LagoTask | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [taskToDelete, setTaskToDelete] = useState<LagoTask | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<LagoTask>>({
        title: '',
        description: '',
        link: '',
        status: 'todo',
        assignee_ids: [],
        due_date: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const userSession = await supabase.auth.getSession();
                if (userSession.data.session) {
                    setCurrentUserId(userSession.data.session.user.id);
                }

                const [tasksData, agentsData] = await Promise.all([
                    propertyService.getTasks(),
                    propertyService.getAgents()
                ]);
                setTasks(tasksData);
                setAgents(agentsData);
            } catch (error) {
                console.error("Error loading tasks data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const columns: { id: TaskStatus; title: string; color: string }[] = [
        { id: 'todo', title: 'POR HACER', color: 'border-slate-200 bg-slate-50' },
        { id: 'in_progress', title: 'EN CURSO', color: 'border-blue-200 bg-blue-50/50' },
        { id: 'review', title: 'EN REVISIÓN', color: 'border-amber-200 bg-amber-50/50' },
        { id: 'done', title: 'FINALIZADO ✓', color: 'border-emerald-200 bg-emerald-50/50' }
    ];

    const getAgent = (id?: string) => agents.find(a => a.id === id);

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
        
        // Make the drag image slightly transparent
        setTimeout(() => {
            const el = document.getElementById(`task-${taskId}`);
            if (el) el.classList.add('opacity-50');
        }, 0);
    };

    const handleDragEnd = (taskId: string) => {
        const el = document.getElementById(`task-${taskId}`);
        if (el) el.classList.remove('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessario para permitir el drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Optimistic update
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, status: newStatus } : t
        ));

        // API update
        const { success } = await propertyService.updateTask(taskId, { status: newStatus });
        if (!success) {
            // Revert on error
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: task.status } : t
            ));
            alert("Error al mover la tarea.");
        } else {
            // Notificar estado nuevo vía WhatsApp
            if (task.assignee_ids && task.assignee_ids.length > 0) {
                const session = await supabase.auth.getSession();
                const accessToken = session.data.session?.access_token;
                if (accessToken) {
                    fetch('/.netlify/functions/task-updated-notify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({ taskId: task.id, newStatus: newStatus }),
                    }).catch(err => console.warn('[Notify Update] failed:', err));
                }
            }
        }
    };

    // --- Form Handlers ---
    const handleOpenModal = (task?: LagoTask) => {
        if (task) {
            setEditingTask(task);
            setFormData({
                title: task.title,
                description: task.description || '',
                link: task.link || '',
                status: task.status,
                assignee_ids: task.assignee_ids || [],
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
            });
        } else {
            setEditingTask(null);
            setFormData({
                title: '',
                description: '',
                link: '',
                status: 'todo',
                assignee_ids: [],
                due_date: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveTask = async () => {
        if (!formData.title) return alert('El título es requerido');
        
        setIsSaving(true);
        try {
            const userSession = await supabase.auth.getSession();
            const uid = userSession.data.session?.user.id;

            const payload: any = {
                title: formData.title,
                status: formData.status || 'todo',
            };
            
            if (formData.description) payload.description = formData.description;
            if (formData.link) payload.link = formData.link;
            payload.assignee_ids = formData.assignee_ids || [];
            if (formData.due_date) payload.due_date = new Date(formData.due_date).toISOString();

            if (editingTask) {
                const { success, error } = await propertyService.updateTask(editingTask.id, payload);
                if (success) {
                    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload } : t));
                    setIsModalOpen(false);
                } else {
                    alert('Error al actualizar: ' + error);
                }
            } else {
                payload.assignor_id = uid;
                const { success, data, error } = await propertyService.createTask(payload);
                if (success && data) {
                    setTasks(prev => [...prev, data]);
                    setIsModalOpen(false);

                    // 🔔 Disparar notificación (Google Calendar + WhatsApp) de forma asíncrona
                    if (data.id && data.assignee_ids && data.assignee_ids.length > 0) {
                        const session = await supabase.auth.getSession();
                        const accessToken = session.data.session?.access_token;
                        if (accessToken) {
                            fetch('/.netlify/functions/task-created-notify', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${accessToken}`,
                                },
                                body: JSON.stringify({ taskId: data.id, assigneeIds: data.assignee_ids }),
                            }).then(async res => {
                                const payload = await res.json();
                                console.log('[Notify]', payload);
                                if (payload.results?.whatsapp?.success === false) {
                                    alert('Error de WhatsApp devuelto por Meta:\\n' + JSON.stringify(payload.results.whatsapp.reason, null, 2));
                                }
                            }).catch(err => console.warn('[Notify] Background notification failed:', err));
                        }
                    }
                } else {
                    alert('Error al crear tarea (Supabase): ' + error);
                    console.error('Detalle error crear tarea:', error);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteTask = (task: LagoTask) => {
        setDeleteError(null);
        setTaskToDelete(task);
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);
        
        try {
            const { success, error } = await propertyService.deleteTask(taskToDelete.id);
            if (success) {
                setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
                setIsModalOpen(false);
                setTaskToDelete(null);
            } else {
                const errMsg = error || "Revise los permisos RLS en Supabase o inicie sesión nuevamente.";
                setDeleteError(errMsg);
                alert("⚠ Fallo la Eliminación: " + errMsg);
            }
        } catch (err: any) {
            const throwMsg = err.message || "Error inesperado al eliminar.";
            setDeleteError(throwMsg);
            alert("⚠ Error de Servidor: " + throwMsg);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Computed ---
    const filteredTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getDaysRemaining = (dueDateStr?: string) => {
        if (!dueDateStr) return null;
        const due = new Date(dueDateStr);
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return <span className="text-red-500 font-bold font-mono">Vencida hace {Math.abs(diffDays)}d</span>;
        if (diffDays === 0) return <span className="text-amber-500 font-bold font-mono">Vence hoy</span>;
        if (diffDays <= 3) return <span className="text-amber-500 font-medium font-mono">Quedan {diffDays}d</span>;
        return <span className="text-slate-500 font-mono">Quedan {diffDays}d</span>;
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando tablero...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar tareas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setView('board')}
                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${
                                view === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Layout className="w-4 h-4" /> Tablero
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${
                                view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <List className="w-4 h-4" /> Lista
                        </button>
                    </div>
                    
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green/90 transition-colors font-medium text-sm shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Crear
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {view === 'board' ? (
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start min-h-[500px]">
                    {columns.map(col => (
                        <div 
                            key={col.id} 
                            className={`flex flex-col min-w-[320px] w-80 rounded-xl border ${col.color} h-full max-h-[calc(100vh-250px)]`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="p-3 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-xl">
                                <h3 className="text-xs font-bold text-slate-600 tracking-wider">
                                    {col.title}
                                </h3>
                                <span className="bg-white/60 text-slate-500 text-xs py-0.5 px-2 rounded-full font-medium">
                                    {filteredTasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>
                            
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                                {filteredTasks.filter(t => t.status === col.id).map(task => {
                                    const assignee = getAgent(task.assignee_id);
                                    return (
                                        <div
                                            key={task.id}
                                            id={`task-${task.id}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={() => handleDragEnd(task.id)}
                                            onClick={() => handleOpenModal(task)}
                                            className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:ring-1 hover:ring-brand-green/50 transition-all cursor-pointer border border-slate-100 group relative"
                                        >
                                            <div className="flex justify-between items-start mb-2 pr-2">
                                                <p className="font-medium text-slate-900 leading-snug group-hover:text-brand-green transition-colors">
                                                    {task.title}
                                                </p>
                                            </div>
                                            
                                            {task.description && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                    {task.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-[10px] uppercase font-semibold">
                                                        {task.due_date ? getDaysRemaining(task.due_date) : 'Sin fecha'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {(currentUserRole === 'superadmin' || task.assignor_id === currentUserId) && (
                                                        <button 
                                                            onPointerDown={(e) => {
                                                                e.stopPropagation();
                                                                confirmDeleteTask(task);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-slate-400 hover:text-[#EFEFEF] hover:bg-[#1a1a1a] p-1.5 rounded-md transition-colors border border-transparent hover:border-[#1a1a1a]"
                                                            title="Eliminar tarea"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <div className="flex -space-x-2">
                                                        {task.assignee_ids && task.assignee_ids.length > 0 ? (
                                                            task.assignee_ids.map(id => {
                                                                const assignee = getAgent(id);
                                                                if (!assignee) return null;
                                                                return (
                                                                    <div key={id} className="relative group/avatar" title={assignee.name}>
                                                                        {assignee.avatar ? (
                                                                            <img src={assignee.avatar} className="w-7 h-7 rounded-full border border-slate-200 bg-slate-100 object-cover" />
                                                                        ) : (
                                                                            <div className="w-7 h-7 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-bold border border-white">
                                                                                {assignee.name.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400" title="Sin asignar">
                                                                <User className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                <button 
                                    onClick={() => {
                                        setFormData({ ...formData, status: col.id });
                                        handleOpenModal();
                                    }}
                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl transition-all font-medium"
                                >
                                    <Plus className="w-4 h-4" /> Añadir tarea
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <th className="px-6 py-4">Tarea</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Asignado</th>
                                <th className="px-6 py-4">Fecha Límite</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map(task => {
                                const statusCol = columns.find(c => c.id === task.status);
                                return (
                                    <tr 
                                        key={task.id} 
                                        onClick={() => handleOpenModal(task)}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-slate-900 group-hover:text-brand-green transition-colors">{task.title}</p>
                                            {task.description && <p className="text-xs text-slate-500 truncate max-w-md mt-1">{task.description}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${statusCol?.color} text-slate-700`}>
                                                {statusCol?.title}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2 items-center">
                                                {task.assignee_ids && task.assignee_ids.length > 0 ? (
                                                    task.assignee_ids.map(id => {
                                                        const assignee = getAgent(id);
                                                        if (!assignee) return null;
                                                        return (
                                                            <div key={id} className="relative group" title={assignee.name}>
                                                                {assignee.avatar ? (
                                                                    <img src={assignee.avatar} className="w-6 h-6 rounded-full object-cover border-2 border-white relative z-10 hover:z-20 transition-transform hover:scale-110" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold border-2 border-white relative z-10 hover:z-20 transition-transform hover:scale-110">
                                                                        {assignee.name.charAt(0)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">Sin asignar</span>
                                                )}
                                                {task.assignee_ids && task.assignee_ids.length > 0 && (
                                                    <span className="text-xs text-slate-500 font-medium ml-4">
                                                        {task.assignee_ids.length} asignado{task.assignee_ids.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                                {(currentUserRole === 'superadmin' || task.assignor_id === currentUserId) && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            confirmDeleteTask(task);
                                                        }}
                                                        className="text-slate-400 hover:text-[#EFEFEF] hover:bg-[#1a1a1a] p-1.5 rounded-md transition-colors border border-transparent hover:border-[#1a1a1a] ml-4"
                                                        title="Eliminar tarea"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Task Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden">
                        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-slate-900">{editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Título de la Tarea</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                    placeholder="Ej. Tomar fotos de Villa Dorada"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Asignar a</label>
                                    <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
                                        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asesores ({formData.assignee_ids?.length || 0})</span>
                                        </div>
                                        <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                                            {agents.map(a => {
                                                const isSelected = formData.assignee_ids?.includes(a.id);
                                                return (
                                                    <label key={a.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    assignee_ids: checked 
                                                                        ? [...(prev.assignee_ids || []), a.id]
                                                                        : (prev.assignee_ids || []).filter(id => id !== a.id)
                                                                }));
                                                            }}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            {a.avatar ? (
                                                                <img src={a.avatar} className="w-5 h-5 rounded-full" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{a.name.charAt(0)}</div>
                                                            )}
                                                            <span className="text-sm font-medium text-slate-700">{a.name} <span className="text-slate-400 font-normal">({a.role})</span></span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Estado</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                    >
                                        <option value="todo">Por Hacer</option>
                                        <option value="in_progress">En Curso</option>
                                        <option value="review">En Revisión</option>
                                        <option value="done">Finalizado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Fecha Límite (Deadline)</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={e => setFormData({...formData, due_date: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Enlace Remoto (Opcional)</label>
                                    <input
                                        type="url"
                                        value={formData.link}
                                        onChange={e => setFormData({...formData, link: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all resize-none"
                                    placeholder="Detalles sobre lo que hay que hacer..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-3xl">
                            {editingTask && (currentUserRole === 'superadmin' || editingTask.assignor_id === currentUserId) ? (
                                <button
                                    onClick={() => confirmDeleteTask(editingTask)}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-white hover:bg-red-500 hover:border-red-500 rounded-xl transition-all font-bold text-sm border border-red-200 shadow-sm"
                                    title="Eliminar tarea"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            ) : <div></div>}
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveTask}
                                    disabled={isSaving || !formData.title}
                                    className="px-6 py-2.5 rounded-xl font-bold bg-[#1a1a1a] text-white hover:bg-black disabled:opacity-50 transition-colors shadow-lg"
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar Tarea'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {taskToDelete && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Eliminar Tarea</h3>
                            <p className="text-center text-slate-500 mb-6">
                                ¿Estás seguro que deseas eliminar la tarea <span className="font-semibold text-slate-800">"{taskToDelete.title}"</span>? Esta acción no se puede deshacer.
                            </p>
                            
                            {deleteError && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                                    {deleteError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setTaskToDelete(null);
                                        setDeleteError(null);
                                    }}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteTask()}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 flex justify-center items-center"
                                >
                                    {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
