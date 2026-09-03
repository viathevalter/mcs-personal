import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  PhoneCall, 
  Users, 
  Layers, 
  TrendingUp, 
  Sparkles, 
  Award, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialerSupervisorView } from './components/DialerSupervisorView';

export function DialerSupervisorPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Supervisão Comercial & KPIs SDR
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs">
                Gestão
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitoramento em tempo real da produtividade dos operadores, taxas de conversão e motivos de recusa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/comercial/discador')}
            variant="outline"
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold gap-2"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            Abrir Discador
          </Button>

          <Button
            onClick={() => navigate('/comercial/discador/trabalhos')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs gap-2"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            Ver Todos os Trabalhos
          </Button>
        </div>
      </div>

      {/* Main Supervisor Dashboard View */}
      <DialerSupervisorView />
    </div>
  );
}
