import type { SolicitudTimeline } from '../types';
import { format } from 'date-fns';
import { CheckCircle2, PlayCircle, AlertCircle, FileText, Info } from 'lucide-react';

interface Props {
  timeline: SolicitudTimeline[];
  isLoading: boolean;
}

export function SolicitudTimelineTab({ timeline, isLoading }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando histórico...</div>;
  }

  if (timeline.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhum evento registrado.</div>;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_started':
      case 'playbook_started':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'task_completed':
      case 'solicitud_completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'task_unblocked':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'comment_added':
      case 'file_attached':
        return <FileText className="h-4 w-4 text-indigo-500" />;
      default:
        return <Info className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="relative border-l border-muted ml-3">
        {timeline.map((event) => (
          <div key={event.id} className="mb-6 ml-6 relative">
            <span className="absolute -left-9 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-4 ring-background">
              {getIcon(event.event_type)}
            </span>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{event.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              )}
              {event.created_by_user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Por: {event.created_by_user.email}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
