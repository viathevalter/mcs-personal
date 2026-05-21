import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowDownAZ, ArrowUpAZ, Activity, MessageSquare, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimelineEvent } from '../../hooks/usePedidoTimeline';

interface Props {
  events: TimelineEvent[];
  isLoading: boolean;
}

export function PedidoTimelineTab({ events, isLoading }: Props) {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground mt-6">Carregando timeline...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum evento registrado no histórico deste pedido.
        </CardContent>
      </Card>
    );
  }

  const sortedEvents = [...events].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Linha do Tempo (Timeline 360)</CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          {sortOrder === 'desc' ? <><ArrowDownAZ size={16} className="mr-2" /> Mais Recentes </> : <><ArrowUpAZ size={16} className="mr-2" /> Mais Antigos</>}
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-8">
          {sortedEvents.map((event) => (
            <div key={event.id} className="relative pl-6">
              <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-slate-950 ${
                event.source === 'pedido_status' ? 'bg-amber-100 text-amber-600' :
                event.source === 'solicitud_timeline' ? 'bg-blue-100 text-blue-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {event.source === 'pedido_status' ? <History size={12} /> :
                 event.source === 'solicitud_timeline' ? <Activity size={12} /> :
                 <MessageSquare size={12} />}
              </span>
              
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {event.title}
                </h3>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </time>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {event.description}
              </p>
              
              <div className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 inline-block px-2 py-1 rounded">
                Por: {event.actor_name}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
