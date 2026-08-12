import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';
import type { Pedido } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';
import { Calendar, MapPin, User, Phone, Mail, FileText, Info } from 'lucide-react';

interface Props {
  pedido: Pedido;
}

export function PedidoOverviewTab({ pedido }: Props) {
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  // Helper function to get day of week name
  const getDayOfWeekName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return '';
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    } catch (e) {
      return '';
    }
  };

  // Helper function to calculate duration string
  const getDurationString = () => {
    if (!pedido.expected_start_date || !pedido.expected_end_date) return 'Não especificado';
    try {
      const start = new Date(pedido.expected_start_date + 'T00:00:00');
      const end = new Date(pedido.expected_end_date + 'T00:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      
      if (months > 0) {
        return `${months} ${months === 1 ? 'mês' : 'meses'}${remainingDays > 0 ? ` e ${remainingDays} dias` : ''}`;
      }
      return `${diffDays} dias`;
    } catch (e) {
      return 'Não especificado';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      
      {/* 1. PREMIUM DATES & TIMELINE BANNER */}
      <Card className="md:col-span-2 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
        <CardContent className="p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-900/30 dark:to-slate-900/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Start Date */}
            <div className="flex items-center space-x-4">
              <div className="p-3.5 bg-blue-500/10 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Início Previsto</p>
                <p className="text-2xl font-bold text-slate-955 dark:text-white mt-0.5">
                  {pedido.expected_start_date ? format(new Date(pedido.expected_start_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {pedido.expected_start_date ? getDayOfWeekName(pedido.expected_start_date) : ''}
                </p>
              </div>
            </div>

            {/* Visual connector / duration */}
            <div className="hidden md:flex flex-col items-center flex-1 px-8">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-4 py-1.5 rounded-full border border-indigo-100/50 dark:border-indigo-900/50 shadow-sm">
                Duração: {getDurationString()}
              </span>
              <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-800 relative mt-4">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-400"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>
              </div>
            </div>

            {/* Mobile duration indicator */}
            <div className="md:hidden flex items-center pt-2">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100/50">
                Duração: {getDurationString()}
              </span>
            </div>

            {/* End Date */}
            <div className="flex items-center space-x-4 md:text-right md:flex-row-reverse md:space-x-reverse">
              <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-955/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fim Previsto</p>
                <p className="text-2xl font-bold text-slate-955 dark:text-white mt-0.5">
                  {pedido.expected_end_date ? format(new Date(pedido.expected_end_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {pedido.expected_end_date ? getDayOfWeekName(pedido.expected_end_date) : ''}
                </p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 2. GENERAL INFORMATION CARD */}
      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-blue-500" />
            Informações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código</p>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{pedido.codigo}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tipo do Pedido</p>
              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 capitalize">{pedido.order_type.replace('_', ' ')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente</p>
              <p className="font-bold text-sm text-indigo-650 dark:text-indigo-400">{pedido.client?.trade_name || pedido.client?.legal_name || 'Desconhecido'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status Comercial</p>
              <div className="mt-1"><PedidoStatusBadge type="commercial" status={pedido.commercial_status} /></div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status Operacional</p>
              <div className="mt-1"><PedidoStatusBadge type="operational" status={pedido.operational_status} /></div>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Origem da Estimación</p>
            {pedido.source_estimacion_id ? (
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Sim (ID: {pedido.source_estimacion_id})
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sem origem</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. RESPONSIBLES & METRICS COLUMN */}
      <div className="space-y-6 animate-fade-in">
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-emerald-500" />
              Responsáveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Comercial</p>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{pedido.commercial_owner_id || 'Não Atribuído'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Operacional</p>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{pedido.responsible_id || 'Não Atribuído'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasFinanceAccess && (
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base font-bold text-slate-850 dark:text-slate-100">Snapshot Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Receita Total:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-450">{formatCurrency(pedido.total_revenue_snapshot || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Custo Base:</span>
                <span className="font-bold text-red-650 dark:text-red-400">{formatCurrency(pedido.total_cost_snapshot || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">Margem (%):</span>
                <span className={`font-bold ${pedido.margin_percent_snapshot && pedido.margin_percent_snapshot >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {pedido.margin_percent_snapshot || 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. OBRA / LOCALIZAÇÃO E CONTATO DETALHADO CARD */}
      <Card className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
        <CardHeader className="border-b pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-500" />
              Obra / Localização e Contatos
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Informações de endereço e contato telefônico da obra vinculada a este pedido.</p>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {pedido.client_site ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Address Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Local do Trabalho</h4>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identificação da Obra</span>
                  <p className="font-bold text-slate-900 dark:text-white">{pedido.client_site.name}</p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Endereço</span>
                  <p className="font-semibold text-slate-700 dark:text-slate-350">{pedido.client_site.address_line || 'Endereço não cadastrado'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cidade</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-350">{pedido.client_site.city || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código Postal</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-350">{pedido.client_site.postal_code || '-'}</p>
                  </div>
                </div>

                {pedido.client_site.notes && (
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Notas da Obra</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 whitespace-pre-wrap leading-relaxed">
                      {pedido.client_site.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Contact Details */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Pessoa de Contato na Obra</h4>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Responsável Local</span>
                  <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 px-3 rounded-lg border border-slate-150 dark:border-slate-800/40">
                    <User className="h-4 w-4 text-slate-405 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-250">
                      {pedido.client_site.contact_name || 'Não especificado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Telefone da Obra</span>
                  <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 px-3 rounded-lg border border-slate-150 dark:border-slate-800/40">
                    <Phone className="h-4 w-4 text-slate-405 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {pedido.client_site.contact_phone || 'Não especificado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">E-mail do Responsável</span>
                  <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 p-2 px-3 rounded-lg border border-slate-150 dark:border-slate-800/40">
                    <Mail className="h-4 w-4 text-slate-405 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                      {pedido.client_site.contact_email || 'Não especificado'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm flex flex-col items-center justify-center space-y-2">
              <MapPin className="h-10 w-10 text-slate-300" />
              <p className="font-medium">Nenhuma informação detalhada sobre a obra/localização vinculada.</p>
              <p className="text-xs text-slate-404">Verifique o cadastro de obras para este cliente.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. NOTES CARD */}
      <Card className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-blue-500" />
            Observações do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {pedido.general_notes ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{pedido.general_notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma observação cadastrada para este pedido. Você pode adicionar clicando no botão "Editar Pedido" no cabeçalho.</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
