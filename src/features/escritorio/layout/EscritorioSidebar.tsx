import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Users, 
    Clock, 
    Palmtree, 
    Stethoscope, 
    FileSpreadsheet, 
    ShieldCheck, 
    ArrowLeft, 
    ChevronLeft, 
    ChevronRight,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/app/providers/SidebarProvider';

type EscritorioSidebarLink = {
    to: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
};

export const EscritorioSidebar: React.FC = () => {
    const { isExpanded, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();

    const links: EscritorioSidebarLink[] = [
        { 
            to: '/escritorio/dashboard', 
            label: 'Visión General', 
            icon: LayoutDashboard 
        },
        { 
            to: '/escritorio/colaboradores', 
            label: 'Gestión de Empleados', 
            icon: Users 
        },
        { 
            to: '/escritorio/ponto', 
            label: 'Control Horario y Fichajes', 
            icon: Clock 
        },
        { 
            to: '/escritorio/ferias', 
            label: 'Vacaciones (España)', 
            icon: Palmtree 
        },
        { 
            to: '/escritorio/ausencias', 
            label: 'Ausencias y Bajas', 
            icon: Stethoscope 
        },
        { 
            to: '/escritorio/pre-folha', 
            label: 'Pre-Nómina y Cierre', 
            icon: FileSpreadsheet 
        },
        { 
            to: '/escritorio/patrimonio', 
            label: 'Activos y Patrimonio', 
            icon: ShieldCheck 
        },
    ];

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-30 hidden flex-col bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 sm:flex transition-all duration-300 shadow-sm",
                isExpanded ? "w-64" : "w-20"
            )}
        >
            {/* Header & Logo */}
            <div className={cn("flex h-[72px] items-center border-b border-slate-200 dark:border-slate-800", isExpanded ? "px-6 justify-between" : "justify-center px-0")}>
                <div 
                    onClick={() => navigate('/escritorio/dashboard')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className={cn("h-8 overflow-hidden shrink-0", isExpanded ? "w-auto" : "w-8")}>
                        <img 
                            src="/logo_mcs_transparent.png" 
                            alt="MCS Logo" 
                            className={cn("h-8 max-w-none hidden dark:block", isExpanded ? "w-auto object-contain" : "w-auto object-cover object-left")} 
                        />
                        <img 
                            src="/logo_mcs_dark_text.png" 
                            alt="MCS Logo" 
                            className={cn("h-8 max-w-none block dark:hidden", isExpanded ? "w-auto object-contain" : "w-auto object-cover object-left")} 
                        />
                    </div>
                    {isExpanded && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                                RRHH & Patrimonio
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Volver al Hub */}
            <div className="px-3 mt-4 mb-2">
                <button 
                    onClick={() => navigate('/hub')}
                    className={cn(
                        "flex items-center justify-center py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white transition-all text-xs font-semibold border border-slate-700 shadow-sm group",
                        isExpanded ? "w-full gap-2 px-3" : "w-12 mx-auto"
                    )}
                    title={!isExpanded ? "Volver al Hub de Módulos" : undefined}
                >
                    <ArrowLeft size={16} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    {isExpanded && <span>Volver al Hub</span>}
                </button>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 pb-6 pt-2 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <div>
                    {isExpanded && (
                        <div className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Gestión Corporativa
                        </div>
                    )}
                    <nav className="grid items-start px-2 text-sm font-medium gap-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname.startsWith(link.to);

                            return (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    title={!isExpanded ? link.label : undefined}
                                    className={cn(
                                        'flex items-center rounded-lg transition-all outline-none text-sm',
                                        isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3 mb-1 mx-auto w-12',
                                        isActive
                                            ? 'bg-sky-600 text-white font-semibold shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                                    {isExpanded && <span className="truncate">{link.label}</span>}
                                    {isExpanded && link.badge && (
                                        <span className="ml-auto text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 px-1.5 py-0.5 rounded-full font-bold">
                                            {link.badge}
                                        </span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer Controls */}
                <div className="p-3 mt-auto border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800",
                            isExpanded ? "justify-end w-full" : "justify-center w-full mx-auto"
                        )}
                        title={isExpanded ? "Plegar menú" : "Desplegar menú"}
                    >
                        {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </aside>
    );
};
