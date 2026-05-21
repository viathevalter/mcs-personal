import { useNavigate } from 'react-router-dom';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComingSoonPageProps {
    moduleName: string;
}

export function ComingSoonPage({ moduleName }: ComingSoonPageProps) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none" />
            
            <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <Hammer className="w-10 h-10 animate-bounce" />
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                    {moduleName}
                </h1>
                
                <h2 className="text-xl font-medium text-emerald-400 mb-6">
                    Em Desenvolvimento
                </h2>
                
                <p className="text-slate-400 mb-8 leading-relaxed">
                    Este módulo ainda está sendo construído. Nossa equipe técnica está trabalhando para entregar uma experiência incrível em breve.
                </p>
                
                <Button 
                    onClick={() => navigate('/hub')}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o Hub
                </Button>
            </div>
        </div>
    );
}
