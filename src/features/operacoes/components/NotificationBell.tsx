import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, AlertCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabaseTaskService } from '../services/db/SupabaseTaskService';
import type { Notification } from '../types/models';

export const NotificationBell: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const loadNotifications = async () => {
        if (!user?.email) return;

        try {
            // 1. Fetch ALL tasks assigned to user
            // We use listAll() but filter in memory for now as listByUser isn't in service public API yet, 
            // or better, we can assume listAll returns everything and we filter.
            // Actually, we should use a proper service method, but for now let's use what we have available or add a method.
            // Looking at previous context, we have incidentTaskService (which is supabaseTaskService).
            // It has listAll(). Let's fetch all and filter client-side for now to avoid modifying backend service yet, 
            // or if listAll is too heavy, we might need a query.
            // But let's check if we can filter by assigned_to.

            const allTasks = await supabaseTaskService.listAll();
            const myTasks = allTasks.filter(t => t.assigned_to === user.email);

            const generatedNotifications: Notification[] = [];

            myTasks.forEach(task => {
                // A. Overdue Check
                if (task.due_at && new Date(task.due_at) < new Date() && task.status !== 'Concluida') {
                    generatedNotifications.push({
                        id: `overdue-${task.id}`,
                        user_email: user.email!,
                        type: 'task_overdue',
                        title: 'Tarefa Vencida',
                        message: `A tarefa "${task.title}" venceu.`,
                        entity_type: 'task',
                        entity_id: task.incident_id, // We link to Incident as Task Detail isn't standalone
                        severity: 'danger',
                        created_at: task.due_at // Vencimento como data
                    });
                }

                // B. Newly Assigned (Pending/In Progress)
                if (task.status !== 'Concluida') {
                    generatedNotifications.push({
                        id: `assigned-${task.id}`,
                        user_email: user.email!,
                        type: 'task_assigned',
                        title: 'Tarefa Pendente',
                        message: `Você tem a tarefa "${task.title}" em aberto.`,
                        entity_type: 'task',
                        entity_id: task.incident_id,
                        severity: 'info',
                        created_at: task.created_at || new Date().toISOString()
                    });
                }
            });

            // Sort by date desc
            generatedNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setNotifications(generatedNotifications);
            setUnreadCount(generatedNotifications.length);

        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    useEffect(() => {
        loadNotifications();
        // Polling every minute
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [user]);

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

    const handleItemClick = (n: Notification) => {
        setIsOpen(false);
        if (n.entity_type === 'task' || n.entity_type === 'incident') {
            navigate(`/incidencias/${n.entity_id}`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'task_overdue': return <AlertCircle size={16} className="text-red-500" />;
            case 'task_assigned': return <Check size={16} className="text-blue-500" />;
            case 'incident_update': return <Info size={16} className="text-amber-500" />;
            default: return <Bell size={16} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-fade-in origin-top-right">
                    <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                        <h3 className="text-sm font-bold text-slate-700">Notificações</h3>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">
                                Nenhuma notificação.
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-50">
                                {notifications.map(n => (
                                    <li
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-1 block">
                                                    {new Date(n.created_at).toLocaleDateString()}
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
