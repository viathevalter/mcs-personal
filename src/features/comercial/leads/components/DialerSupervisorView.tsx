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
  Layers
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
      <div className="p-8 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Carregando métricas da equipe de prospecção...</p>
      </div>
    );
  }

  if (!kpis || kpis.totalCalls === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <PhoneCall className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhuma chamada registrada no período</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
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
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Discagens</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{kpis.totalCalls}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{kpis.answeredCount}</span> contatos atendidos
          </div>
        </div>

        {/* Contact Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Taxa de Contato</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-400">{kpis.contactRate}%</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Eficiência do mailing de leads</span>
          </div>
        </div>

        {/* Converted into Presupuestos */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Orçamentos Gerados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400">{kpis.convertedCount}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{kpis.conversionRate}%</span> taxa de conversão direta
          </div>
        </div>

        {/* Scheduled Callbacks */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Retornos Agendados</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400">{kpis.scheduledCount}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Decisores aguardando callback</span>
          </div>
        </div>
      </div>

      {/* Grid: SDR Performance Table + Rejection Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SDR Team Performance */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Produtividade por Vendedor / SDR</h3>
                <p className="text-xs text-slate-400">Omar, Michele e equipe comercial</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4 text-center">Discagens</th>
                  <th className="py-3 px-4 text-center">Atendidas</th>
                  <th className="py-3 px-4 text-center">Orçamentos</th>
                  <th className="py-3 px-4 text-center">Agendados</th>
                  <th className="py-3 px-4 text-center">Taxa Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {kpis.sdrPerformances.map(sdr => {
                  const sdrConvRate = sdr.totalCalls > 0 ? ((sdr.convertedCalls / sdr.totalCalls) * 100).toFixed(1) : '0';
                  return (
                    <tr key={sdr.userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                          {sdr.userName.charAt(0).toUpperCase()}
                        </div>
                        {sdr.userName}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">{sdr.totalCalls}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-blue-400">{sdr.answeredCalls}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">{sdr.convertedCalls}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-400">{sdr.scheduledCalls}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {sdrConvRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection Reasons Breakdown */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Motivos de Recusa</h3>
              <p className="text-xs text-slate-400">Feedback de mercado e objeções</p>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-around">
            {Object.entries(kpis.rejectionBreakdown).map(([reasonKey, count]) => {
              const totalRejections = Object.values(kpis.rejectionBreakdown).reduce((a, b) => a + b, 0);
              const percent = totalRejections > 0 ? Math.round((count / totalRejections) * 100) : 0;
              const label = REJECTION_LABELS[reasonKey] || reasonKey;

              return (
                <div key={reasonKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[200px]" title={label}>{label}</span>
                    <span className="font-bold text-slate-400">{count} ({percent}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500/80 rounded-full transition-all duration-500"
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
