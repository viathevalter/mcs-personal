import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>{t('solicitud_detail.overview.general_info')}</CardTitle>
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
            {solicitud.due_date && (
              <div className="col-span-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {solicitud.tipo === 'offboarding' ? t('solicitud_detail.overview.offboarding_date') : t('solicitud_detail.overview.scheduled_date')}
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  📅 {formatDateClean(solicitud.due_date)}
                </p>
              </div>
            )}
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
