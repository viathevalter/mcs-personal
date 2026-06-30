import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, FileText, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link, Loader2, AlertCircle } from 'lucide-react';
import { useWorkerAssignments } from './hooks/useWorkerAssignments';
import { useCreateSolicitud } from './hooks/useCreateSolicitud';
import { AssignmentsSelectionTable } from './components/AssignmentsSelectionTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { supabase } from '@/shared/supabase/client';

export function NewSolicitudPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('tipo') || 'replacement';
    const initialClientId = searchParams.get('client_id') || 'all';
    const initialSiteId = searchParams.get('site_id') || 'all';
    
    const { selectedEmpresaId } = useEmpresa();
    const { data: clients = [] } = useClients();
    
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
    const [selectedClientSiteId, setSelectedClientSiteId] = useState<string>(initialSiteId);
    const { data: clientSites = [] } = useClientSites(selectedClientId !== 'all' ? selectedClientId : undefined);

    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
    const [workerSearch, setWorkerSearch] = useState('');
    const [pedidoSearch, setPedidoSearch] = useState('');
    
    // Solicitud Form State
    const [actionType, setActionType] = useState<string>(initialType);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');
    const [dueDate, setDueDate] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    // Email Notification State
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    const [notificationEmails, setNotificationEmails] = useState<any[]>([]);
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [additionalEmails, setAdditionalEmails] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [loadingEmails, setLoadingEmails] = useState(false);
    const [isSubjectEdited, setIsSubjectEdited] = useState(false);
    const [isBodyEdited, setIsBodyEdited] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    // Target Client/Site and Housing logistics state for Relocations
    const [targetClientId, setTargetClientId] = useState<string>('all');
    const [targetClientSiteId, setTargetClientSiteId] = useState<string>('all');
    const { data: targetClientSites = [] } = useClientSites(targetClientId !== 'all' ? targetClientId : undefined);

    const [requiresHousing, setRequiresHousing] = useState<boolean>(false);
    const [housingStartDate, setHousingStartDate] = useState<string>('');
    const [housingEndDate, setHousingEndDate] = useState<string>('');
    const [requiresReplacement, setRequiresReplacement] = useState<boolean>(true);

    const { data: assignments = [] } = useWorkerAssignments({
        empresa_id: selectedEmpresaId,
        client_id: selectedClientId !== 'all' ? selectedClientId : null,
        client_site_id: selectedClientSiteId !== 'all' ? selectedClientSiteId : null,
    });

    const { createSolicitudWithTargets } = useCreateSolicitud();

    const filteredAssignments = assignments.filter(a => {
        // Filter by worker name or code
        if (workerSearch.trim()) {
            const workerName = a.worker?.nome || '';
            const workerCode = a.worker?.cod_colab || '';
            const searchLower = workerSearch.toLowerCase();
            const matchesWorker = workerName.toLowerCase().includes(searchLower) || workerCode.toLowerCase().includes(searchLower);
            if (!matchesWorker) return false;
        }

        // Filter by pedido code
        if (pedidoSearch.trim()) {
            const pedidoCodigo = a.pedido?.codigo || '';
            const searchLower = pedidoSearch.toLowerCase();
            const matchesPedido = pedidoCodigo.toLowerCase().includes(searchLower);
            if (!matchesPedido) return false;
        }

        return true;
    });

    // Reset site when client changes (but skip the first initialization if from URL)
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setSelectedClientSiteId('all');
    }, [selectedClientId]);

    // Reset target site when target client changes
    useEffect(() => {
        setTargetClientSiteId('all');
    }, [targetClientId]);

    // Default title based on type and selected targets
    useEffect(() => {
        const typeName = actionType === 'replacement' ? 'Substituição (Reemplazo)' : 
                         actionType === 'relocation' ? 'Realocação' : 
                         actionType === 'technical_test' ? 'Prueba (Teste Técnico)' : 
                         actionType === 'offboarding' ? 'Desligamento' : 'Operação';
        
        if (selectedAssignments.length > 0) {
            setTitle(`${typeName} de ${selectedAssignments.length} trabalhador(es)`);
        } else {
            setTitle(`Nova Solicitação de ${typeName}`);
        }
    }, [actionType, selectedAssignments.length]);

    // Load configured notification emails when empresa or actionType changes
    useEffect(() => {
        const fetchEmails = async () => {
            if (!selectedEmpresaId) return;
            setLoadingEmails(true);
            try {
                const eventTypeMap: Record<string, string> = {
                    replacement: 'reemplazo',
                    relocation: 'reubicacion',
                    technical_test: 'prueba',
                    offboarding: 'baja'
                };
                const eventType = eventTypeMap[actionType] || 'reemplazo';

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
    }, [selectedEmpresaId, actionType]);

    // Automatically update the subject and body if they haven't been manually edited
    useEffect(() => {
        const selectedList = assignments.filter(a => selectedAssignments.includes(a.id));
        const firstAssignment = selectedList[0];
        const clientName = firstAssignment?.client?.trade_name || firstAssignment?.client?.legal_name || 'Cliente';
        const workerNames = selectedList.map(a => a.worker?.nome).filter(Boolean).join(', ');
        const expectedStartStr = dueDate 
            ? new Date(dueDate).toLocaleDateString('pt-PT')
            : 'Não informado';

        const typeLabel = actionType === 'replacement' ? 'Substituição (Reemplazo)' : 
                          actionType === 'relocation' ? 'Realocação (Reubicación)' : 
                          actionType === 'technical_test' ? 'Teste Técnico (Prueba)' : 'Desligamento (Baja)';

        const pedidoCodigo = firstAssignment?.pedido?.codigo || firstAssignment?.pedido_codigo || 'N/A';

        if (!isSubjectEdited) {
            const subject = `Notificação Operacional: ${typeLabel} - ${pedidoCodigo} - ${clientName}`;
            setEmailSubject(subject);
        }

        if (!isBodyEdited) {
            const body = `<p>Olá Equipe,</p>
<p>Uma nova solicitação de <strong>${typeLabel}</strong> foi registrada no sistema.</p>
<p><strong>Detalhes da Operação:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Código do Pedido:</strong> ${pedidoCodigo}</li>
  <li><strong>Trabalhador(es) Afetado(s):</strong> ${workerNames || 'Nenhum selecionado'}</li>
  <li><strong>Data de Início:</strong> ${expectedStartStr}</li>
  <li><strong>Motivo:</strong> ${reason || 'Não informado'}</li>
  <li><strong>Observações Extras:</strong> ${notes || 'Nenhuma'}</li>
</ul>
<p>Por favor, realizem os trâmites necessários nos seus respectivos setores.</p>
<p>Atentamente,<br/><strong>Operações</strong></p>`;
            setEmailBody(body);
        }
    }, [actionType, selectedAssignments, assignments, dueDate, reason, notes, isSubjectEdited, isBodyEdited]);

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

    const handleToggleSelection = (id: string) => {
        setSelectedAssignments(prev => 
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const handleToggleAll = () => {
        const visibleIds = filteredAssignments.map(a => a.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedAssignments.includes(id));
        if (allVisibleSelected) {
            setSelectedAssignments(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedAssignments(prev => {
                const next = [...prev];
                visibleIds.forEach(id => {
                    if (!next.includes(id)) next.push(id);
                });
                return next;
            });
        }
    };

    const handleSubmit = async () => {
        if (selectedAssignments.length === 0) return;
        if (!reason.trim()) {
            return;
        }

        const selectedList = assignments.filter(a => selectedAssignments.includes(a.id));
        const firstAssignment = selectedList[0];
        const originPedidoId = firstAssignment?.pedido_id || null;

        // Map the selected assignments to the payload target structure
        const targets = selectedList.map(a => ({
            source_assignment_id: a.id,
            source_worker_id: a.worker_id,
            source_pedido_id: a.pedido_id,
            source_pedido_item_id: a.pedido_item_id,
            source_client_id: a.client_id,
            source_client_site_id: a.client_site_id,
            target_client_id: actionType === 'relocation' && targetClientId !== 'all' ? targetClientId : null,
            target_client_site_id: actionType === 'relocation' && targetClientSiteId !== 'all' ? targetClientSiteId : null,
            requires_housing: actionType === 'relocation' ? requiresHousing : false,
            housing_start_date: actionType === 'relocation' && requiresHousing && housingStartDate ? housingStartDate : null,
            housing_end_date: actionType === 'relocation' && requiresHousing && housingEndDate ? housingEndDate : null,
            requires_replacement: actionType === 'offboarding' ? requiresReplacement : true,
            action_type: (actionType === 'replacement' ? 'replace' : 
                          actionType === 'relocation' ? 'relocate' : 
                          actionType === 'offboarding' ? 'offboard' : 
                          actionType === 'technical_test' ? 'test' : 'replace') as 'replace' | 'relocate' | 'offboard' | 'test',
            reason: reason,
            notes: notes
        }));

        const payload = {
            empresa_id: selectedEmpresaId!,
            type: actionType,
            title: title,
            description: notes || `Solicitação gerada para ${selectedAssignments.length} alvo(s)`,
            priority: priority,
            due_date: (actionType === 'offboarding' && !requiresReplacement) ? null : (dueDate ? new Date(dueDate).toISOString() : null),
            origin_pedido_id: originPedidoId,
            client_id: actionType === 'relocation' && targetClientId !== 'all' ? targetClientId : null,
            client_site_id: actionType === 'relocation' && targetClientSiteId !== 'all' ? targetClientSiteId : null,
            targets: targets
        };

        try {
            const newSolicitudId = await createSolicitudWithTargets.mutateAsync(payload);

            // Send notification emails for the operational action if selected
            try {
                if (sendEmailNotification) {
                    const extraEmailsParsed = additionalEmails
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0 && e.includes('@'));

                    const toEmails = Array.from(new Set([
                        ...selectedEmails,
                        ...extraEmailsParsed
                    ]));

                    if (toEmails.length > 0) {
                        await supabase.functions.invoke('send-order-notification', {
                            body: {
                                empresa_id: selectedEmpresaId,
                                to_emails: toEmails,
                                email_subject: emailSubject,
                                email_body: emailBody,
                                solicitud_id: newSolicitudId
                            }
                        });
                    }
                }
            } catch (emailErr) {
                console.error("Failed to send operational notification email", emailErr);
            }

            navigate(`/operacoes/solicitudes/${newSolicitudId}`);
        } catch (error) {
            console.error("Failed to create solicitud", error);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] lg:h-[calc(100vh-136px)] overflow-hidden space-y-4 md:space-y-6 p-1 md:p-2 lg:p-3 w-full max-w-[1920px] mx-auto">
            <div className="flex items-center space-x-4 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => navigate('/operacoes/solicitudes')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Operação sobre Alocações</h1>
                    <p className="text-muted-foreground">
                        Selecione os trabalhadores ativos e inicie processos de substituição, realocação ou desligamento.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 flex-1 min-h-0 overflow-hidden">
                
                {/* Esquerda: Filtros e Tabela */}
                <div className="lg:col-span-3 xl:col-span-4 h-full flex flex-col min-h-0 overflow-hidden">
                    <div className="bg-white dark:bg-slate-950 p-3 md:p-4 rounded-md border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                            <Users className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold">1. Buscar Alocações (Trabalhadores)</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente</label>
                                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos os Clientes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Clientes</SelectItem>
                                            {clients.map(c => (
                                                <SelectItem key={c.id} value={c.id || ''}>{c.trade_name || c.legal_name || ''}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra / Local</label>
                                    <Select value={selectedClientSiteId} onValueChange={setSelectedClientSiteId} disabled={selectedClientId === 'all'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={selectedClientId === 'all' ? 'Selecione um cliente primeiro' : 'Todas as Obras'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as Obras</SelectItem>
                                            {clientSites.map(s => (
                                                <SelectItem key={s.id} value={s.id || ''}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Código do Pedido</label>
                                    <Input 
                                        placeholder="Ex: PED-2026-..."
                                        value={pedidoSearch}
                                        onChange={e => setPedidoSearch(e.target.value)}
                                        className="h-10 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buscar Trabalhador</label>
                                <Input 
                                    placeholder="Buscar por nome ou código do trabalhador..."
                                    value={workerSearch}
                                    onChange={e => setWorkerSearch(e.target.value)}
                                    className="h-10 text-sm w-full"
                                />
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col pt-2 overflow-hidden">
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Resultados ({filteredAssignments.length})</span>
                                {selectedAssignments.length > 0 && (
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                        {selectedAssignments.length} selecionado(s)
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-card">
                                <AssignmentsSelectionTable 
                                    assignments={filteredAssignments}
                                    selectedIds={selectedAssignments}
                                    onToggleSelection={handleToggleSelection}
                                    onToggleAll={handleToggleAll}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Direita: Formulário de Solicitação */}
                <div className="h-full overflow-y-auto pr-1">
                    <div className="bg-white dark:bg-slate-950 p-3 md:p-4 rounded-md border shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-semibold">2. Detalhes da Solicitação</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Ação</label>
                                <Select value={actionType} onValueChange={setActionType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="replacement">Reemplazo (Substituição)</SelectItem>
                                        <SelectItem value="relocation">Reubicación (Realocação)</SelectItem>
                                        <SelectItem value="technical_test">Prueba (Teste Técnico)</SelectItem>
                                        <SelectItem value="offboarding">Baja (Desligamento)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Título Automático</label>
                                <Input 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ex: Reemplazo para Google..." 
                                />
                            </div>

                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prioridade</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Prioridade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baixa</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {actionType === 'offboarding' && (
                                <div className="flex items-center space-x-2 pt-1 pb-2">
                                    <input 
                                        type="checkbox"
                                        id="requiresReplacement"
                                        checked={requiresReplacement}
                                        onChange={e => {
                                            setRequiresReplacement(e.target.checked);
                                            if (!e.target.checked) setDueDate('');
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="requiresReplacement" className="text-sm font-semibold text-slate-705 dark:text-slate-300 cursor-pointer">
                                        Repor vaga com nova contratação?
                                    </label>
                                </div>
                            )}

                            {((actionType !== 'offboarding') || (actionType === 'offboarding' && requiresReplacement)) && (
                                 <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {actionType === 'relocation' ? 'Data de Início da Realocação' : 'Data de Início da Nova Contratação'}
                                    </label>
                                    <Input 
                                        type="date"
                                        value={dueDate} 
                                        onChange={e => setDueDate(e.target.value)}
                                        className="h-10 text-sm"
                                    />
                                </div>
                            )}

                            {actionType === 'relocation' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cliente de Destino</label>
                                        <Select value={targetClientId} onValueChange={setTargetClientId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o Cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Selecione o Cliente</SelectItem>
                                                {clients.map(c => (
                                                    <SelectItem key={c.id} value={c.id || ''}>{c.trade_name || c.legal_name || ''}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Obra / Local de Destino</label>
                                        <Select value={targetClientSiteId} onValueChange={setTargetClientSiteId} disabled={targetClientId === 'all'}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={targetClientId === 'all' ? 'Selecione o cliente de destino primeiro' : 'Selecione a Obra'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Selecione a Obra</SelectItem>
                                                {targetClientSites.map(s => (
                                                    <SelectItem key={s.id} value={s.id || ''}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-2 pb-1">
                                        <input 
                                            type="checkbox"
                                            id="requiresHousing"
                                            checked={requiresHousing}
                                            onChange={e => setRequiresHousing(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="requiresHousing" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                            Necessita de Alojamento?
                                        </label>
                                    </div>

                                    {requiresHousing && (
                                        <div className="grid grid-cols-2 gap-2 pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-0">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500">Início do Alojamento</label>
                                                <Input 
                                                    type="date"
                                                    value={housingStartDate} 
                                                    onChange={e => setHousingStartDate(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-500">Fim do Alojamento</label>
                                                <Input 
                                                    type="date"
                                                    value={housingEndDate} 
                                                    onChange={e => setHousingEndDate(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Motivo (Reason) <span className="text-red-500">*</span></label>
                                <Textarea 
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Explique o motivo desta ação operacional..." 
                                    className="resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observações Extras</label>
                                <Textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Instruções para o RH ou Operações..." 
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Seção de Notificação por E-mail */}
                            <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input 
                                        type="checkbox"
                                        id="sendEmailNotification"
                                        checked={sendEmailNotification}
                                        onChange={e => setSendEmailNotification(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="sendEmailNotification" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Enviar Notificação por E-mail?
                                    </label>
                                </div>

                                {sendEmailNotification && (
                                    <div className="space-y-4 pl-6 border-l-2 border-slate-200 dark:border-slate-800">
                                        {/* Destinatários Configurados */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                                                Destinatários de Notificação ({actionType === 'replacement' ? 'Reemplazo' : actionType === 'relocation' ? 'Reubicación' : actionType === 'technical_test' ? 'Prueba' : 'Baja'})
                                            </label>
                                            {loadingEmails ? (
                                                <div className="flex items-center space-x-2 text-slate-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span className="text-xs">Carregando e-mails...</span>
                                                </div>
                                            ) : notificationEmails.length === 0 ? (
                                                <p className="text-xs text-amber-600 font-medium flex items-start bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200">
                                                    <AlertCircle className="mr-1.5 h-4 w-4 flex-shrink-0 mt-0.5" />
                                                    Nenhum e-mail configurado para este evento nas Configurações.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-2 border p-3 rounded-lg max-h-[120px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                                                    {notificationEmails.map(emailObj => (
                                                        <label key={emailObj.id} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
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

                                        {/* E-mails Adicionais */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="additional_emails" className="text-xs font-bold block">
                                                E-mails Adicionais (separados por vírgula)
                                            </label>
                                            <Input
                                                id="additional_emails"
                                                type="text"
                                                placeholder="exemplo@empresa.com, outro@empresa.com"
                                                value={additionalEmails}
                                                onChange={e => setAdditionalEmails(e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>

                                        {/* Assunto do E-mail */}
                                        <div className="space-y-1.5">
                                            <label htmlFor="email_subject" className="text-xs font-bold block">
                                                Assunto do E-mail
                                            </label>
                                            <Input
                                                id="email_subject"
                                                type="text"
                                                placeholder="Assunto da notificação"
                                                value={emailSubject}
                                                onChange={e => {
                                                    setIsSubjectEdited(true);
                                                    setEmailSubject(e.target.value);
                                                }}
                                                className="h-9 text-xs font-semibold"
                                            />
                                        </div>

                                        {/* Corpo do E-mail (Editor Simulado) */}
                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-xs font-bold block">
                                                Corpo do E-mail
                                            </label>
                                            
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
                                                <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></span>
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
                                                className="w-full min-h-[180px] max-h-[300px] overflow-y-auto rounded-b-lg border border-input bg-white dark:bg-slate-950 px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
                                                style={{ outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 mt-2 border-t">
                            <Button 
                                className="w-full" 
                                size="lg"
                                disabled={selectedAssignments.length === 0 || !reason.trim() || createSolicitudWithTargets.isPending}
                                onClick={handleSubmit}
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                {createSolicitudWithTargets.isPending ? 'Criando...' : 'Iniciar Operação'}
                            </Button>
                            {selectedAssignments.length === 0 && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    Selecione pelo menos um trabalhador na tabela.
                                </p>
                            )}
                            {selectedAssignments.length > 0 && !reason.trim() && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    Informe um motivo para continuar.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
