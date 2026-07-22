import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { useMyMemberships } from '@/shared/hooks/useMyMemberships';
import { 
    Users, 
    Briefcase, 
    Receipt, 
    Landmark, 
    Truck, 
    PackageSearch, 
    Clock, 
    FileText,
    MessageCircle,
    Activity,
    LogOut,
    Lock,
    Car
} from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { Button } from '@/components/ui/button';

// Definição dos módulos (Apps) com base na imagem fornecida
type ModuleDef = {
    id: string;
    title: string;
    icon: React.ElementType;
    path: string;
    color: string;
    bgHover: string;
    allowedRoles: string[]; // Mock de permissões ('all' para qualquer um, ou roles específicas)
};

const MODULES: ModuleDef[] = [
    {
        id: 'cadastro',
        title: 'MCS Registro General',
        icon: FileText,
        path: '/master-data',
        color: 'text-orange-500',
        bgHover: 'hover:bg-orange-50',
        allowedRoles: ['admin', 'commercial']
    },
    {
        id: 'comercial',
        title: 'MCS Comercial',
        icon: Briefcase,
        path: '/comercial',
        color: 'text-yellow-500',
        bgHover: 'hover:bg-yellow-50',
        allowedRoles: ['admin', 'commercial']
    },
    {
        id: 'facturacion',
        title: 'MCS Facturacion',
        icon: Receipt,
        path: '/faturamento',
        color: 'text-amber-600',
        bgHover: 'hover:bg-amber-50',
        allowedRoles: ['admin', 'finance']
    },
    {
        id: 'financeiro',
        title: 'MCS Financeiro',
        icon: Landmark,
        path: '/financeiro',
        color: 'text-blue-500',
        bgHover: 'hover:bg-blue-50',
        allowedRoles: ['admin', 'finance']
    },
    {
        id: 'chat',
        title: 'MCS Chat',
        icon: MessageCircle,
        path: '/chat',
        color: 'text-emerald-400',
        bgHover: 'hover:bg-emerald-50',
        allowedRoles: ['admin', 'rh', 'commercial', 'operacoes']
    },
    {
        id: 'logistica',
        title: 'MCS Logistica',
        icon: Truck,
        path: '/logistica',
        color: 'text-emerald-500',
        bgHover: 'hover:bg-emerald-50',
        allowedRoles: ['admin', 'operacoes']
    },
    {
        id: 'almacen',
        title: 'MCS Almacen',
        icon: PackageSearch,
        path: '/almacen',
        color: 'text-emerald-600',
        bgHover: 'hover:bg-emerald-50',
        allowedRoles: ['admin', 'operacoes']
    },
    {
        id: 'cierre_horas',
        title: 'MCS CentralCars',
        icon: Car,
        path: '/cierre-horas',
        color: 'text-blue-600',
        bgHover: 'hover:bg-blue-50',
        allowedRoles: ['admin', 'rh', 'commercial', 'visualizador']
    },
    {
        id: 'operacoes',
        title: 'MCS Operacoes',
        icon: Activity,
        path: '/operacoes',
        color: 'text-indigo-500',
        bgHover: 'hover:bg-indigo-50',
        allowedRoles: ['admin', 'operacoes']
    },
    {
        id: 'rrhh',
        title: 'MCS RRHH',
        icon: Users,
        path: '/dashboard', // Módulo de RH atual do sistema
        color: 'text-purple-600',
        bgHover: 'hover:bg-purple-50',
        allowedRoles: ['admin', 'rh', 'user', 'visualizador']
    }
];

export function GlobalHubPage() {
    const { user } = useAuth();
    const { role: userRole } = useRole();
    const { data: membershipsData } = useMyMemberships();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Lógica para verificar acesso do usuário
    const hasAccess = (allowedRoles: string[]) => {
        if (!userRole) return false;
        if (userRole === 'super_admin') return true; // super_admin tem acesso global
        if (allowedRoles.includes('all')) return true;
        
        // Permite acesso direto se a role do app coincidir
        if (allowedRoles.includes(userRole)) return true;

        // Obtém as roles associadas aos vínculos de empresas ativas do usuário
        const userMembershipRoles = membershipsData?.memberships?.map(m => m.role) || [];

        // Mapeia roles globais do App para roles equivalentes nas filiais
        const mappedRoles = [...userMembershipRoles];
        if (userRole === 'admin_rh' || userMembershipRoles.includes('rh')) {
            mappedRoles.push('rh');
        }
        if (userRole === 'operador' || userMembershipRoles.includes('operador')) {
            mappedRoles.push('operacoes');
        }

        return allowedRoles.some(r => mappedRoles.includes(r));
    };

    const handleModuleClick = async (module: ModuleDef) => {
        if (!hasAccess(module.allowedRoles)) return;

        if (module.id === 'chat') {
            const { data: { session } } = await supabase.auth.getSession();
            const baseUrl = import.meta.env.VITE_CHAT_URL || 'http://localhost:3001';
            
            if (session) {
                const ssoUrl = `${baseUrl}/api/auth/sso?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
                window.open(ssoUrl, '_blank');
            } else {
                window.open(baseUrl, '_blank');
            }
        } else if (module.id === 'cierre_horas') {
            const { data: { session } } = await supabase.auth.getSession();
            const baseUrl = import.meta.env.VITE_COCHES_URL || 'https://mcs-coches.vercel.app';
            
            if (session) {
                const ssoUrl = `${baseUrl}?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
                window.location.href = ssoUrl;
            } else {
                window.location.href = baseUrl;
            }
        } else {
            navigate(module.path);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden text-slate-100">
            {/* Background Decorations */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none" />
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
            
            {/* Header com Logout */}
            <div className="absolute top-4 right-6 z-20 flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-200">{user?.email}</p>
                    <p className="text-xs text-slate-400 capitalize bg-slate-800 inline-block px-2 py-0.5 rounded-full mt-1">
                        Perfil: {userRole || 'Não definido'}
                    </p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
                    title="Sair do sistema"
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-6xl px-6 py-12 flex flex-col items-center">
                
                {/* Logo Central */}
                <div className="relative mb-16 flex flex-col items-center select-none">
                    {/* Efeito de brilho/luz atrás da logo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[160px] bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-emerald-500/25 via-blue-500/15 to-transparent blur-3xl rounded-full pointer-events-none z-0" />
                    
                    <img 
                        src="/logo_mcs_transparent.png" 
                        alt="MCS Logo" 
                        className="relative z-10 h-32 md:h-36 w-auto object-contain" 
                    />
                </div>

                {/* Grid de Aplicativos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
                    {MODULES.map((module) => {
                        const canAccess = hasAccess(module.allowedRoles);
                        const Icon = module.icon;

                        return (
                            <button
                                key={module.id}
                                onClick={() => handleModuleClick(module)}
                                disabled={!canAccess}
                                className={`
                                    group relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300
                                    ${canAccess 
                                        ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-emerald-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 cursor-pointer' 
                                        : 'bg-slate-800/20 border-slate-800/50 opacity-60 cursor-not-allowed'
                                    }
                                `}
                            >
                                {/* Lock Overlay */}
                                {!canAccess && (
                                    <div className="absolute top-3 right-3 text-slate-500">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                )}

                                <div className={`
                                    flex h-14 w-14 items-center justify-center rounded-xl mb-4 transition-colors
                                    ${canAccess ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-slate-800'}
                                `}>
                                    <Icon className={`w-7 h-7 ${canAccess ? module.color : 'text-slate-500'}`} />
                                </div>
                                
                                <span className={`font-semibold text-sm text-center ${canAccess ? 'text-slate-200' : 'text-slate-500'}`}>
                                    {module.title}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
