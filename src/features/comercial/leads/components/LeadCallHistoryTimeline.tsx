import { format } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Ban, 
  User, 
  FileText 
} from 'lucide-react';
import type { LeadCallLog } from '../types/dialerTypes';

interface LeadCallHistoryTimelineProps {
  logs: LeadCallLog[];
  isLoading?: boolean;
}

export function LeadCallHistoryTimeline({ logs, isLoading }: LeadCallHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
        Carregando histórico de ligações...
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="py-6 px-4 rounded-xl bg-muted/30 border border-border text-center space-y-1">
        <Phone className="w-5 h-5 text-muted-foreground/40 mx-auto" />
        <p className="text-xs font-medium text-foreground">Nenhum histórico anterior de chamadas</p>
        <p className="text-[11px] text-muted-foreground">Este será o primeiro contato registrado para este lead.</p>
      </div>
    );
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'answered_converted':
        return {
          label: 'Orçamento Solicitado',
          icon: CheckCircle2,
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'answered_callback':
        return {
          label: 'Retorno Agendado',
          icon: Calendar,
          color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      case 'answered_rejected':
        return {
          label: 'Sem Interesse / Recusado',
          icon: Ban,
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        };
      case 'no_answer':
      case 'busy':
        return {
          label: 'Não Atendeu / Ocupado',
          icon: PhoneOff,
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'gatekeeper_blocked':
        return {
          label: 'Barrado na Recepção',
          icon: PhoneForwarded,
          color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        };
      default:
        return {
          label: 'Contato Efetuado',
          icon: PhoneCall,
          color: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const badge = getOutcomeBadge(log.outcome);
        const IconComponent = badge.icon;
        const formattedDate = format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

        return (
          <div 
            key={log.id} 
            className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-xs hover:border-border transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 ${badge.color}`}>
                <IconComponent className="w-3.5 h-3.5" />
                {badge.label}
              </span>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                {log.duration_seconds > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s
                  </span>
                )}
                <span>{formattedDate}</span>
              </div>
            </div>

            {log.notes && (
              <p className="text-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border font-sans">
                {log.notes}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1 text-foreground">
                <User className="w-3 h-3 text-muted-foreground" />
                {log.user?.display_name || log.user?.email || 'Operador'}
              </span>

              {log.scheduled_callback_at && (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Callback: {format(new Date(log.scheduled_callback_at), "dd/MM/yyyy HH:mm")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
