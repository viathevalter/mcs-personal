import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Send, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Props {
  status: 'draft' | 'sent' | 'signed' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  className?: string;
  showIcon?: boolean;
}

export function EstimacionStatusBadge({ status, className, showIcon = true }: Props) {
  const config = {
    draft: {
      label: 'Rascunho',
      color: 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20',
      icon: FileText,
    },
    sent: {
      label: 'Aguardando Assinatura',
      color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      icon: Send,
    },
    signed: {
      label: 'Contrato Assinado',
      color: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
      icon: CheckCircle2,
    },
    approved: {
      label: 'Aprovada',
      color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejeitada',
      color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      icon: XCircle,
    },
    expired: {
      label: 'Vencida',
      color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      icon: Clock,
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      icon: AlertCircle,
    },
  };

  const { label, color, icon: Icon } = config[status] || config.draft;

  return (
    <Badge variant="outline" className={cn('border-none font-medium', color, className)}>
      {showIcon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Badge>
  );
}
