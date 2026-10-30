import { NavLink, useNavigate } from 'react-router-dom';
import { 
    Briefcase,
    CheckSquare,
    ChevronLeft, 
    ChevronRight, 
    ArrowLeft,
    Users,
    Sliders,
    Kanban,
    Mail,
    Zap,
    BarChart3,
    Award,
    PhoneCall,
    Layers,
    CalendarDays,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/shared/rbac/RoleGate';
import type { AppRole } from '@/shared/rbac/roles';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useComercialLanguage } from '../leads/utils/comercialI18n';

type SidebarLink = {
    to: string;
    label: string;
    icon: React.ElementType;
    roles: AppRole[];
    badge?: number;
};

type SidebarSection = {
    key: string;
    title: string;
    links: SidebarLink[];
};

export function ComercialSidebar() {
    const { isExpanded, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const { t, tr } = useComercialLanguage();
    const { selectedEmpresaId } = useEmpresa();

    const { data: pendingCount = 0 } = useQuery({
        queryKey: ['aprovacoes-pendentes-count', selectedEmpresaId],
        queryFn: async () => {
            if (!selectedEmpresaId) return 0;
            let q = supabase
                .schema('core_comercial')
                .from('estimaciones')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'review');
            if (selectedEmpresaId !== 'all') {
                q = q.eq('empresa_id', selectedEmpresaId);
            }
            const { count, error } = await q;
            if (error) return 0;
            return count || 0;
        },
        enabled: !!selectedEmpresaId,
        refetchInterval: 30000,
    });

    const sections: SidebarSection[] = [
        {
            key: 'gestaoComercial',
            title: tr('Gestão Comercial', 'Gestión Comercial', 'Gestion Commerciale'),
            links: [
                {
                    to: '/comercial/estimaciones',
                    label: tr('Orçamentos / Estimativa', 'Presupuestos / Estimaciones', 'Devis / Estimations'),
                    icon: Briefcase,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/aprovacoes',
                    label: tr('Mesa de Aprovações', 'Mesa de Aprobaciones', 'Table d\'Approbations'),
                    icon: ShieldCheck,
                    roles: ['admin'],
                    badge: pendingCount,
                },
                {
                    to: '/comercial/portfolio',
                    label: tr('Portfólio & Referências', 'Portafolio y Referencias', 'Portfolio & Références'),
                    icon: Award,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/tarefas',
                    label: tr('Tarefas', 'Tareas', 'Tâches'),
                    icon: CheckSquare,
                    roles: ['admin', 'commercial', 'rh'],
                },
            ]
        },
        {
            key: 'marketing',
            title: tr('Marketing', 'Marketing', 'Marketing'),
            links: [
                {
                    to: '/comercial/leads',
                    label: tr('Leads de Marketing', 'Leads de Marketing', 'Leads Marketing'),
                    icon: Users,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/prospector',
                    label: tr('Máquina de Leads (IA)', 'Máquina de Leads (IA)', 'Machine à Leads (IA)'),
                    icon: Zap,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/kanban',
                    label: tr('Funil de Vendas', 'Embudo de Ventas', 'Entonnoir de Ventes'),
                    icon: Kanban,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/campanhas',
                    label: tr('Campanhas de Marketing', 'Campañas de Marketing', 'Campagnes Marketing'),
                    icon: Mail,
                    roles: ['admin', 'commercial', 'rh'],
                },
            ]
        },
        {
            key: 'powerDialer',
            title: tr('Power Dialer (SDR)', 'Power Dialer (SDR)', 'Power Dialer (SDR)'),
            links: [
                {
                    to: '/comercial/discador',
                    label: tr('Cockpit Discador', 'Cockpit Discador', 'Cockpit d\'Appels'),
                    icon: PhoneCall,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/discador/agenda',
                    label: tr('Agenda & Retornos', 'Agenda y Retornos', 'Agenda & Rappels'),
                    icon: CalendarDays,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/discador/trabalhos',
                    label: tr('Trabalhos & Filas', 'Trabajos y Colas', 'Travaux & Files'),
                    icon: Layers,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/discador/supervisao',
                    label: tr('Supervisão & KPIs', 'Supervisión y KPIs', 'Supervision & KPIs'),
                    icon: BarChart3,
                    roles: ['admin', 'commercial', 'rh'],
                },
                {
                    to: '/comercial/discador/operadores',
                    label: tr('Operadores & Scripts', 'Operadores y Scripts', 'Opérateurs & Scripts'),
                    icon: Users,
                    roles: ['admin', 'commercial', 'rh'],
                },
            ]
        },
        {
            key: 'analises',
            title: tr('Análises', 'Análisis', 'Analyses'),
            links: [
                {
                    to: '/comercial/analises',
                    label: tr('Análises & Simulações', 'Análisis y Simulaciones', 'Analyses et Simulations'),
                    icon: BarChart3,
                    roles: ['admin', 'commercial', 'rh'],
                },
            ]
        },
        {
            key: 'settings',
            title: tr('Configuração', 'Configuración', 'Configuration'),
            links: [
                {
                    to: '/comercial/configuracion',
                    label: tr('Configurações', 'Configuración', 'Paramètres'),
                    icon: Sliders,
                    roles: ['admin', 'rh'],
                },
            ]
        }
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
                    {isExpanded && <span className="text-xl tracking-tight">{tr('Comercial', 'Comercial', 'Commercial')}</span>}
                </NavLink>
            </div>
            
            <div className="px-3 mt-4 mb-2">
                <button 
                    onClick={() => navigate('/hub')}
                    className={cn(
                        "flex items-center justify-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700",
                        isExpanded ? "w-full gap-2 px-4" : "w-12 mx-auto"
                    )}
                    title={!isExpanded ? tr('Voltar ao Hub', 'Volver al Hub', 'Retour au Hub') : undefined}
                >
                    <ArrowLeft size={16} className="shrink-0" />
                    {isExpanded && <span>{tr('Voltar ao Hub', 'Volver al Hub', 'Retour au Hub')}</span>}
                </button>
            </div>
            
            <div className="flex-1 pb-6 pt-2 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <div className="space-y-4">
                    {sections.map((section, sectionIdx) => (
                        <div key={section.key} className={cn(sectionIdx > 0 && "pt-2 border-t border-slate-800/60")}>
                            {isExpanded ? (
                                <div className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {section.title}
                                </div>
                            ) : sectionIdx > 0 && (
                                <div className="mx-4 my-2 border-t border-slate-800/80" />
                            )}
                            <nav className="grid items-start px-2 text-sm font-medium gap-1">
                                {section.links.map(({ to, label, icon: Icon, roles, badge }) => (
                                    <RoleGate key={to} allow={roles}>
                                        <NavLink
                                            to={to}
                                            title={!isExpanded ? label : undefined}
                                            className={({ isActive }) =>
                                                cn(
                                                    'flex items-center rounded-md transition-all outline-none relative',
                                                    isExpanded ? 'gap-3 px-3 py-2.5 justify-between' : 'justify-center p-3 mb-1 mx-auto w-12',
                                                    isActive
                                                        ? 'bg-yellow-500/10 text-yellow-400 font-semibold border border-yellow-500/20'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                                )
                                            }
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-[18px] w-[18px] shrink-0" />
                                                {isExpanded && <span>{label}</span>}
                                            </div>
                                            {badge !== undefined && badge > 0 && (
                                                <span className={cn(
                                                    "bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center font-mono",
                                                    isExpanded ? "px-1.5 py-0.2" : "absolute top-1 right-1 h-4 w-4 text-[9px]"
                                                )}>
                                                    {badge}
                                                </span>
                                            )}
                                        </NavLink>
                                    </RoleGate>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                <div className="p-4 mt-auto">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center text-slate-400 hover:text-white transition-colors p-2 rounded-md hover:bg-slate-800",
                            isExpanded ? "justify-end w-full" : "justify-center w-full mx-auto"
                        )}
                        title={isExpanded ? t('comercial.sidebar.collapse') : t('comercial.sidebar.expand')}
                    >
                        {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
