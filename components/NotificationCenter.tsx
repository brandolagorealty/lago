import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, User as UserIcon, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import { propertyService, supabase } from '../services/supabase';
import { LagoNotification } from '../types';

interface NotificationCenterProps {
    onNavigate: (tab: string) => void;
    direction?: 'up' | 'down';
    align?: 'left' | 'right' | 'center';
}

export default function NotificationCenter({ onNavigate, direction = 'down', align = 'right' }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<LagoNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize & Fetch data
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                loadNotifications();
            }
        };
        init();

        // Click outside to close
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!userId) return;

        const channel = propertyService.subscribeToNotifications(userId, (payload) => {
            console.log('Realtime notification:', payload);
            if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new as LagoNotification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as LagoNotification : n));
            }
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [userId]);

    // Recalculate unread count when notifications change
    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.is_read).length);
    }, [notifications]);

    const loadNotifications = async () => {
        const data = await propertyService.getNotifications(50);
        setNotifications(data);
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger the click on the notification item
        const success = await propertyService.markNotificationAsRead(id);
        if (success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const handleMarkAllAsRead = async () => {
        const success = await propertyService.markAllNotificationsAsRead();
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const handleNotificationClick = async (notification: LagoNotification) => {
        if (!notification.is_read) {
            await propertyService.markNotificationAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }
        
        if (notification.link_tab) {
            onNavigate(notification.link_tab);
            setIsOpen(false);
        }
    };

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Hace un momento';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Hace ${diffInHours} h`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Ayer';
        if (diffInDays < 7) return `Hace ${diffInDays} días`;
        
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'task_assigned':
            case 'task_updated':
                return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
            case 'new_lead':
                return <UserIcon className="w-5 h-5 text-green-500" />;
            case 'property_status':
                return <Home className="w-5 h-5 text-purple-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                title="Notificaciones"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 ring-2 ring-[#1A1A1A] text-[9px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 opacity-50 animate-ping"></span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`absolute w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in duration-200 ${
                    direction === 'up' 
                        ? 'bottom-full mb-2 slide-in-from-bottom-2' 
                        : 'top-full mt-2 slide-in-from-top-2'
                } ${
                    align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
                }`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            Notificaciones
                            {unreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">
                                    {unreadCount} nuevas
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs font-medium text-slate-500 hover:text-brand-green transition-colors flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Marcar leídas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-white">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                    <Bell className="w-6 h-6 text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-600">Todo al día</p>
                                <p className="text-xs text-slate-400 mt-1">No tienes notificaciones pendientes.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`flex gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                                            !notif.is_read ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        <div className="shrink-0 mt-1">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                {notif.title}
                                            </p>
                                            {notif.body && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {notif.body}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                {getRelativeTime(notif.created_at)}
                                            </div>
                                        </div>
                                        {!notif.is_read && (
                                            <div className="shrink-0 flex flex-col items-end justify-between">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <button
                                                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="Marcar como leída"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
