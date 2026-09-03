import { 
  Users, 
  PhoneCall, 
  PhoneForwarded, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Award, 
  Ban, 
  BarChart3, 
  ShieldAlert,
  Calendar,
  Layers,
  Loader2
} from 'lucide-react';
import { useDialerSupervisorKPIs } from '../hooks/useDialer';

const REJECTION_LABELS: Record<string, string> = {
  has_own_team: 'Já possui equipe própria / Fixos',
  no_demand: 'Sem obras ou paradas no momento',
  price_too_high: 'Tarifa horária acima do orçamento',
  does_not_outsource: 'Não terceiriza mão de obra',
  bad_contact: 'Contato incorreto / Sem decisor',
  other: 'Outros motivos',
};

export function DialerSupervisorView() {
  const { data: kpis, isLoading } = useDialerSupervisorKPIs();

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-sm">Carregando métricas da equipe de prospecção...</p>
      </div>
    );
  }

  if (!kpis || kpis.totalCalls === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card border border-border space-y-3">
        <PhoneCall className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-base font-bold text-foreground">Nenhuma chamada registrada no período</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Inicie as filas de prospecção com a equipe (Omar, Michele) para acompanhar o desempenho, conversão e tempo de atendimento em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Cards: General KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Discagens</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">{kpis.totalCalls}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kpis.answeredCount}</span> contatos atendidos
          </div>
        </div>

        {/* Contact Rate */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Taxa de Contato</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{kpis.contactRate}%</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Eficiência do mailing de leads</span>
          </div>
        </div>

        {/* Converted into Presupuestos */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Orçamentos Gerados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpis.convertedCount}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{kpis.conversionRate}%</span> taxa de conversão direta
          </div>
        </div>

        {/* Scheduled Callbacks */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Retornos Agendados</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpis.scheduledCount}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Leads em aquecimento para recontato</span>
          </div>
        </div>
      </div>

      {/* Grid: SDR Productivity Table & Rejection Reasons Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Salespeople Table (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-foreground">Produtividade por Operador (SDR)</h3>
            </div>
            <span className="text-xs text-muted-foreground">{kpis.sdrPerformances.length} operadores ativos</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase font-bold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-3 text-center">Chamadas</th>
                  <th className="py-3 px-3 text-center">Atendidas</th>
                  <th className="py-3 px-3 text-center">Orçamentos</th>
                  <th className="py-3 px-3 text-center">Retornos</th>
                  <th className="py-3 px-4 text-right">Taxa Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kpis.sdrPerformances.map((sdr, idx) => {
                  const sdrConversion = sdr.totalCalls > 0 ? ((sdr.convertedCalls / sdr.totalCalls) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={sdr.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                            {sdr.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-foreground">{sdr.userName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">{sdr.totalCalls}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-blue-600 dark:text-blue-400 font-semibold">{sdr.answeredCalls}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">{sdr.convertedCalls}</td>
                      <td className="py-3.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400">{sdr.scheduledCalls}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">{sdrConversion}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection Breakdown (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-card border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-foreground">Distribuição de Motivos de Recusa</h3>
            </div>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-mono font-bold">{kpis.rejectedCount} recusas</span>
          </div>

          <div className="space-y-3">
            {Object.entries(kpis.rejectionBreakdown).map(([reasonKey, count]) => {
              const label = REJECTION_LABELS[reasonKey] || reasonKey;
              const percent = kpis.rejectedCount > 0 ? Math.round((count / kpis.rejectedCount) * 100) : 0;

              return (
                <div key={reasonKey} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground/90">{label}</span>
                    <span className="font-mono text-muted-foreground">{count} ({percent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
