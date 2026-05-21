import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SolicitudDetail } from '../types';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { SolicitudTypeBadge } from './SolicitudTypeBadge';
import { format } from 'date-fns';

interface Props {
  solicitud: SolicitudDetail;
}

export function SolicitudOverviewTab({ solicitud }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Título</p>
              <p className="text-base">{solicitud.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descrição</p>
              <p className="text-base">{solicitud.description || 'Sem descrição'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo</p>
              <div className="mt-1">
                <SolicitudTypeBadge tipo={solicitud.tipo} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status Atual</p>
              <div className="mt-1">
                <SolicitudStatusBadge status={solicitud.status} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cliente e Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
            <p className="text-base">{solicitud.pedido?.client?.trade_name || solicitud.pedido?.client?.legal_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Local / Obra</p>
            <p className="text-base">{solicitud.pedido?.client_site?.name || 'Local não definido'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pedido Vinculado</p>
            <p className="text-base font-mono">{solicitud.pedido?.codigo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Data de Criação</p>
            <p className="text-base">{format(new Date(solicitud.created_at), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
