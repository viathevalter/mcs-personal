import React, { useState, useEffect, useRef } from 'react';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useAuth } from '@/features/operacoes/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Bold, Italic, Underline, List, ListOrdered, Link, Loader2, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { formatDateClean } from '@/shared/utils/dateUtils';
import type { SolicitudDetail } from '../types';
import { useSolicitudTargets } from '../hooks/useSolicitudTargets';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    solicitud: SolicitudDetail;
    onSuccess?: () => void;
}

export function ResendNotificationModal({ isOpen, onClose, solicitud, onSuccess }: Props) {
    const { selectedEmpresaId } = useEmpresa();
    const { user } = useAuth();
    const { data: targets = [] } = useSolicitudTargets(solicitud.id);

    const [notificationEmails, setNotificationEmails] = useState<any[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [additionalEmails, setAdditionalEmails] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [sending, setSending] = useState(false);
    const [isSubjectEdited, setIsSubjectEdited] = useState(false);
    const [isBodyEdited, setIsBodyEdited] = useState(false);
    const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'en'>('pt');
    const editorRef = useRef<HTMLDivElement>(null);

    // Map action type to event type string
    const eventTypeMap: Record<string, string> = {
        replacement: 'reemplazo',
        relocation: 'reubicacion',
        technical_test: 'prueba',
        offboarding: 'baja',
        order_extension: 'pedido',
        order_postponement: 'pedido',
        order_termination: 'pedido'
    };
    const eventType = eventTypeMap[solicitud.tipo] || 'reemplazo';

    // Fetch configured emails when modal opens or empresa/solicitud type changes
    useEffect(() => {
        if (!isOpen || !selectedEmpresaId) return;

        const fetchEmails = async () => {
            setLoadingEmails(true);
            try {
                const { data, error } = await supabase
                    .schema('core_comercial')
                    .from('notification_emails')
                    .select('*')
                    .eq('empresa_id', selectedEmpresaId)
                    .eq('event_type', eventType);

                if (error) throw error;
                const list = data || [];
                setNotificationEmails(list);
                setSelectedEmails(list.map(e => e.email));
            } catch (err) {
                console.error("Error fetching notification emails:", err);
            } finally {
                setLoadingEmails(false);
            }
        };

        fetchEmails();
    }, [isOpen, selectedEmpresaId, eventType]);

    // Automatically build default subject and body if not manually edited
    useEffect(() => {
        if (!isOpen) return;

        const clientName = solicitud.client?.trade_name 
            || solicitud.client?.legal_name 
            || solicitud.pedido?.client?.trade_name 
            || solicitud.pedido?.client?.legal_name 
            || 'Cliente';

        const pedidoCodigo = solicitud.pedido?.codigo || 'N/A';

        const workerNames = targets
            .map(t => t.source_worker?.nome)
            .filter(Boolean)
            .join(', ');

        const dateStr = solicitud.due_date ? formatDateClean(solicitud.due_date) : '';
        const expectedStartStr = dateStr && dateStr !== 'N/A'
            ? dateStr
            : (emailLanguage === 'en' ? 'Not informed' : 'Não informado');

        let dateLabel = '';
        if (emailLanguage === 'es') {
            dateLabel = solicitud.tipo === 'offboarding' ? 'Fecha Efectiva de Baja (Salida)' :
                        solicitud.tipo === 'order_extension' ? 'Nueva Fecha de Término' :
                        solicitud.tipo === 'order_termination' ? 'Fecha de Cierre' :
                        solicitud.tipo === 'relocation' ? 'Fecha de Inicio de Reubicación' : 'Fecha de Inicio';
        } else if (emailLanguage === 'en') {
            dateLabel = solicitud.tipo === 'offboarding' ? 'Effective Termination Date' :
                        solicitud.tipo === 'order_extension' ? 'New End Date' :
                        solicitud.tipo === 'order_termination' ? 'Completion Date' :
                        solicitud.tipo === 'relocation' ? 'Relocation Start Date' : 'Start Date';
        } else {
            dateLabel = solicitud.tipo === 'offboarding' ? 'Data Efetiva da Baixa (Saída)' :
                        solicitud.tipo === 'order_extension' ? 'Nova Data de Término' :
                        solicitud.tipo === 'order_termination' ? 'Data de Encerramento' :
                        solicitud.tipo === 'relocation' ? 'Data de Início da Realocação' : 'Data de Início';
        }

        let typeLabel = '';
        if (emailLanguage === 'es') {
            typeLabel = solicitud.tipo === 'replacement' ? 'Sustitución (Reemplazo)' : 
                        solicitud.tipo === 'relocation' ? 'Reubicación' : 
                        solicitud.tipo === 'technical_test' ? 'Prueba Técnica (Prueba)' : 
                        solicitud.tipo === 'offboarding' ? 'Desvinculación (Baja)' : 
                        solicitud.tipo === 'order_extension' ? 'Prórroga de Obra' : 
                        solicitud.tipo === 'order_postponement' ? 'Aplazamiento de Inicio de Obra' : 'Finalización de Obra';
        } else if (emailLanguage === 'en') {
            typeLabel = solicitud.tipo === 'replacement' ? 'Replacement' : 
                        solicitud.tipo === 'relocation' ? 'Relocation' : 
                        solicitud.tipo === 'technical_test' ? 'Technical Test' : 
                        solicitud.tipo === 'offboarding' ? 'Termination' : 
                        solicitud.tipo === 'order_extension' ? 'Worksite Extension' : 
                        solicitud.tipo === 'order_postponement' ? 'Worksite Postponement' : 'Worksite Completion';
        } else {
            typeLabel = solicitud.tipo === 'replacement' ? 'Substituição (Reemplazo)' : 
                        solicitud.tipo === 'relocation' ? 'Realocação (Reubicación)' : 
                        solicitud.tipo === 'technical_test' ? 'Teste Técnico (Prueba)' : 
                        solicitud.tipo === 'offboarding' ? 'Desligamento (Baja)' : 
                        solicitud.tipo === 'order_extension' ? 'Prorrogação de Obra' : 
                        solicitud.tipo === 'order_postponement' ? 'Adiamento de Início de Obra' : 'Finalização de Obra';
        }

        let subject = '';
        if (emailLanguage === 'es') {
            subject = `Notificación Operativa: ${typeLabel} - ${solicitud.codigo} - ${clientName}`;
        } else if (emailLanguage === 'en') {
            subject = `Operational Notification: ${typeLabel} - ${solicitud.codigo} - ${clientName}`;
        } else {
            subject = `Notificação Operacional: ${typeLabel} - ${solicitud.codigo} - ${clientName}`;
        }

        const firstTargetReason = targets[0]?.reason || '';
        const firstTargetNotes = targets[0]?.notes || '';
        const displayReason = firstTargetReason || solicitud.description || 'Não informado';
        const displayNotes = firstTargetNotes || 'Nenhuma';

        let body = '';
        if (emailLanguage === 'es') {
            body = `<p>Hola Equipo,</p>
<p>Se notifica nuevamente la solicitud de <strong>${typeLabel}</strong> (${solicitud.codigo}).</p>
<p><strong>Detalles de la Operación:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Código del Pedido:</strong> ${pedidoCodigo}</li>
  <li><strong>Trabajador(es) Afectado(s):</strong> ${workerNames || solicitud.title || 'Ninguno seleccionado'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Motivo:</strong> ${displayReason}</li>
  <li><strong>Observaciones Extras:</strong> ${displayNotes}</li>
</ul>
<p>Por favor, realicen los trámites necesarios en sus respectivos sectores.</p>
<p>Atentamente,<br/><strong>Operaciones</strong></p>`;
        } else if (emailLanguage === 'en') {
            body = `<p>Hello Team,</p>
<p>Notification resent for <strong>${typeLabel}</strong> request (${solicitud.codigo}).</p>
<p><strong>Operation Details:</strong></p>
<ul>
  <li><strong>Client:</strong> ${clientName}</li>
  <li><strong>Order Code:</strong> ${pedidoCodigo}</li>
  <li><strong>Affected Worker(s):</strong> ${workerNames || solicitud.title || 'None selected'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Reason:</strong> ${displayReason}</li>
  <li><strong>Extra Observations:</strong> ${displayNotes}</li>
</ul>
<p>Please carry out the necessary procedures in your respective departments.</p>
<p>Best regards,<br/><strong>Operations</strong></p>`;
        } else {
            body = `<p>Olá Equipe,</p>
<p>Notificação reenviada referente à solicitação de <strong>${typeLabel}</strong> (${solicitud.codigo}).</p>
<p><strong>Detalhes da Operação:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Código do Pedido:</strong> ${pedidoCodigo}</li>
  <li><strong>Trabalhador(es) Afetado(s):</strong> ${workerNames || solicitud.title || 'Nenhum selecionado'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Motivo:</strong> ${displayReason}</li>
  <li><strong>Observações Extras:</strong> ${displayNotes}</li>
</ul>
<p>Por favor, realizem os trâmites necessários nos seus respectivos setores.</p>
<p>Atentamente,<br/><strong>Operações</strong></p>`;
        }

        if (!isSubjectEdited) setEmailSubject(subject);
        if (!isBodyEdited) setEmailBody(body);
    }, [isOpen, solicitud, targets, isSubjectEdited, isBodyEdited, emailLanguage]);

    const handleLanguageChange = (lang: 'pt' | 'es' | 'en') => {
        setEmailLanguage(lang);
        setIsSubjectEdited(false);
        setIsBodyEdited(false);
    };

    const handleFormat = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            setEmailBody(editorRef.current.innerHTML);
        }
    };

    const handleInsertLink = () => {
        const url = prompt('Digite a URL:');
        if (url) {
            handleFormat('createLink', url);
        }
    };

    const handleSendNotification = async () => {
        const extraEmailsParsed = additionalEmails
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0 && e.includes('@'));

        const toEmails = Array.from(new Set([
            ...selectedEmails,
            ...extraEmailsParsed
        ]));

        if (toEmails.length === 0) {
            toast.error('Informe pelo menos um e-mail de destinatário.');
            return;
        }

        setSending(true);
        try {
            const { error: invokeErr } = await supabase.functions.invoke('send-order-notification', {
                body: {
                    empresa_id: selectedEmpresaId || solicitud.empresa_id,
                    solicitud_id: solicitud.id,
                    to_emails: toEmails,
                    email_subject: emailSubject,
                    email_body: emailBody,
                    reply_to_email: user?.email
                }
            });

            if (invokeErr) throw invokeErr;

            // Register event in timeline
            await supabase
                .schema('core_operacoes')
                .from('solicitud_timeline')
                .insert({
                    empresa_id: selectedEmpresaId || solicitud.empresa_id,
                    solicitud_id: solicitud.id,
                    event_type: 'other',
                    title: 'Notificação por E-mail Reenviada',
                    description: `Notificação enviada para: ${toEmails.join(', ')}`,
                    created_by: user?.id
                });

            toast.success('E-mail de notificação enviado com sucesso!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to resend notification email:', err);
            toast.error('Erro ao enviar e-mail de notificação', { description: err.message });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-850 dark:text-slate-100">
                        <Mail className="h-5 w-5 text-blue-500" />
                        Reenviar Notificação Operacional por E-mail ({solicitud.codigo})
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Configure o idioma, destinatários, assunto e corpo da notificação por e-mail referente a esta solicitação.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-left">
                    {/* Linha 1: Idioma e Destinatários Adicionais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Idioma */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Idioma do E-mail</label>
                            <Select 
                                value={emailLanguage} 
                                onValueChange={(val: 'pt' | 'es' | 'en') => handleLanguageChange(val)}
                            >
                                <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                    <SelectValue placeholder="Selecione o idioma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pt" className="text-xs font-semibold">🇵🇹 Português (Padrão)</SelectItem>
                                    <SelectItem value="es" className="text-xs font-semibold">🇪🇸 Espanhol (Spanish)</SelectItem>
                                    <SelectItem value="en" className="text-xs font-semibold">🇬🇧 Inglês (English)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* E-mails Adicionais */}
                        <div className="space-y-1.5">
                            <label htmlFor="resend_additional_emails" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                E-mails Adicionais (separados por vírgula)
                            </label>
                            <Input
                                id="resend_additional_emails"
                                type="text"
                                placeholder="exemplo@empresa.com, outro@empresa.com"
                                value={additionalEmails}
                                onChange={e => setAdditionalEmails(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Destinatários Configurados */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                            Destinatários Configurados ({eventType})
                        </label>
                        {loadingEmails ? (
                            <div className="flex items-center space-x-2 text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Carregando e-mails configurados...</span>
                            </div>
                        ) : notificationEmails.length === 0 ? (
                            <p className="text-xs text-amber-600 font-medium flex items-start bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200">
                                <AlertCircle className="mr-1.5 h-4 w-4 flex-shrink-0 mt-0.5" />
                                Nenhum e-mail pré-configurado encontrado para este evento. Você pode informar destinatários no campo de e-mails adicionais acima.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border p-3 rounded-lg max-h-[120px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                                {notificationEmails.map(emailObj => (
                                    <label key={emailObj.id} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmails.includes(emailObj.email)}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setSelectedEmails(prev => [...prev, emailObj.email]);
                                                } else {
                                                    setSelectedEmails(prev => prev.filter(email => email !== emailObj.email));
                                                }
                                            }}
                                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{emailObj.email}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assunto do E-mail */}
                    <div className="space-y-1.5">
                        <label htmlFor="resend_email_subject" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                            Assunto do E-mail
                        </label>
                        <Input
                            id="resend_email_subject"
                            type="text"
                            placeholder="Assunto da notificação"
                            value={emailSubject}
                            onChange={e => {
                                setIsSubjectEdited(true);
                                setEmailSubject(e.target.value);
                            }}
                            className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    {/* Corpo do E-mail */}
                    <div className="space-y-1.5 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Corpo do E-mail
                            </label>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => {
                                    setIsSubjectEdited(false);
                                    setIsBodyEdited(false);
                                    toast.success('Modelo restaurado para o idioma selecionado.');
                                }}
                                className="h-6 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50/50"
                            >
                                Restaurar Padrão
                            </Button>
                        </div>
                        
                        {/* Toolbar */}
                        <div className="flex items-center space-x-1 border border-b-0 rounded-t-lg bg-slate-50 dark:bg-slate-900 p-1.5">
                            <button
                                type="button"
                                onClick={() => handleFormat('bold')}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Negrito"
                            >
                                <Bold className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFormat('italic')}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Itálico"
                            >
                                <Italic className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFormat('underline')}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Sublinhado"
                            >
                                <Underline className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1.5"></span>
                            <button
                                type="button"
                                onClick={() => handleFormat('insertUnorderedList')}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Lista Marcadores"
                            >
                                <List className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleFormat('insertOrderedList')}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Lista Numerada"
                            >
                                <ListOrdered className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleInsertLink}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="Inserir Link"
                            >
                                <Link className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div
                            ref={editorRef}
                            contentEditable
                            dangerouslySetInnerHTML={{ __html: emailBody }}
                            onInput={(e) => {
                                setIsBodyEdited(true);
                                setEmailBody(e.currentTarget.innerHTML);
                            }}
                            className="w-full min-h-[220px] max-h-[350px] overflow-y-auto rounded-b-lg border border-input bg-white dark:bg-slate-950 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
                            style={{ outline: 'none' }}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t mt-4 gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
                        Cancelar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleSendNotification} 
                        disabled={sending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sending ? 'Enviando...' : 'Enviar Notificação por E-mail'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
