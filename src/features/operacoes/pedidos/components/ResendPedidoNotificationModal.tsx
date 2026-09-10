import React, { useState, useEffect, useRef } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Bold, Italic, Underline, List, ListOrdered, Loader2, Send } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
  onSuccess?: () => void;
}

export function ResendPedidoNotificationModal({ isOpen, onClose, pedido, onSuccess }: Props) {
  const { selectedEmpresaId } = useEmpresa();
  const [notificationEmails, setNotificationEmails] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSubjectEdited, setIsSubjectEdited] = useState(false);
  const [isBodyEdited, setIsBodyEdited] = useState(false);
  const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'en' | 'it' | 'fr'>('pt');
  const [pedidoItems, setPedidoItems] = useState<any[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync default language from pedido
  useEffect(() => {
    if (pedido?.document_language) {
      setEmailLanguage(pedido.document_language.toLowerCase() as any);
    }
  }, [pedido?.document_language]);

  // Fetch configured notification emails & pedido items
  useEffect(() => {
    if (!isOpen || !pedido?.id) return;

    const fetchData = async () => {
      setLoadingEmails(true);
      try {
        const [emailsRes, itemsRes] = await Promise.all([
          supabase
            .schema('core_comercial')
            .from('notification_emails')
            .select('*')
            .eq('empresa_id', pedido.empresa_id || selectedEmpresaId)
            .eq('event_type', 'pedido'),
          supabase
            .schema('core_comercial')
            .from('pedido_items')
            .select('*, job_function:job_functions(name)')
            .eq('pedido_id', pedido.id)
        ]);

        if (emailsRes.data) {
          setNotificationEmails(emailsRes.data);
          setSelectedEmails(emailsRes.data.map((e: any) => e.email));
        }

        if (itemsRes.data) {
          setPedidoItems(itemsRes.data);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do pedido:', err);
      } finally {
        setLoadingEmails(false);
      }
    };

    fetchData();
  }, [isOpen, pedido?.id, pedido?.empresa_id, selectedEmpresaId]);

  // Auto-generate subject and body if not manually edited
  useEffect(() => {
    if (!isOpen || !pedido) return;

    const clientName = pedido.client?.trade_name || pedido.client?.legal_name || 'Cliente';
    const lang = emailLanguage;

    const subjects: Record<string, string> = {
      pt: `Novo Pedido Gerado - ${pedido.codigo} - ${clientName}`,
      es: `Nuevo Pedido Generado - ${pedido.codigo} - ${clientName}`,
      en: `New Order Generated - ${pedido.codigo} - ${clientName}`,
      it: `Nuovo Ordine Generato - ${pedido.codigo} - ${clientName}`,
      fr: `Nouvelle Commande Générée - ${pedido.codigo} - ${clientName}`
    };

    if (!isSubjectEdited) {
      setEmailSubject(subjects[lang] || subjects.pt);
    }

    if (!isBodyEdited) {
      const formatDate = (dateStr?: string) => {
        if (!dateStr) return lang === 'es' ? 'No definida' : lang === 'en' ? 'Not defined' : 'Não definida';
        return new Date(dateStr).toLocaleDateString(
          lang === 'pt' ? 'pt-PT' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : lang === 'it' ? 'it-IT' : 'fr-FR'
        );
      };

      const expectedStartStr = formatDate(pedido.expected_start_date);
      const expectedEndStr = formatDate(pedido.expected_end_date);
      const siteAddress = pedido.client_site?.address_line || pedido.client_site?.name || 'Não definido';
      const workStartTime = (pedido.pergunta_respuesta as any)?._horario_entrada || '08:00';

      const profilesList = (pedidoItems || []).map((item: any) => {
        const name = item.job_function?.name || item.job_function_name_snapshot || 'Perfil';
        let vagasText = 'vaga(s)';
        if (lang === 'es') vagasText = 'vacante(s)';
        else if (lang === 'en') vagasText = 'position(s)';
        else if (lang === 'it') vagasText = 'posizione/i';
        else if (lang === 'fr') vagasText = 'poste(s)';
        return `<li>${name}: ${item.quantity_requested || item.quantity || 1} ${vagasText}</li>`;
      }).join('');

      const cleanNotes = (pedido.notes || '').trim();
      let notesSection = '';
      if (cleanNotes) {
        notesSection = `<p><strong>${lang === 'es' ? 'Observaciones Generales / Instrucciones:' : 'Observações Gerais / Instruções:'}</strong></p><div>${cleanNotes}</div>`;
      }

      let bodyHtml = '';
      if (lang === 'es') {
        bodyHtml = `
<p>Hola Equipo,</p>
<p>Se notifica el pedido de venta <strong>${pedido.codigo}</strong>.</p>
<p><strong>Resumen del Pedido:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Obra/Ubicación:</strong> ${siteAddress}</li>
  <li><strong>Fecha de Inicio Prevista:</strong> ${expectedStartStr}</li>
  <li><strong>Fecha de Fin Prevista:</strong> ${expectedEndStr}</li>
  <li><strong>Horario de Entrada / Inicio de Jornada:</strong> ${workStartTime}</li>
</ul>
<p><strong>Cargos/Funciones Solicitados:</strong></p>
<ul>
  ${profilesList || '<li>Perfiles conforme documento operacional adjunto</li>'}
</ul>
${notesSection}
<p>El documento de Pedido Operacional en PDF ha sido adjuntado a esta notificación para su revisión y trámites operacionales.</p>
<p>Por favor, inicien los trámites de movilización, contratación y logística necesarios.</p>
<p>Atentamente,<br/><strong>Comercial</strong></p>`;
      } else {
        bodyHtml = `
<p>Olá Equipe,</p>
<p>Notificamos a emissão do pedido <strong>${pedido.codigo}</strong>.</p>
<p><strong>Resumo do Pedido:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Obra/Localização:</strong> ${siteAddress}</li>
  <li><strong>Data de Início Prevista:</strong> ${expectedStartStr}</li>
  <li><strong>Data de Fim Prevista:</strong> ${expectedEndStr}</li>
  <li><strong>Horário de Entrada / Início do Trabalho:</strong> ${workStartTime}</li>
</ul>
<p><strong>Cargos/Funções Solicitados:</strong></p>
<ul>
  ${profilesList || '<li>Perfis conforme documento operacional anexo</li>'}
</ul>
${notesSection}
<p>O documento de Pedido Operacional em PDF está anexado a esta mensagem.</p>
<p>Por favor, iniciem os trâmites necessários.</p>
<p>Atenciosamente,<br/><strong>Comercial</strong></p>`;
      }

      setEmailBody(bodyHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = bodyHtml;
      }
    }
  }, [isOpen, pedido, pedidoItems, emailLanguage, isSubjectEdited, isBodyEdited]);

  const handleFormat = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEmailBody(editorRef.current.innerHTML);
      setIsBodyEdited(true);
    }
  };

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSelectAll = () => {
    setSelectedEmails(notificationEmails.map(e => e.email));
  };

  const handleDeselectAll = () => {
    setSelectedEmails([]);
  };

  const handleSend = async () => {
    const toEmails = [...selectedEmails];
    if (additionalEmails.trim()) {
      const extraList = additionalEmails.split(/[,;\n]/).map(e => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const extra of extraList) {
        if (!emailRegex.test(extra)) {
          toast.error(`O e-mail adicional "${extra}" é inválido.`);
          return;
        }
        if (!toEmails.includes(extra)) {
          toEmails.push(extra);
        }
      }
    }

    if (toEmails.length === 0) {
      toast.error('Selecione pelo menos um destinatário para o envio.');
      return;
    }

    try {
      setSending(true);
      const { error: invokeErr } = await supabase.functions.invoke('send-order-notification', {
        body: {
          pedido_id: pedido.id,
          to_emails: toEmails,
          email_subject: emailSubject,
          email_body: emailBody
        }
      });

      if (invokeErr) {
        throw invokeErr;
      }

      toast.success('Notificação de pedido reenviada com sucesso!', {
        description: `E-mail disparado para ${toEmails.length} destinatário(s).`
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao reenviar notificação do pedido:', err);
      toast.error('Falha ao reenviar notificação', { description: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-indigo-600" />
            Reenviar Notificação de Pedido ({pedido?.codigo})
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dispare novamente o e-mail oficial com o Pedido Operacional em PDF para a equipe operacional e administrativa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Idioma */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Idioma do Conteúdo:</span>
            <Select
              value={emailLanguage}
              onValueChange={(val: any) => {
                setEmailLanguage(val);
                setIsSubjectEdited(false);
                setIsBodyEdited(false);
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português (PT)</SelectItem>
                <SelectItem value="es">Espanhol (ES)</SelectItem>
                <SelectItem value="en">Inglês (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Destinatários */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Destinatários Cadastrados ({selectedEmails.length}/{notificationEmails.length} selecionados)
              </label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={handleSelectAll} className="text-indigo-600 hover:underline">
                  Selecionar Todos
                </button>
                <span>•</span>
                <button type="button" onClick={handleDeselectAll} className="text-slate-500 hover:underline">
                  Limpar
                </button>
              </div>
            </div>

            {loadingEmails ? (
              <div className="flex items-center justify-center p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-2" />
                <span className="text-xs text-slate-500">Carregando lista de e-mails...</span>
              </div>
            ) : notificationEmails.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded border border-amber-200">
                Nenhum e-mail padrão configurado para o evento "pedido" nesta empresa.
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto border rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {notificationEmails.map(item => (
                  <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer select-none p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(item.email)}
                      onChange={() => handleToggleEmail(item.email)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span className="truncate">{item.email}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                E-mails adicionais (separados por vírgula ou ponto-e-vírgula):
              </label>
              <Input
                placeholder="exemplo@gestaologinpro.com, outro@empresa.com"
                value={additionalEmails}
                onChange={e => setAdditionalEmails(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assunto do E-mail
            </label>
            <Input
              value={emailSubject}
              onChange={e => {
                setEmailSubject(e.target.value);
                setIsSubjectEdited(true);
              }}
              className="h-8 text-xs font-medium"
            />
          </div>

          {/* Corpo do E-mail */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mensagem do E-mail (HTML)
              </label>
              <div className="flex items-center gap-1 border rounded p-0.5 bg-slate-50 dark:bg-slate-900">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFormat('bold')} title="Negrito">
                  <Bold className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFormat('italic')} title="Itálico">
                  <Italic className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFormat('underline')} title="Sublinhado">
                  <Underline className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFormat('insertUnorderedList')} title="Lista">
                  <List className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFormat('insertOrderedList')} title="Lista Numerada">
                  <ListOrdered className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={e => {
                setEmailBody((e.target as HTMLDivElement).innerHTML);
                setIsBodyEdited(true);
              }}
              className="border rounded-md p-3 min-h-[160px] max-h-[220px] overflow-y-auto text-xs font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-950"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex justify-between sm:justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando E-mail...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Reenviar Notificação Agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
