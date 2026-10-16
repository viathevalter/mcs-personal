import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { SolicitudDetail } from '../types';
import { SolicitudStatusBadge } from './SolicitudStatusBadge';
import { SolicitudTypeBadge } from './SolicitudTypeBadge';
import { format } from 'date-fns';
import { formatDateClean } from '@/shared/utils/dateUtils';

interface Props {
  solicitud: SolicitudDetail;
  onEditClick?: () => void;
}

export function SolicitudOverviewTab({ solicitud, onEditClick }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>{t('solicitud_detail.overview.general_info')}</CardTitle>
          {onEditClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="h-8 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar / Prorrogar Data
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.title')}</p>
              <p className="text-base">{solicitud.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.description')}</p>
              <p className="text-base">{solicitud.description || t('solicitud_detail.overview.no_description')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.type')}</p>
              <div className="mt-1">
                <SolicitudTypeBadge tipo={solicitud.tipo} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.current_status')}</p>
              <div className="mt-1">
                <SolicitudStatusBadge status={solicitud.status} />
              </div>
            </div>
            <div className="col-span-1">
              <p className="text-sm font-medium text-muted-foreground">
                {solicitud.tipo === 'offboarding' ? t('solicitud_detail.overview.offboarding_date') : t('solicitud_detail.overview.scheduled_date')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  📅 {solicitud.due_date ? formatDateClean(solicitud.due_date) : 'Não definida'}
                </p>
                {onEditClick && (
                  <button
                    type="button"
                    onClick={onEditClick}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline flex items-center gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Alterar
                  </button>
                )}
              </div>
            </div>
            {solicitud.empresa && (
              <div className="col-span-1">
                <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.internal_company')}</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {solicitud.empresa?.trade_name || solicitud.empresa?.nome || 'N/A'}
                </p>
              </div>
            )}
            {solicitud.reason && (
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {solicitud.tipo === 'offboarding' ? t('solicitud_detail.overview.offboarding_reason') : t('solicitud_detail.overview.request_reason')}
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
            {solicitud.tipo === 'relocation' ? t('solicitud_detail.overview.relocation_target') : t('solicitud_detail.overview.client_site')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {solicitud.tipo === 'relocation' ? t('solicitud_detail.overview.target_client') : t('solicitud_detail.overview.client')}
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
              {solicitud.tipo === 'relocation' ? t('solicitud_detail.overview.target_site') : t('solicitud_detail.overview.site')}
            </p>
            <p className="text-base">
              {solicitud.client_site?.name || solicitud.pedido?.client_site?.name || t('torre_controle.table.undefined_location')}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.linked_order')}</p>
            <p className="text-base font-mono">{solicitud.pedido?.codigo || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('solicitud_detail.overview.created_at')}</p>
            <p className="text-base">{format(new Date(solicitud.created_at), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
