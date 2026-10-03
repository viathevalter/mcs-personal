import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { LogOut, Clock, FileText, User, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/providers';

export function WorkerPortalLayout() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme('light');
        const session = localStorage.getItem('worker_session');
        if (!session) {
            navigate('/portal/login');
        }
    }, [navigate, setTheme]);

    const handleLogout = () => {
        localStorage.removeItem('worker_session');
        toast.info(t('workerPortal.layout.logout.toast', { defaultValue: 'Sessão terminada.' }));
        navigate('/portal/login');
    };

    const session = localStorage.getItem('worker_session');
    const workerAuth = session ? JSON.parse(session) : null;

    if (!workerAuth) return null;

    const navItems = [
        {
            path: '/portal',
            label: 'Horas',
            icon: Clock,
            isActive: location.pathname === '/portal' || location.pathname === '/portal/' || location.pathname === '/portal/horas'
        },
        {
            path: '/portal/nominas',
            label: 'Nóminas',
            icon: FileText,
            isActive: location.pathname.startsWith('/portal/nominas')
        },
        {
            path: '/portal/perfil',
            label: 'Meu Perfil',
            icon: User,
            isActive: location.pathname.startsWith('/portal/perfil')
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-xs">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex justify-between h-14 sm:h-16 items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-blue-600 p-2 text-white shadow-xs">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="font-bold text-base text-slate-900 leading-tight block">
                                    Portal do Trabalhador
                                </span>
                                <span className="text-[11px] text-slate-400 hidden sm:block">
                                    MCS Group • Apontamentos & Nóminas
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            item.isActive
                                                ? 'bg-white text-blue-700 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Profile Info & Logout */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="text-right hidden sm:block">
                                <span className="text-xs font-semibold text-slate-800 block truncate max-w-[150px]">
                                    {workerAuth.nome.split(' ')[0]}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                    {workerAuth.pasaporte || workerAuth.nie || ''}
                                </span>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                title={t('workerPortal.layout.logout.btn', { defaultValue: 'Sair' })}
                                className="h-9 w-9 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 sm:py-8 sm:px-6 pb-24 sm:pb-8">
                <Outlet context={{ workerAuth }} />
            </main>

            {/* Mobile Bottom Navigation Bar (Fixed) */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1 shadow-lg">
                <div className="grid grid-cols-3 max-w-md mx-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium transition-colors ${
                                    item.isActive
                                        ? 'text-blue-600 font-bold bg-blue-50/60'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Icon className={`h-5 w-5 mb-0.5 ${item.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
