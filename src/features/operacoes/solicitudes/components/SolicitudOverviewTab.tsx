import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SolicitudDetail } from '../types';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { SolicitudTypeBadge } from './SolicitudTypeBadge';
import { format } from 'date-fns';
import { formatDateClean } from '@/shared/utils/dateUtils';

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
            {solicitud.due_date && (
              <div className="col-span-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {solicitud.tipo === 'offboarding' ? 'Data Efetiva da Baixa (Data de Saída)' : 'Data Prevista / Efetiva'}
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  📅 {formatDateClean(solicitud.due_date)}
                </p>
              </div>
            )}
            {solicitud.empresa && (
              <div className="col-span-1">
                <p className="text-sm font-medium text-muted-foreground">Empresa Interna</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {solicitud.empresa?.trade_name || solicitud.empresa?.nome || 'N/A'}
                </p>
              </div>
            )}
            {solicitud.reason && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {solicitud.tipo === 'offboarding' ? 'Motivo do Desligamento' : 'Motivo da Solicitação'}
                </p>
                <p className="text-base font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-md border border-slate-200 dark:border-slate-800 mt-1">
                  {solicitud.reason}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {solicitud.tipo === 'relocation' ? 'Destino da Realocação' : 'Cliente e Obra'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {solicitud.tipo === 'relocation' ? 'Cliente de Destino' : 'Cliente'}
            </p>
            <p className="text-base">
              {solicitud.client?.trade_name || solicitud.client?.legal_name || solicitud.pedido?.client?.trade_name || solicitud.pedido?.client?.legal_name || 'N/A'}
            </p>
            {(() => {
              const email = solicitud.client?.email || solicitud.pedido?.client?.email;
              const phone = solicitud.client?.phone || solicitud.pedido?.client?.phone;
              if (email || phone) {
                return (
                  <div className="mt-1.5 space-y-1">
                    {email && (
                      <a href={`mailto:${email}`} className="block text-xs text-blue-650 dark:text-blue-400 hover:underline truncate font-medium">
                        📧 {email}
                      </a>
                    )}
                    {phone && (
                      <a href={`tel:${phone}`} className="block text-xs text-blue-650 dark:text-blue-400 hover:underline font-medium">
                        📞 {phone}
                      </a>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {solicitud.tipo === 'relocation' ? 'Obra de Destino' : 'Local / Obra'}
            </p>
            <p className="text-base">
              {solicitud.client_site?.name || solicitud.pedido?.client_site?.name || 'Local não definido'}
            </p>
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
