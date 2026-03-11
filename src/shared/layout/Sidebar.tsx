import { NavLink } from 'react-router-dom';
import { Users, UserCog, LayoutDashboard, CarFront, FileText, ShieldAlert, ChevronLeft, ChevronRight, Clock, Wallet, BadgeDollarSign, Calculator, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoleGate } from '../rbac/RoleGate';
import type { AppRole } from '../rbac/roles';
import { useSidebar } from '@/app/providers/SidebarProvider';
import { useTranslation } from 'react-i18next';

type SidebarLink = {
    to: string;
    tKey: string;
    icon: React.ElementType;
    roles: AppRole[];
};

export function Sidebar() {
    const { isExpanded, toggleSidebar } = useSidebar();
    const { t } = useTranslation();

    const links: SidebarLink[] = [
        { to: '/dashboard', tKey: 'navigation.dashboard', icon: LayoutDashboard, roles: ['admin', 'rh', 'finance', 'commercial', 'user'] },
        { to: '/workers', tKey: 'navigation.workers', icon: Users, roles: ['admin', 'rh', 'commercial', 'user'] },
        { to: '/hours-control', tKey: 'Controle de Horas', icon: Clock, roles: ['admin', 'rh', 'commercial'] },
        { to: '/seguridade', tKey: 'navigation.socialSecurity', icon: ShieldAlert, roles: ['admin', 'rh'] },
        { to: '/holerites', tKey: 'navigation.holerites', icon: FileText, roles: ['admin', 'rh', 'finance'] },
        { to: '/benefits', tKey: 'navigation.benefits', icon: CarFront, roles: ['admin', 'rh'] },
        { to: '/discounts', tKey: 'Gestão de Descontos', icon: BadgeDollarSign, roles: ['admin', 'rh', 'finance'] },
        { to: '/taxes', tKey: 'Configuração de Impostos', icon: Calculator, roles: ['admin', 'finance'] },
        { to: '/bank-accounts', tKey: 'navigation.bankAccounts', icon: Wallet, roles: ['admin', 'rh', 'finance'] },
        { to: '/documents', tKey: 'navigation.documents', icon: FileText, roles: ['admin', 'rh', 'finance'] },
        { to: '/admin/users', tKey: 'navigation.access', icon: UserCog, roles: ['admin'] },
        { to: '/admin/categories', tKey: 'Categorias (Descontos/Acresc)', icon: Tags, roles: ['admin'] },
    ];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-10 hidden flex-col bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 sm:flex transition-all duration-300",
            isExpanded ? "w-64" : "w-20"
        )}>
            <div className={cn("flex h-[72px] items-center border-b border-slate-200 dark:border-slate-800", isExpanded ? "px-6" : "justify-center px-0")}>
                <NavLink to="/" className="flex items-center gap-3 font-semibold text-slate-900 dark:text-white transition-opacity hover:opacity-90">
                    <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded bg-emerald-500 font-bold text-white text-lg leading-none">
                        M
                    </div>
                    {isExpanded && <span className="text-xl tracking-tight">Mastercorp</span>}
                </NavLink>
            </div>
            <div className="flex-1 py-6 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <div>
                    {isExpanded && (
                        <div className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('navigation.mainMenu')}
                        </div>
                    )}
                    <nav className="grid items-start px-2 text-sm font-medium gap-1">
                        {links.map(({ to, tKey, icon: Icon, roles }) => (
                            <RoleGate key={to} allow={roles}>
                                <NavLink
                                    to={to}
                                    title={!isExpanded ? t(tKey) : undefined}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center rounded-md transition-all outline-none',
                                            isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center p-3 mb-1 mx-auto w-12',
                                            isActive
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                                        )
                                    }
                                >
                                    <Icon className="h-[18px] w-[18px] shrink-0" />
                                    {isExpanded && <span>{t(tKey)}</span>}
                                </NavLink>
                            </RoleGate>
                        ))}
                    </nav>
                </div>

                <div className="p-4 mt-auto">
                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800",
                            isExpanded ? "justify-end w-full" : "justify-center w-full mx-auto"
                        )}
                        title={isExpanded ? t('navigation.collapse') : t('navigation.expand')}
                    >
                        {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}
