import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, AlertCircle, Info, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../../shared/supabase/client';
import { toast } from 'sonner';

interface DbNotification {
    id: string;
    title: string;
    message: string;
    type: 'date_change' | 'new_order' | 'task_blocked' | 'incident';
    severity: 'info' | 'warning' | 'critical';
    link_url?: string;
    read_at?: string;
    created_at: string;
}

export const NotificationBell: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<DbNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const getClient = () => {
        return (supabase as any).schema ? (supabase as any).schema('core_common') : supabase;
    };

    const loadNotifications = async () => {
        if (!user?.id) return;

        try {
            const client = getClient();
            const { data, error } = await client
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const list = (data || []) as DbNotification[];
            setNotifications(list);
            setUnreadCount(list.filter(n => !n.read_at).length);
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    useEffect(() => {
        loadNotifications();

        if (!user?.id) return;

        // Request browser push notification permission if default
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }

        // Subscrição em tempo real para novas notificações
        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'core_common',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    loadNotifications();

                    if (payload.new) {
                        const newNotif = payload.new as DbNotification;

                        // 1. In-app Toast Banner
                        toast.info(newNotif.title || 'Nova Notificação', {
                            description: newNotif.message,
                            duration: 8000,
                            action: newNotif.link_url ? {
                                label: 'Ver Tarefa',
                                onClick: () => navigate(newNotif.link_url!)
                            } : undefined
                        });

                        // 2. Windows Native Desktop Push Notification
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                            try {
                                const notif = new Notification(newNotif.title || 'MCS - Nova Tarefa', {
                                    body: newNotif.message,
                                    icon: '/favicon.ico',
                                    tag: newNotif.id
                                });
                                notif.onclick = () => {
                                    window.focus();
                                    if (newNotif.link_url) navigate(newNotif.link_url);
                                };
                            } catch (e) {
                                console.warn('Could not launch desktop notification', e);
                            }
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = async (n: DbNotification) => {
        setIsOpen(false);
        
        if (!n.read_at) {
            try {
                const client = getClient();
                await client
                    .from('notifications')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', n.id);
                loadNotifications();
            } catch (err) {
                console.error("Failed to mark notification as read", err);
            }
        }

        if (n.link_url) {
            navigate(n.link_url);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.id) return;
        try {
            const client = getClient();
            await client
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .is('read_at', null);
            loadNotifications();
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <AlertCircle size={16} className="text-red-500" />;
            case 'warning': return <AlertCircle size={16} className="text-amber-500" />;
            case 'info': return <Info size={16} className="text-blue-500" />;
            default: return <Bell size={16} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Torre de Controle - Alertas"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-50 animate-fade-in origin-top-right">
                    <div className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-lg">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Torre de Controle</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                <CheckSquare size={12} />
                                Lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">
                                Nenhuma notificação ativa.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map(n => (
                                    <li
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className={`p-3 cursor-pointer transition-colors ${!n.read_at ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {getIcon(n.severity)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-sm font-semibold ${!n.read_at ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {n.title}
                                                    </p>
                                                    {!n.read_at && (
                                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                                                    {new Date(n.created_at).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
