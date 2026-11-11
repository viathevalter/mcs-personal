import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  PhoneCall, 
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DialerSupervisorView } from './components/DialerSupervisorView';
import { useCommercialScope } from './hooks/useLeads';
import { useComercialLanguage, type SupportedComercialLang } from './utils/comercialI18n';

export function DialerSupervisorPage() {
  const { activeProfile } = useCommercialScope();
  const operatorLangOverride = (activeProfile?.language as SupportedComercialLang | undefined) || null;
  const { tr } = useComercialLanguage(operatorLangOverride);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-6 max-w-[1920px] mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-foreground tracking-tight flex items-center gap-2 flex-wrap">
              {tr(
                'Relatório de Tempo de Atendimento & KPIs Comerciais',
                'Informe de Tiempos de Atención y KPIs Comerciales',
                'Rapport des Temps d’Appel & KPIs Commerciaux',
                'Report Tempi di Chiamata e KPI Commerciali'
              )}
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs">
                {tr('Gestão & Auditoria', 'Gestión y Tiempos', 'Gestion & Temps', 'Gestione e Tempi')}
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {tr(
                'Controle em tempo real do tempo falado, produtividade diária (Alex, Alba, Ayslan, Liseth, Fatumata e Giada), conversão e histórico de ligações.',
                'Control en tiempo real del tiempo en atención, productividad diaria (Alex, Alba, Ayslan, Liseth, Fatumata y Giada), conversión e historial.',
                'Suivi en temps réel du temps d’appel, de la productivité quotidienne (Alex, Alba, Ayslan, Liseth, Fatumata et Giada), de la conversion et de l’historique.',
                'Controllo in tempo reale del tempo di chiamata, produttività giornaliera (Alex, Alba, Ayslan, Liseth, Fatumata e Giada), conversione e storico.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate('/comercial/discador')}
            variant="outline"
            className="border-input bg-background hover:bg-muted text-foreground text-xs font-semibold gap-2"
          >
            <PhoneCall className="w-4 h-4 text-emerald-500" />
            {tr('Abrir Cockpit Discador', 'Abrir Cockpit Marcador', 'Ouvrir le Cockpit', 'Apri Cockpit')}
          </Button>

          <Button
            onClick={() => navigate('/comercial/discador/trabalhos')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs gap-2"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            {tr('Ver Trabalhos & Filas', 'Ver Trabajos y Colas', 'Voir Lots & Files', 'Vedi Lavori e Code')}
          </Button>
        </div>
      </div>

      {/* Main Supervisor Dashboard View */}
      <DialerSupervisorView />
    </div>
  );
}
