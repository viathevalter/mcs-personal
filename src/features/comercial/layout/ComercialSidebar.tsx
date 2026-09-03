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
    Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/shared/rbac/RoleGate';
import type { AppRole } from '@/shared/rbac/roles';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { useTranslation } from 'react-i18next';

type SidebarLink = {
    to: string;
    label: string;
    icon: React.ElementType;
    roles: AppRole[];
};

type SidebarSection = {
    titleKey: string;
    titleDefault: string;
    links: SidebarLink[];
};

export function ComercialSidebar() {
    const { isExpanded, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const sections: SidebarSection[] = [
        {
            titleKey: 'comercial.sidebar.gestaoComercial',
            titleDefault: 'Gestão Comercial',
            links: [
                { to: '/comercial/estimaciones', label: t('comercial.sidebar.estimaciones'), icon: Briefcase, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/portfolio', label: 'Portfólio & Referências', icon: Award, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/tarefas', label: t('comercial.sidebar.tasks'), icon: CheckSquare, roles: ['admin', 'commercial', 'rh'] },
            ]
        },
        {
            titleKey: 'comercial.sidebar.marketing',
            titleDefault: 'Marketing & Leads',
            links: [
                { to: '/comercial/leads', label: t('comercial.sidebar.leads'), icon: Users, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/prospector', label: t('comercial.sidebar.prospector') || 'Máquina de Leads (AI)', icon: Zap, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/kanban', label: t('comercial.sidebar.kanban') || 'Funil de Vendas', icon: Kanban, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/campanhas', label: t('comercial.sidebar.campaigns') || 'Campanhas de Marketing', icon: Mail, roles: ['admin', 'commercial', 'rh'] },
            ]
        },
        {
            titleKey: 'comercial.sidebar.powerDialer',
            titleDefault: 'Power Dialer (SDR)',
            links: [
                { to: '/comercial/discador', label: 'Cockpit Discador', icon: PhoneCall, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/discador/trabalhos', label: 'Trabalhos & Filas', icon: Layers, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/discador/supervisao', label: 'Supervisão & KPIs', icon: BarChart3, roles: ['admin', 'commercial', 'rh'] },
                { to: '/comercial/discador/operadores', label: 'Operadores & Scripts', icon: Users, roles: ['admin', 'commercial', 'rh'] },
            ]
        },
        {
            titleKey: 'comercial.sidebar.analises',
            titleDefault: 'Análises',
            links: [
                { to: '/comercial/analises', label: t('comercial.sidebar.analisesItem') || 'Análises & Simulações', icon: BarChart3, roles: ['admin', 'commercial', 'rh'] },
            ]
        },
        {
            titleKey: 'comercial.sidebar.settings',
            titleDefault: 'Sistema',
            links: [
                { to: '/comercial/configuracion', label: t('comercial.sidebar.settings'), icon: Sliders, roles: ['admin', 'rh'] },
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
                    {isExpanded && <span className="text-xl tracking-tight">{t('comercial.sidebar.title')}</span>}
                </NavLink>
            </div>
            
            <div className="px-3 mt-4 mb-2">
                <button 
                    onClick={() => navigate('/hub')}
                    className={cn(
                        "flex items-center justify-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700",
                        isExpanded ? "w-full gap-2 px-4" : "w-12 mx-auto"
                    )}
                    title={!isExpanded ? t('comercial.sidebar.backToHub') : undefined}
                >
                    <ArrowLeft size={16} className="shrink-0" />
                    {isExpanded && <span>{t('comercial.sidebar.backToHub')}</span>}
                </button>
            </div>
            
            <div className="flex-1 pb-6 pt-2 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <div className="space-y-4">
                    {sections.map((section, sectionIdx) => (
                        <div key={section.titleKey} className={cn(sectionIdx > 0 && "pt-2 border-t border-slate-800/60")}>
                            {isExpanded ? (
                                <div className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {t(section.titleKey, section.titleDefault)}
                                </div>
                            ) : sectionIdx > 0 && (
                                <div className="mx-4 my-2 border-t border-slate-800/80" />
                            )}
                            <nav className="grid items-start px-2 text-sm font-medium gap-1">
                                {section.links.map(({ to, label, icon: Icon, roles }) => (
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

