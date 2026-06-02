import { NavLink, useNavigate } from 'react-router-dom';
import { 
    Briefcase,
    CheckSquare,
    ChevronLeft, 
    ChevronRight, 
    ArrowLeft,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/shared/rbac/RoleGate';
import type { AppRole } from '@/shared/rbac/roles';
import { useSidebar } from '@/app/providers/SidebarProvider';

type SidebarLink = {
    to: string;
    label: string;
    icon: React.ElementType;
    roles: AppRole[];
};

export function ComercialSidebar() {
    const { isExpanded, toggleSidebar } = useSidebar();
    const navigate = useNavigate();

    const links: SidebarLink[] = [
        { to: '/comercial/estimaciones', label: 'Estimaciones', icon: Briefcase, roles: ['admin', 'commercial'] },
        { to: '/comercial/leads', label: 'Leads de Marketing', icon: Users, roles: ['admin', 'commercial'] },
        { to: '/comercial/tarefas', label: 'Tarefas', icon: CheckSquare, roles: ['admin', 'commercial'] },
    ];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-10 hidden flex-col bg-slate-900 text-slate-300 border-r border-slate-800 sm:flex transition-all duration-300",
            isExpanded ? "w-64" : "w-20"
        )}>
            <div className={cn("flex h-[72px] items-center border-b border-slate-800", isExpanded ? "px-6" : "justify-center px-0")}>
                <NavLink to="/comercial" className="flex items-center gap-3 font-semibold text-white transition-opacity hover:opacity-90">
                    <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded bg-yellow-500 font-bold text-white text-lg leading-none">
                        CM
                    </div>
                    {isExpanded && <span className="text-xl tracking-tight">Comercial</span>}
                </NavLink>
            </div>
            
            <div className="px-3 mt-4 mb-2">
                <button 
                    onClick={() => navigate('/hub')}
                    className={cn(
                        "flex items-center justify-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700",
                        isExpanded ? "w-full gap-2 px-4" : "w-12 mx-auto"
                    )}
                    title={!isExpanded ? "Voltar para o Hub" : undefined}
                >
                    <ArrowLeft size={16} className="shrink-0" />
                    {isExpanded && <span>Voltar para o Hub</span>}
                </button>
            </div>
            
            <div className="flex-1 pb-6 pt-2 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <div>
                    {isExpanded && (
                        <div className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Gestão Comercial
                        </div>
                    )}
                    <nav className="grid items-start px-2 text-sm font-medium gap-1">
                        {links.map(({ to, label, icon: Icon, roles }) => (
                            <RoleGate key={to} allow={roles}>
                                <NavLink
                                    to={to}
                                    title={!isExpanded ? label : undefined}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center rounded-md transition-all outline-none',
                                            isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3 mb-1 mx-auto w-12',
                                            isActive
                                                ? 'bg-yellow-500/10 text-yellow-400 font-semibold border border-yellow-500/20'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                        )
                                    }
                                >
                                    <Icon className="h-[18px] w-[18px] shrink-0" />
                                    {isExpanded && <span>{label}</span>}
                                </NavLink>
                            </RoleGate>
                        ))}
                    </nav>
                </div>

                <div className="p-4 mt-auto">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center text-slate-400 hover:text-white transition-colors p-2 rounded-md hover:bg-slate-800",
                            isExpanded ? "justify-end w-full" : "justify-center w-full mx-auto"
                        )}
                        title={isExpanded ? 'Recolher Menu' : 'Expandir Menu'}
                    >
                        {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
