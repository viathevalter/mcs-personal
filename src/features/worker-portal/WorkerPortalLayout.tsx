import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LogOut, Briefcase } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export function WorkerPortalLayout() {
    const navigate = useNavigate();

    useEffect(() => {
        const session = localStorage.getItem('worker_session');
        if (!session) {
            navigate('/portal/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('worker_session');
        toast.info('Sessão encerrada');
        navigate('/portal/login');
    };

    const session = localStorage.getItem('worker_session');
    const workerAuth = session ? JSON.parse(session) : null;

    if (!workerAuth) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="rounded-full bg-blue-100 p-2">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                            <span className="font-semibold text-lg text-slate-900 hidden sm:block">
                                Portal do Trabalhador
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[120px] sm:max-w-[200px]">
                                {workerAuth.nome.split(' ')[0]}
                            </span>
                            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
                                <LogOut className="h-5 w-5 text-slate-500 hover:text-red-500" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <Outlet context={{ workerAuth }} />
            </main>
        </div>
    );
}
