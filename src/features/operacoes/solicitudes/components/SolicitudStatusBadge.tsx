import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, XCircle } from 'lucide-react';

interface Props {
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
  className?: string;
  showIcon?: boolean;
}

export function SolicitudStatusBadge({ status, className, showIcon = true }: Props) {
  const config = {
    pending: {
      label: 'Pendente',
      color: 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20',
      icon: Clock,
    },
    in_progress: {
      label: 'Em Andamento',
      color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      icon: PlayCircle,
    },
    blocked: {
      label: 'Bloqueada',
      color: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      icon: AlertCircle,
    },
    completed: {
      label: 'Concluída',
      color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
      icon: CheckCircle2,
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      icon: XCircle,
    },
  };

  const { label, color, icon: Icon } = config[status] || config.pending;

  return (
    <Badge variant="outline" className={cn('border-none font-medium', color, className)}>
      {showIcon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Badge>
  );
}
