import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { PlayCircle, Mail, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateClean } from '@/shared/utils/dateUtils';
import { useAuth } from '@/features/operacoes/contexts/AuthContext';

interface ReanudarPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: {
    id: string;
    codigo: string;
    empresa_id: string;
    expected_start_date?: string | null;
    client?: {
      trade_name?: string;
      legal_name?: string;
    };
    client_site?: {
      name?: string;
    };
  };
  onSuccess?: () => void;
}

export function ReanudarPedidoModal({ isOpen, onClose, pedido, onSuccess }: ReanudarPedidoModalProps) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.startsWith('es');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [novaDataInicio, setNovaDataInicio] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email Notification States
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [notificationEmails, setNotificationEmails] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const clientName = pedido.client?.trade_name || pedido.client?.legal_name || 'Cliente';
  const siteName = pedido.client_site?.name || 'Obra';

  // Buscar e-mails cadastrados para notificação da empresa
  useEffect(() => {
    if (!isOpen || !pedido.empresa_id) return;

    async function loadNotificationEmails() {
      setIsLoadingEmails(true);
      try {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('notification_emails')
          .select('id, email, event_type')
          .eq('empresa_id', pedido.empresa_id)
          .in('event_type', ['retomada', 'pedido', 'pausa']);

        if (!error && data && data.length > 0) {
          const uniqueList = data.filter((item, index, self) =>
            index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase())
          );
          setNotificationEmails(uniqueList);
          setSelectedEmails(uniqueList.map(e => e.email));
        } else {
          // Fallback buscando qualquer email de notificação ativo da empresa
          const { data: fallbackData } = await supabase
            .schema('core_comercial')
            .from('notification_emails')
            .select('id, email')
            .eq('empresa_id', pedido.empresa_id);

          if (fallbackData && fallbackData.length > 0) {
            const uniqueList = fallbackData.filter((item, index, self) =>
              index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase())
            );
            setNotificationEmails(uniqueList);
            setSelectedEmails(uniqueList.map(e => e.email));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar e-mails de notificação:', err);
      } finally {
        setIsLoadingEmails(false);
      }
    }

    loadNotificationEmails();
  }, [isOpen, pedido.empresa_id]);

  // Atualizar assunto e corpo padrão quando mudar a data ou idioma
  useEffect(() => {
    if (isEs) {
      const formattedDate = novaDataInicio ? formatDateClean(novaDataInicio) : '[Nueva Fecha]';
      const subj = `[REANUDACIÓN DE OBRA] Pedido ${pedido.codigo} - ${clientName} - Inicio confirmado para ${formattedDate}`;
      setEmailSubject(subj);

      const body = `Estimado Equipo,

Informamos que el pedido ${pedido.codigo} (${clientName} - ${siteName}), que se encontraba temporalmente pausado, ha sido REANUDADO con nueva fecha oficial de inicio:

📅 Nueva Fecha de Inicio: ${formattedDate}
📍 Cliente / Lugar: ${clientName} - ${siteName}
${observacoes ? `📝 Observaciones: ${observacoes}\n` : ''}
PRÓXIMAS ACCIONES DEL EQUIPO:
1. [RRHH / Atención]: Reconfirmar agenda con los trabajadores asignados y gestionar firmas.
2. [DP / Seguridad Social]: Programar el envío de Alta en la Seguridad Social para la nueva fecha.
3. [Reclutamiento]: Retomar selección para las vacantes pendientes, si las hubiera.
4. [Logística]: Reactivar y confirmar cronograma de alojamiento, transporte y envío de EPIs.

Atentamente,
Coordinación de Operaciones`;

      setEmailBody(body);
    } else {
      const formattedDate = novaDataInicio ? formatDateClean(novaDataInicio) : '[Nova Data]';
      const subj = `[RETOMADA DE OBRA] Pedido ${pedido.codigo} - ${clientName} - Início confirmado para ${formattedDate}`;
      setEmailSubject(subj);

      const body = `Prezada Equipe,

Informamos que o pedido ${pedido.codigo} (${clientName} - ${siteName}), que se encontrava temporariamente pausado, foi REANUDADO com nova data oficial de início:

📅 Nova Data de Início: ${formattedDate}
📍 Cliente / Local: ${clientName} - ${siteName}
${observacoes ? `📝 Observações: ${observacoes}\n` : ''}
PRÓXIMAS AÇÕES DA EQUIPE:
1. [RH / Atendimento]: Reconfirmar agenda com os trabalhadores alocados e providenciar assinaturas.
2. [DP / Seguridade Social]: Programar o envio de Alta na Seguridade Social para a nova data.
3. [Recrutamento]: Retomar seleção para as vagas pendentes, se houver.
4. [Logística]: Reativar e confirmar cronograma de hospedagem, transporte e envio de EPIs.

Atenciosamente,
Coordenação de Operações`;

      setEmailBody(body);
    }
  }, [pedido.codigo, clientName, siteName, novaDataInicio, observacoes, isEs]);

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleReanudar = async () => {
    if (!novaDataInicio) {
      toast.error(t('cockpit_pedidos.reanudar_modal.toast_missing_date'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Chamar a RPC para reanudar o pedido
      const { error: rpcErr } = await supabase.rpc('processar_retomada_pedido', {
        payload: {
          pedido_id: pedido.id,
          nova_data_inicio: novaDataInicio,
          observacoes: observacoes
        }
      });

      if (rpcErr) {
        console.warn('Tentando schema core_operacoes...', rpcErr);
        const { error: retryErr } = await supabase
          .schema('core_operacoes')
          .rpc('processar_retomada_pedido', {
            payload: {
              pedido_id: pedido.id,
              nova_data_inicio: novaDataInicio,
              observacoes: observacoes
            }
          });

        if (retryErr) throw retryErr;
      }

      // 2. Enviar notificação por e-mail para a equipe se marcado
      if (sendEmailNotification) {
        const extraEmailsParsed = additionalEmails
          .split(/[,;\n]/)
          .map(e => e.trim())
          .filter(e => e.includes('@'));

        const toEmails = Array.from(new Set([...selectedEmails, ...extraEmailsParsed]));

        if (toEmails.length > 0) {
          try {
            await supabase.functions.invoke('send-order-notification', {
              body: {
                empresa_id: pedido.empresa_id,
                pedido_id: pedido.id,
                to_emails: toEmails,
                email_subject: emailSubject,
                email_body: emailBody,
                sender_email: user?.email
              }
            });
            toast.success(t('cockpit_pedidos.reanudar_modal.toast_email_sent'));
          } catch (mailErr: any) {
            console.error('Falha ao enviar e-mail de notificação:', mailErr);
            toast.warning(mailErr.message);
          }
        }
      }

      toast.success(t('cockpit_pedidos.reanudar_modal.toast_resumed', { code: pedido.codigo }));
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
      queryClient.invalidateQueries({ queryKey: ['worker_assignments'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao reanudar pedido:', err);
      toast.error(t('cockpit_pedidos.reanudar_modal.toast_error') + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <PlayCircle className="h-6 w-6" />
            <DialogTitle className="text-xl">{t('cockpit_pedidos.reanudar_modal.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('cockpit_pedidos.reanudar_modal.desc', { code: pedido.codigo })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Info Card */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3.5 text-sm text-emerald-900 dark:text-emerald-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {t('cockpit_pedidos.reanudar_modal.order_data')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-700 dark:text-slate-300">
              <div><strong>{t('cockpit_pedidos.reanudar_modal.client')}</strong> {clientName}</div>
              <div><strong>{t('cockpit_pedidos.reanudar_modal.site')}</strong> {siteName}</div>
              <div><strong>{t('cockpit_pedidos.reanudar_modal.previous_start')}</strong> {formatDateClean(pedido.expected_start_date)}</div>
              <div><strong>{t('cockpit_pedidos.reanudar_modal.current_status')}</strong> {t('cockpit_pedidos.reanudar_modal.paused')}</div>
            </div>
          </div>

          {/* Nova Data de Início */}
          <div className="space-y-1.5">
            <Label htmlFor="novaDataInicio" className="font-semibold text-sm flex items-center gap-1 text-slate-800 dark:text-slate-200">
              {t('cockpit_pedidos.reanudar_modal.new_start_label')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="novaDataInicio"
              type="date"
              value={novaDataInicio}
              onChange={e => setNovaDataInicio(e.target.value)}
              className="border-emerald-300 focus-visible:ring-emerald-500"
              required
            />
            <p className="text-xs text-muted-foreground">
              {t('cockpit_pedidos.reanudar_modal.new_start_hint')}
            </p>
          </div>

          {/* Observações da Retomada */}
          <div className="space-y-1.5">
            <Label htmlFor="observacoesRetomada" className="font-semibold text-sm text-slate-800 dark:text-slate-200">
              {t('cockpit_pedidos.reanudar_modal.notes_label')}
            </Label>
            <Textarea
              id="observacoesRetomada"
              placeholder={t('cockpit_pedidos.reanudar_modal.notes_placeholder')}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Seção de Envio de E-mail para a Equipe */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <Label htmlFor="sendEmailSwitch" className="font-semibold cursor-pointer text-sm">
                    {t('cockpit_pedidos.reanudar_modal.send_email_label')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('cockpit_pedidos.reanudar_modal.send_email_hint')}
                  </p>
                </div>
              </div>
              <Switch
                id="sendEmailSwitch"
                checked={sendEmailNotification}
                onCheckedChange={setSendEmailNotification}
              />
            </div>

            {sendEmailNotification && (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    {t('cockpit_pedidos.reanudar_modal.team_recipients')}
                  </Label>
                  {isLoadingEmails ? (
                    <div className="flex items-center text-xs text-muted-foreground py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t('cockpit_pedidos.reanudar_modal.loading_emails')}
                    </div>
                  ) : notificationEmails.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                      {notificationEmails.map(item => (
                        <label
                          key={item.id}
                          className="flex items-center space-x-2 text-xs p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedEmails.includes(item.email)}
                            onCheckedChange={() => toggleEmail(item.email)}
                          />
                          <span className="truncate">
                            {item.name ? `${item.name} (${item.email})` : item.email}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {t('cockpit_pedidos.reanudar_modal.no_emails')}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('cockpit_pedidos.reanudar_modal.additional_emails')}</Label>
                  <Input
                    placeholder="gerente@empresa.com, rh@empresa.com"
                    value={additionalEmails}
                    onChange={e => setAdditionalEmails(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('cockpit_pedidos.reanudar_modal.subject_label')}</Label>
                  <Input
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="text-xs h-8 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('cockpit_pedidos.reanudar_modal.message_label')}</Label>
                  <Textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={4}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cockpit_pedidos.reanudar_modal.cancel')}
          </Button>
          <Button
            onClick={handleReanudar}
            disabled={isSubmitting || !novaDataInicio}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('cockpit_pedidos.reanudar_modal.resuming')}
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />{' '}
                {sendEmailNotification
                  ? t('cockpit_pedidos.reanudar_modal.confirm_and_email_btn')
                  : t('cockpit_pedidos.reanudar_modal.confirm_btn')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
