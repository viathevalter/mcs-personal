import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, FileText, CheckCircle2, Bold, Italic, Underline, List, ListOrdered, Link, Loader2, AlertCircle, Mail, RotateCcw, HelpCircle } from 'lucide-react';
import { useWorkerAssignments } from './hooks/useWorkerAssignments';
import { useCreateSolicitud } from './hooks/useCreateSolicitud';
import { AssignmentsSelectionTable } from './components/AssignmentsSelectionTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { supabase } from '@/shared/supabase/client';
import { usePedidos } from '../pedidos/hooks/usePedidos';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useJobFunctions } from '@/features/master-data/job-functions/hooks/useJobFunctions';
import { jobFunctionQuestionsApi } from '@/features/master-data/job-functions/api/jobFunctionQuestionsApi';

const DRAFT_STORAGE_KEY = 'mcs:new_solicitud_draft';

export function formatLocalDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const cleanStr = dateStr.split('T')[0].split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return dateStr;
}

export function NewSolicitudPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get('tipo') || 'replacement';
    const initialClientId = searchParams.get('client_id') || 'all';
    const initialSiteId = searchParams.get('site_id') || 'all';
    
    const { selectedEmpresaId } = useEmpresa();
    const { user } = useAuth();
    const { data: clients = [] } = useClients();
    
    const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
    const [selectedClientSiteId, setSelectedClientSiteId] = useState<string>(initialSiteId);
    const { data: clientSites = [] } = useClientSites(selectedClientId !== 'all' ? selectedClientId : undefined);

    const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
    const [workerSearch, setWorkerSearch] = useState('');
    const [pedidoSearch, setPedidoSearch] = useState('');
    
    const initialPedidoId = searchParams.get('pedido_id') || 'all';
    const [selectedPedidoId, setSelectedPedidoId] = useState<string>(initialPedidoId);
    const { data: pedidosData } = usePedidos();
    const pedidos = pedidosData?.pedidos || [];
    const [parentSolicitud, setParentSolicitud] = useState<{ id: string; codigo: string; title: string } | null>(null);
    
    // Solicitud Form State
    const [actionType, setActionType] = useState<string>(initialType);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('normal');
    const [dueDate, setDueDate] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    // Job Function and Question States
    const { data: jobFunctions = [] } = useJobFunctions(selectedEmpresaId);
    const [targetFunctions, setTargetFunctions] = useState<Record<string, { id: string; name: string }>>({});
    const [answers, setAnswers] = useState<Record<string, Record<string, { pergunta: string; resposta: string; cargo: string }>>>({});
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

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
    const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'en'>('pt');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Target Client/Site and Housing logistics state for Relocations
    const [targetClientId, setTargetClientId] = useState<string>('all');
    const [targetClientSiteId, setTargetClientSiteId] = useState<string>('all');
    const { data: targetClientSites = [] } = useClientSites(targetClientId !== 'all' ? targetClientId : undefined);

    const [requiresHousing, setRequiresHousing] = useState<boolean>(false);
    const [housingStartDate, setHousingStartDate] = useState<string>('');
    const [housingEndDate, setHousingEndDate] = useState<string>('');
    const [requiresReplacement, setRequiresReplacement] = useState<boolean>(false);

    // Form Persistence / Draft state
    const isDraftLoadedRef = useRef(false);
    const isRestoringDraftRef = useRef(false);
    const [isDraftRestored, setIsDraftRestored] = useState(false);

    const { data: assignments = [] } = useWorkerAssignments({
        empresa_id: selectedEmpresaId,
        client_id: null,
        client_site_id: null,
        pedido_id: null
    });

    const { createSolicitudWithTargets } = useCreateSolicitud();

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedClientName = selectedClient?.trade_name || selectedClient?.legal_name || '';

    const filteredDropdownPedidos = selectedClientId !== 'all' 
        ? pedidos.filter(p => {
            const pClientName = p.client?.trade_name || p.client?.legal_name || '';
            return pClientName.toLowerCase() === selectedClientName.toLowerCase();
          }) 
        : pedidos;

    const filteredAssignments = assignments.filter(a => {
        // Filter by Client
        if (selectedClientId !== 'all') {
            const assignmentClientName = a.client?.trade_name || a.client?.legal_name || '';
            if (assignmentClientName.toLowerCase() !== selectedClientName.toLowerCase()) {
                return false;
            }
        }

        // Filter by Pedido (Obra)
        if ((actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') && selectedPedidoId !== 'all') {
            const selectedPedido = pedidos.find(p => p.id?.toString() === selectedPedidoId);
            const selectedPedidoCode = selectedPedido?.codigo || '';
            const assignmentPedidoCode = a.pedido?.codigo || '';
            if (assignmentPedidoCode.toLowerCase() !== selectedPedidoCode.toLowerCase()) {
                return false;
            }
        }

        // Filter by Client Site (for other types)
        if (actionType !== 'order_extension' && actionType !== 'order_termination' && actionType !== 'order_postponement' && selectedClientSiteId !== 'all') {
            const selectedSite = clientSites.find(s => s.id === selectedClientSiteId);
            const selectedSiteName = selectedSite?.name || '';
            const assignmentSiteName = a.client_site?.name || '';
            if (assignmentSiteName.toLowerCase() !== selectedSiteName.toLowerCase()) {
                return false;
            }
        }

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

    // Reset site and pedido when client changes (but skip the first initialization if from URL or when restoring draft)
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current || isRestoringDraftRef.current) {
            isFirstRender.current = false;
            return;
        }
        setSelectedClientSiteId('all');
        setSelectedPedidoId('all');
    }, [selectedClientId]);

    // Reset target site when target client changes
    useEffect(() => {
        if (isRestoringDraftRef.current) return;
        setTargetClientSiteId('all');
    }, [targetClientId]);

    // Auto-select workers from selected Pedido for order-level operations
    useEffect(() => {
        if (isRestoringDraftRef.current) return;

        if ((actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') && selectedPedidoId !== 'all') {
            const selectedPedido = pedidos.find(p => p.id?.toString() === selectedPedidoId);
            if (selectedPedido) {
                const selectedPedidoCode = selectedPedido.codigo || '';
                const matchingAssignments = assignments.filter(a => {
                    const assignmentPedidoCode = a.pedido?.codigo || '';
                    return assignmentPedidoCode.toLowerCase() === selectedPedidoCode.toLowerCase();
                });
                const nextIds = matchingAssignments.map(a => a.id);
                setSelectedAssignments(prev => {
                    if (prev.length === nextIds.length && prev.every(id => nextIds.includes(id))) {
                        return prev;
                    }
                    return nextIds;
                });
            }
        }
    }, [selectedPedidoId, actionType, assignments, pedidos]);

    // Pre-select functions for each selected worker
    useEffect(() => {
        if (actionType === 'replacement' && selectedAssignments.length > 0 && jobFunctions.length > 0) {
            setTargetFunctions(prev => {
                const next = { ...prev };
                let changed = false;
                selectedAssignments.forEach(id => {
                    if (!next[id]) {
                        const single = assignments.find(a => a.id === id);
                        if (single) {
                            const workerJobFuncName = single.job_function?.name || single.job_function_name_snapshot;
                            if (workerJobFuncName) {
                                const matchedJobFunc = jobFunctions.find(
                                    jf => jf.name.toLowerCase() === workerJobFuncName.toLowerCase()
                                );
                                if (matchedJobFunc) {
                                    next[id] = { id: matchedJobFunc.id || '', name: matchedJobFunc.name };
                                    changed = true;
                                } else {
                                    next[id] = { id: '', name: workerJobFuncName };
                                    changed = true;
                                }
                            }
                        }
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [selectedAssignments, actionType, jobFunctions, assignments]);

    // Query parent solicitude for selected Pedido
    useEffect(() => {
        if (selectedPedidoId && selectedPedidoId !== 'all') {
            supabase
                .schema('core_operacoes')
                .from('solicitudes_operativas')
                .select('id, codigo, title')
                .eq('pedido_id', selectedPedidoId)
                .eq('tipo', 'new_order')
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        setParentSolicitud(data);
                    } else {
                        setParentSolicitud(null);
                    }
                });
        } else {
            setParentSolicitud(null);
        }
    }, [selectedPedidoId]);

    // Default title based on type and selected targets
    useEffect(() => {
        const shortTypeName = actionType === 'replacement' ? 'Reemplazo' :
                              actionType === 'relocation' ? 'Realocação' :
                              actionType === 'technical_test' ? 'Prueba' :
                              actionType === 'offboarding' ? 'Desligamento' :
                              actionType === 'order_extension' ? 'Prorrogação' :
                              actionType === 'order_postponement' ? 'Adiamento' :
                              actionType === 'order_termination' ? 'Finalização' : 'Operação';

        const typeName = actionType === 'replacement' ? 'Substituição (Reemplazo)' : 
                         actionType === 'relocation' ? 'Realocação' : 
                         actionType === 'technical_test' ? 'Prueba (Teste Técnico)' : 
                         actionType === 'offboarding' ? 'Desligamento' : 
                         actionType === 'order_extension' ? 'Prorrogação de Obra' : 
                         actionType === 'order_postponement' ? 'Adiamento de Início de Obra' : 
                         actionType === 'order_termination' ? 'Finalização de Obra' : 'Operação';
        
        if (selectedAssignments.length === 1) {
            const single = assignments.find(a => selectedAssignments.includes(a.id));
            const workerName = single?.worker?.nome || single?.worker_nome;
            setTitle(workerName ? `${workerName} - ${shortTypeName}` : `${typeName} de 1 trabalhador`);
        } else if (selectedAssignments.length > 1) {
            setTitle(`${typeName} de ${selectedAssignments.length} trabalhador(es)`);
        } else {
            setTitle(`Nova Solicitação de ${typeName}`);
        }
    }, [actionType, selectedAssignments, assignments]);

    // Load draft from localStorage on mount
    useEffect(() => {
        if (isDraftLoadedRef.current) return;
        isDraftLoadedRef.current = true;

        try {
            const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (saved) {
                const draft = JSON.parse(saved);
                isRestoringDraftRef.current = true;

                if (draft.reason !== undefined && draft.reason !== '') setReason(draft.reason);
                if (draft.notes !== undefined && draft.notes !== '') setNotes(draft.notes);
                if (draft.priority !== undefined) setPriority(draft.priority);
                if (draft.dueDate !== undefined && draft.dueDate !== '') setDueDate(draft.dueDate);
                if (draft.title !== undefined && draft.title !== '') setTitle(draft.title);
                if (draft.requiresReplacement !== undefined) setRequiresReplacement(draft.requiresReplacement);
                if (draft.targetClientId !== undefined) setTargetClientId(draft.targetClientId);
                if (draft.targetClientSiteId !== undefined) setTargetClientSiteId(draft.targetClientSiteId);
                if (draft.requiresHousing !== undefined) setRequiresHousing(draft.requiresHousing);
                if (draft.housingStartDate !== undefined) setHousingStartDate(draft.housingStartDate);
                if (draft.housingEndDate !== undefined) setHousingEndDate(draft.housingEndDate);
                if (draft.sendEmailNotification !== undefined) setSendEmailNotification(draft.sendEmailNotification);
                if (draft.additionalEmails !== undefined) setAdditionalEmails(draft.additionalEmails);
                if (Array.isArray(draft.selectedEmails) && draft.selectedEmails.length > 0) setSelectedEmails(draft.selectedEmails);
                if (draft.emailLanguage !== undefined) setEmailLanguage(draft.emailLanguage);

                if (draft.workerSearch !== undefined) setWorkerSearch(draft.workerSearch);
                if (draft.pedidoSearch !== undefined) setPedidoSearch(draft.pedidoSearch);

                if (draft.emailSubject !== undefined && draft.emailSubject !== '') setEmailSubject(draft.emailSubject);
                if (draft.emailBody !== undefined && draft.emailBody !== '') setEmailBody(draft.emailBody);
                if (draft.isSubjectEdited !== undefined) setIsSubjectEdited(draft.isSubjectEdited);
                if (draft.isBodyEdited !== undefined) setIsBodyEdited(draft.isBodyEdited);

                const urlTipo = searchParams.get('tipo');
                if (urlTipo) {
                    setActionType(urlTipo);
                } else if (draft.actionType) {
                    setActionType(draft.actionType);
                }

                const urlClient = searchParams.get('client_id');
                if (draft.selectedClientId && (!urlClient || urlClient === 'all')) {
                    setSelectedClientId(draft.selectedClientId);
                }

                const urlSite = searchParams.get('site_id');
                if (draft.selectedClientSiteId && (!urlSite || urlSite === 'all')) {
                    setSelectedClientSiteId(draft.selectedClientSiteId);
                }

                const urlPedido = searchParams.get('pedido_id');
                if (draft.selectedPedidoId && (!urlPedido || urlPedido === 'all')) {
                    setSelectedPedidoId(draft.selectedPedidoId);
                }

                if (Array.isArray(draft.selectedAssignments) && draft.selectedAssignments.length > 0) {
                    setSelectedAssignments(draft.selectedAssignments);
                }

                if (draft.reason || draft.notes || draft.dueDate || (draft.selectedAssignments && draft.selectedAssignments.length > 0) || (draft.selectedClientId && draft.selectedClientId !== 'all') || (draft.selectedPedidoId && draft.selectedPedidoId !== 'all')) {
                    setIsDraftRestored(true);
                }

                setTimeout(() => {
                    isRestoringDraftRef.current = false;
                }, 100);
            }
        } catch (err) {
            console.error("Failed to restore draft from localStorage:", err);
            isRestoringDraftRef.current = false;
        }
    }, [searchParams]);

    // Save draft to localStorage on state changes
    useEffect(() => {
        if (!isDraftLoadedRef.current || isRestoringDraftRef.current) return;
        const draft = {
            actionType,
            selectedClientId,
            selectedClientSiteId,
            selectedPedidoId,
            selectedAssignments,
            workerSearch,
            pedidoSearch,
            title,
            priority,
            dueDate,
            reason,
            notes,
            requiresReplacement,
            targetClientId,
            targetClientSiteId,
            requiresHousing,
            housingStartDate,
            housingEndDate,
            sendEmailNotification,
            additionalEmails,
            selectedEmails,
            emailLanguage,
            emailSubject,
            emailBody,
            isSubjectEdited,
            isBodyEdited,
            updatedAt: Date.now()
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, [
        actionType, selectedClientId, selectedClientSiteId, selectedPedidoId,
        selectedAssignments, workerSearch, pedidoSearch, title, priority, dueDate,
        reason, notes, requiresReplacement, targetClientId, targetClientSiteId,
        requiresHousing, housingStartDate, housingEndDate, sendEmailNotification,
        additionalEmails, selectedEmails, emailLanguage, emailSubject, emailBody,
        isSubjectEdited, isBodyEdited
    ]);

    const handleClearDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setReason('');
        setNotes('');
        setDueDate('');
        setTitle('');
        setPriority('normal');
        setRequiresReplacement(false);
        setSelectedAssignments([]);
        setSelectedClientId('all');
        setSelectedClientSiteId('all');
        setSelectedPedidoId('all');
        setWorkerSearch('');
        setPedidoSearch('');
        setRequiresHousing(false);
        setHousingStartDate('');
        setHousingEndDate('');
        setAdditionalEmails('');
        setIsSubjectEdited(false);
        setIsBodyEdited(false);
        setIsDraftRestored(false);
        toast.success('Rascunho limpo com sucesso.');
    };

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
                    offboarding: 'baja',
                    order_extension: 'pedido',
                    order_postponement: 'pedido',
                    order_termination: 'pedido'
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
        
        const selectedPedido = pedidos.find(p => p.id?.toString() === selectedPedidoId);
        
        const clientName = selectedPedido?.client?.trade_name 
            || selectedPedido?.client?.legal_name 
            || firstAssignment?.client?.trade_name 
            || firstAssignment?.client?.legal_name 
            || selectedClientName 
            || 'Cliente';

        const pedidoCodigo = selectedPedido?.codigo 
            || firstAssignment?.pedido?.codigo 
            || firstAssignment?.pedido_codigo 
            || 'N/A';

        const workerNames = selectedList.map(a => a.worker?.nome).filter(Boolean).join(', ');

        const expectedStartStr = dueDate 
            ? formatLocalDate(dueDate)
            : (emailLanguage === 'en' ? 'Not informed' : 'Não informado');

        let dateLabel = '';
        if (emailLanguage === 'es') {
            dateLabel = actionType === 'offboarding' ? 'Fecha Efectiva de Baja (Salida)' :
                        actionType === 'order_extension' ? 'Nueva Fecha de Término' :
                        actionType === 'order_termination' ? 'Fecha de Cierre' :
                        actionType === 'relocation' ? 'Fecha de Inicio de Reubicación' : 'Fecha de Inicio';
        } else if (emailLanguage === 'en') {
            dateLabel = actionType === 'offboarding' ? 'Effective Termination Date' :
                        actionType === 'order_extension' ? 'New End Date' :
                        actionType === 'order_termination' ? 'Completion Date' :
                        actionType === 'relocation' ? 'Relocation Start Date' : 'Start Date';
        } else {
            dateLabel = actionType === 'offboarding' ? 'Data Efetiva da Baixa (Saída)' :
                        actionType === 'order_extension' ? 'Nova Data de Término' :
                        actionType === 'order_termination' ? 'Data de Encerramento' :
                        actionType === 'relocation' ? 'Data de Início da Realocação' : 'Data de Início';
        }

        let typeLabel = '';
        if (emailLanguage === 'es') {
            typeLabel = actionType === 'replacement' ? 'Sustitución (Reemplazo)' : 
                        actionType === 'relocation' ? 'Reubicación' : 
                        actionType === 'technical_test' ? 'Prueba Técnica (Prueba)' : 
                        actionType === 'offboarding' ? 'Desvinculación (Baja)' : 
                        actionType === 'order_extension' ? 'Prórroga de Obra' : 
                        actionType === 'order_postponement' ? 'Aplazamiento de Inicio de Obra' : 'Finalización de Obra';
        } else if (emailLanguage === 'en') {
            typeLabel = actionType === 'replacement' ? 'Replacement' : 
                        actionType === 'relocation' ? 'Relocation' : 
                        actionType === 'technical_test' ? 'Technical Test' : 
                        actionType === 'offboarding' ? 'Termination' : 
                        actionType === 'order_extension' ? 'Worksite Extension' : 
                        actionType === 'order_postponement' ? 'Worksite Postponement' : 'Worksite Completion';
        } else {
            typeLabel = actionType === 'replacement' ? 'Substituição (Reemplazo)' : 
                        actionType === 'relocation' ? 'Realocação (Reubicación)' : 
                        actionType === 'technical_test' ? 'Teste Técnico (Prueba)' : 
                        actionType === 'offboarding' ? 'Desligamento (Baja)' : 
                        actionType === 'order_extension' ? 'Prorrogação de Obra' : 
                        actionType === 'order_postponement' ? 'Adiamento de Início de Obra' : 'Finalização de Obra';
        }

        let subject = '';
        if (emailLanguage === 'es') {
            subject = `Notificación Operativa: ${typeLabel} - ${pedidoCodigo} - ${clientName}`;
        } else if (emailLanguage === 'en') {
            subject = `Operational Notification: ${typeLabel} - ${pedidoCodigo} - ${clientName}`;
        } else {
            subject = `Notificação Operacional: ${typeLabel} - ${pedidoCodigo} - ${clientName}`;
        }

        let body = '';
        if (emailLanguage === 'es') {
            body = `<p>Hola Equipo,</p>
<p>Se ha registrado en el sistema una nueva solicitud de <strong>${typeLabel}</strong>.</p>
<p><strong>Detalles de la Operación:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Código del Pedido:</strong> ${pedidoCodigo}</li>
  <li><strong>Trabajador(es) Afectado(s):</strong> ${workerNames || 'Ninguno seleccionado'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Motivo:</strong> ${reason || 'No informado'}</li>
  <li><strong>Observaciones Extras:</strong> ${notes || 'Ninguna'}</li>
</ul>
<p>Por favor, realicen los trámites necesarios en sus respectivos sectores.</p>
<p>Atentamente,<br/><strong>Operaciones</strong></p>`;
        } else if (emailLanguage === 'en') {
            body = `<p>Hello Team,</p>
<p>A new <strong>${typeLabel}</strong> request has been registered in the system.</p>
<p><strong>Operation Details:</strong></p>
<ul>
  <li><strong>Client:</strong> ${clientName}</li>
  <li><strong>Order Code:</strong> ${pedidoCodigo}</li>
  <li><strong>Affected Worker(s):</strong> ${workerNames || 'None selected'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Reason:</strong> ${reason || 'Not provided'}</li>
  <li><strong>Extra Observations:</strong> ${notes || 'None'}</li>
</ul>
<p>Please carry out the necessary procedures in your respective departments.</p>
<p>Best regards,<br/><strong>Operations</strong></p>`;
        } else {
            body = `<p>Olá Equipe,</p>
<p>Uma nova solicitação de <strong>${typeLabel}</strong> foi registrada no sistema.</p>
<p><strong>Detalhes da Operação:</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${clientName}</li>
  <li><strong>Código do Pedido:</strong> ${pedidoCodigo}</li>
  <li><strong>Trabalhador(es) Afetado(s):</strong> ${workerNames || 'Nenhum selecionado'}</li>
  <li><strong>${dateLabel}:</strong> ${expectedStartStr}</li>
  <li><strong>Motivo:</strong> ${reason || 'Não informado'}</li>
  <li><strong>Observações Extras:</strong> ${notes || 'Nenhuma'}</li>
</ul>
<p>Por favor, realizem os trâmites necessários nos seus respectivos setores.</p>
<p>Atentamente,<br/><strong>Operações</strong></p>`;
        }

        if (!isSubjectEdited) {
            setEmailSubject(subject);
        }

        if (!isBodyEdited) {
            setEmailBody(body);
        }
    }, [actionType, selectedAssignments, assignments, selectedPedidoId, pedidos, dueDate, reason, notes, isSubjectEdited, isBodyEdited, emailLanguage]);

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
        
        const selectedPedido = pedidos.find(p => p.id?.toString() === selectedPedidoId);
        const originPedidoId = (actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
            ? (selectedPedidoId !== 'all' ? selectedPedidoId : null)
            : (firstAssignment?.pedido_id || null);

        const clientId = (actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
            ? (selectedPedido?.client_id || (selectedClientId !== 'all' ? selectedClientId : null) || firstAssignment?.client_id || null)
            : (actionType === 'relocation')
                ? (targetClientId !== 'all' ? targetClientId : null)
                : (firstAssignment?.client_id || null);

        const clientSiteId = (actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
            ? (selectedPedido?.client_site_id || (selectedClientSiteId !== 'all' ? selectedClientSiteId : null) || firstAssignment?.client_site_id || null)
            : (actionType === 'relocation')
                ? (targetClientSiteId !== 'all' ? targetClientSiteId : null)
                : (firstAssignment?.client_site_id || null);

        // Map the selected assignments to the payload target structure
        const targets = selectedList.map(a => ({
            source_assignment_id: a.id.startsWith('virtual-') ? null : a.id,
            source_worker_id: a.worker_id,
            source_pedido_id: a.pedido_id,
            source_pedido_item_id: a.pedido_item_id,
            source_client_id: a.client_id,
            source_client_site_id: a.client_site_id,
            target_client_id: actionType === 'relocation' && targetClientId !== 'all' ? targetClientId : null,
            target_client_site_id: actionType === 'relocation' && targetClientSiteId !== 'all' ? targetClientSiteId : null,
            target_job_function_id: actionType === 'replacement' && targetFunctions[a.id]?.id ? targetFunctions[a.id].id : null,
            target_job_function_name: actionType === 'replacement' && targetFunctions[a.id]?.name ? targetFunctions[a.id].name : null,
            requires_housing: actionType === 'relocation' ? requiresHousing : false,
            housing_start_date: actionType === 'relocation' && requiresHousing && housingStartDate ? housingStartDate : null,
            housing_end_date: actionType === 'relocation' && requiresHousing && housingEndDate ? housingEndDate : null,
            requires_replacement: (actionType === 'replacement') ? true : (actionType === 'offboarding' ? requiresReplacement : false),
            action_type: (actionType === 'replacement' ? 'replace' : 
                          actionType === 'relocation' ? 'relocate' : 
                          actionType === 'offboarding' ? 'offboard' : 
                          actionType === 'technical_test' ? 'test' : 
                          actionType === 'order_extension' ? 'extend' : 
                          actionType === 'order_postponement' ? 'postpone' : 
                          actionType === 'order_termination' ? 'offboard' : 'replace') as any,
            reason: reason,
            notes: notes
        }));

        // Format pergunta_respuesta for saving
        const pergunta_respuesta: Record<string, any> = {};
        if (actionType === 'replacement') {
            Object.keys(answers).forEach(assignId => {
                const workerAnswers = answers[assignId] || {};
                Object.keys(workerAnswers).forEach(qId => {
                    const ans = workerAnswers[qId];
                    if (ans && ans.resposta) {
                        pergunta_respuesta[`${assignId}_${qId}`] = {
                            cargo: ans.cargo,
                            pergunta: ans.pergunta,
                            resposta: ans.resposta
                        };
                    }
                });
            });
        }

        const payload = {
            empresa_id: selectedEmpresaId!,
            type: actionType,
            title: title,
            description: reason || `Solicitação gerada para ${selectedAssignments.length} alvo(s)`,
            priority: priority,
            due_date: dueDate ? new Date(dueDate).toISOString() : null,
            origin_pedido_id: originPedidoId,
            client_id: clientId,
            client_site_id: clientSiteId,
            pergunta_respuesta: actionType === 'replacement' && Object.keys(pergunta_respuesta).length > 0 ? pergunta_respuesta : null,
            targets: targets
        };

        try {
            let targetSolicitudId = '';
            
            if ((actionType === 'order_postponement' || actionType === 'order_extension' || actionType === 'order_termination') && parentSolicitud) {
                targetSolicitudId = parentSolicitud.id;
                
                // 1. Update the existing mother solicitude due_date and make sure it has the correct properties
                const { error: updErr } = await supabase
                    .schema('core_operacoes')
                    .from('solicitudes_operativas')
                    .update({
                        due_date: dueDate ? new Date(dueDate).toISOString() : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', parentSolicitud.id);
                if (updErr) throw updErr;

                // 2. Update the Pedido dates and status
                if (actionType === 'order_postponement') {
                    const { error: pedErr } = await supabase
                        .schema('core_comercial')
                        .from('pedidos')
                        .update({
                            expected_start_date: dueDate,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedPedidoId);
                    if (pedErr) throw pedErr;
                } else if (actionType === 'order_extension') {
                    const { error: pedErr } = await supabase
                        .schema('core_comercial')
                        .from('pedidos')
                        .update({
                            expected_end_date: dueDate,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedPedidoId);
                    if (pedErr) throw pedErr;
                } else if (actionType === 'order_termination') {
                    const { error: pedErr } = await supabase
                        .schema('core_comercial')
                        .from('pedidos')
                        .update({
                            expected_end_date: dueDate ? dueDate : null,
                            commercial_status: 'completed',
                            operational_status: 'completed',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedPedidoId);
                    if (pedErr) throw pedErr;
                }

                // 3. Insert a timeline event for the existing mother solicitude
                const { error: timelineErr } = await supabase
                    .schema('core_operacoes')
                    .from('solicitud_timeline')
                    .insert({
                        empresa_id: selectedEmpresaId!,
                        solicitud_id: parentSolicitud.id,
                        event_type: 'other',
                        title: actionType === 'order_postponement' ? 'Início Adiado' :
                               actionType === 'order_extension' ? 'Prazo Prorrogado' : 'Pedido Finalizado',
                        description: reason || `Alteração realizada: ${title}`,
                        created_by: user?.id
                    });
                if (timelineErr) throw timelineErr;
                
                // 4. Create notification records
                const depCodes = ['RH', 'DOCUMENTACION', 'LOGISTICA', 'COMERCIAL'];
                const { data: deps } = await supabase
                    .schema('core_common')
                    .from('departments')
                    .select('id, code')
                    .eq('empresa_id', selectedEmpresaId!)
                    .in('code', depCodes);
                    
                if (deps && deps.length > 0) {
                    const msg = actionType === 'order_postponement' 
                        ? `O Pedido ${parentSolicitud.codigo} teve o início adiado pelo cliente. Novas datas operacionais foram aplicadas.`
                        : actionType === 'order_extension'
                        ? `O Pedido ${parentSolicitud.codigo} teve o prazo estendido. Novas datas operacionais foram aplicadas.`
                        : `O Pedido ${parentSolicitud.codigo} foi finalizado/encerrado. As alocações foram concluídas.`;
                        
                    const notifTitle = actionType === 'order_postponement'
                        ? `Início Adiado - Pedido ${parentSolicitud.codigo}`
                        : actionType === 'order_extension'
                        ? `Prazo Prorrogado - Pedido ${parentSolicitud.codigo}`
                        : `Pedido Finalizado - ${parentSolicitud.codigo}`;
                        
                    const notifType = actionType === 'order_postponement' ? 'date_change' : actionType === 'order_extension' ? 'date_change' : 'status_change';
                    const notifLevel = actionType === 'order_postponement' ? 'warning' : 'info';
                    const link = `/operacoes/pedidos/${selectedPedidoId}`;
                    
                    const notifsToInsert = deps.map(d => ({
                        empresa_id: selectedEmpresaId!,
                        department_id: d.id,
                        title: notifTitle,
                        message: msg,
                        type: notifType,
                        level: notifLevel,
                        link: link,
                        is_read: false
                    }));
                    
                    await supabase
                        .schema('core_common')
                        .from('notifications')
                        .insert(notifsToInsert);
                }

            } else {
                const newId = await createSolicitudWithTargets.mutateAsync(payload);
                targetSolicitudId = newId;
            }

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
                                solicitud_id: targetSolicitudId,
                                sender_email: user?.email
                            }
                        });
                    }
                }
            } catch (emailErr) {
                console.error("Failed to send operational notification email", emailErr);
            }

            // Clear draft from storage on successful creation
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            setIsDraftRestored(false);

            await queryClient.invalidateQueries({ queryKey: ['solicitudes'] });
            await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            navigate(`/operacoes/solicitudes/${targetSolicitudId}`);
        } catch (error) {
            console.error("Failed to process request", error);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] lg:h-[calc(100vh-136px)] overflow-hidden space-y-4 md:space-y-6 p-1 md:p-2 lg:p-3 w-full max-w-[1920px] mx-auto">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-4">
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

                {isDraftRestored && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-xs">
                        <span>ℹ️ <strong>Rascunho mantido:</strong> Seus dados digitados anteriormente foram restaurados.</span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleClearDraft} 
                            className="h-6 text-xs text-amber-800 hover:text-amber-955 dark:text-amber-300 dark:hover:text-amber-100 underline p-0 font-medium flex items-center gap-1 ml-2"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Limpar formulário
                        </Button>
                    </div>
                )}
            </div>


            {/* Layout Principal: Duas Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 flex-1 min-h-0 overflow-hidden">
                
                {/* Esquerda: Filtros e Tabela */}
                <div className={`${
                    (actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') 
                        ? 'lg:col-span-2 xl:col-span-2' 
                        : 'lg:col-span-3 xl:col-span-4'
                } h-full flex flex-col min-h-0 overflow-hidden`}>
                    <div className="bg-white dark:bg-slate-950 p-4 md:p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800/80 shadow-md flex-1 flex flex-col min-h-0 overflow-hidden space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b shrink-0">
                            <Users className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold">
                                {(actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') 
                                    ? '1. Selecionar Pedido (Obra)' 
                                    : '1. Buscar Alocações (Trabalhadores)'}
                            </h2>
                        </div>
                        
                        {(actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pedido (Obra)</label>
                                        <Select value={selectedPedidoId} onValueChange={setSelectedPedidoId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Todos os Pedidos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos os Pedidos</SelectItem>
                                                {filteredDropdownPedidos.map(p => (
                                                    <SelectItem key={p.id} value={p.id?.toString() || ''}>
                                                        {p.codigo} - {p.client?.trade_name || p.client?.legal_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedPedidoId !== 'all' && (() => {
                                        const p = pedidos.find(item => item.id?.toString() === selectedPedidoId);
                                        if (!p) return null;
                                        return (
                                            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-3 rounded-lg space-y-2">
                                                <div className="flex justify-between items-center border-b pb-1.5 border-slate-200 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Informações da Obra Selecionada</span>
                                                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                                        {p.codigo}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="col-span-1">
                                                        <span className="text-slate-450 dark:text-slate-500 block">Cliente:</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {p.client?.trade_name || p.client?.legal_name || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-1">
                                                        <span className="text-slate-450 dark:text-slate-500 block">Obra / Local:</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                            {p.client_site?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className={`p-2 rounded-lg border col-span-1 transition-all ${
                                                        actionType === 'order_postponement'
                                                            ? 'bg-amber-50 dark:bg-amber-955/30 border-amber-200 dark:border-amber-900/40 shadow-sm scale-[1.01]'
                                                            : 'border-slate-100 dark:border-slate-800'
                                                    }`}>
                                                        <span className={`block text-[10px] uppercase tracking-wider font-bold ${
                                                            actionType === 'order_postponement' ? 'text-amber-800 dark:text-amber-400' : 'text-slate-450 dark:text-slate-500'
                                                        }`}>
                                                            Data de Início Original:
                                                        </span>
                                                        <span className={`font-extrabold text-sm ${
                                                            actionType === 'order_postponement' ? 'text-amber-900 dark:text-amber-300' : 'text-slate-750 dark:text-slate-300'
                                                        }`}>
                                                            {p.expected_start_date ? formatLocalDate(p.expected_start_date) : 'Não informada'}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className={`p-2 rounded-lg border col-span-1 transition-all ${
                                                        actionType === 'order_extension'
                                                            ? 'bg-emerald-50 dark:bg-emerald-955/30 border-emerald-250 dark:border-emerald-900/40 shadow-sm scale-[1.01]'
                                                            : 'border-slate-100 dark:border-slate-800'
                                                    }`}>
                                                        <span className={`block text-[10px] uppercase tracking-wider font-bold ${
                                                            actionType === 'order_extension' ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-450 dark:text-slate-500'
                                                        }`}>
                                                            Data de Fim Prevista:
                                                        </span>
                                                        <span className={`font-extrabold text-sm ${
                                                            actionType === 'order_extension' ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-750 dark:text-slate-300'
                                                        }`}>
                                                            {p.expected_end_date ? formatLocalDate(p.expected_end_date) : 'Não informada'}
                                                        </span>
                                                    </div>
                                                    {parentSolicitud && (
                                                        <div className="col-span-2 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                            <span className="text-slate-450 dark:text-slate-500 block">Solicitação de Origem (Novo Pedido):</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5 font-sans">
                                                                <span className="font-mono font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200 dark:border-indigo-900/30">
                                                                    {parentSolicitud.codigo}
                                                                </span>
                                                                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                                                                    {parentSolicitud.title}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ) : (
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
                        )}

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
                                    isCompact={actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Direita: Formulário de Solicitação */}
                <div className={`${
                    (actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement') 
                        ? 'lg:col-span-2 xl:col-span-3' 
                        : 'lg:col-span-1 xl:col-span-1'
                } h-full overflow-y-auto pr-1`}>
                    <div className="bg-white dark:bg-slate-950 p-4 md:p-5 rounded-2xl border border-slate-150/80 dark:border-slate-800/80 shadow-md space-y-4">
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
                                        <SelectItem value="order_postponement">Adiamento de Início de Obra</SelectItem>
                                        <SelectItem value="order_extension">Prorrogação de Obra</SelectItem>
                                        <SelectItem value="order_termination">Finalização de Obra</SelectItem>
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
                                <div className="p-3.5 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex items-start space-x-2.5 shadow-sm pt-1 pb-2">
                                    <input 
                                        type="checkbox"
                                        id="requiresReplacement"
                                        checked={requiresReplacement}
                                        onChange={e => {
                                            setRequiresReplacement(e.target.checked);
                                        }}
                                        className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                                    />
                                    <div className="flex flex-col space-y-0.5">
                                        <label htmlFor="requiresReplacement" className="text-sm font-bold text-blue-900 dark:text-blue-300 cursor-pointer">
                                            Repor vaga com nova contratação?
                                        </label>
                                        <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">
                                            Selecione se desejar que o RH abra automaticamente uma nova vaga de contratação para substituir este trabalhador.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {actionType === 'offboarding' ? 'Data Efetiva da Baixa (Data de Saída)' : 
                                     actionType === 'relocation' ? 'Data de Início da Realocação' : 
                                     actionType === 'order_postponement' ? 'Nova Data de Início da Obra' : 
                                     actionType === 'order_extension' ? 'Nova Data de Término (Fim da Obra)' : 
                                     actionType === 'order_termination' ? 'Data de Encerramento (Término da Obra)' : 
                                     'Data de Início da Nova Contratação'}
                                </label>
                                <Input 
                                    type="date"
                                    value={dueDate} 
                                    onChange={e => setDueDate(e.target.value)}
                                    className={`h-10 text-sm transition-all duration-250 ${
                                        actionType === 'offboarding' ? 'border-blue-300 dark:border-blue-900/60 focus-visible:ring-blue-500 bg-blue-50/5 dark:bg-blue-955/5 shadow-inner' :
                                        actionType === 'order_postponement' ? 'border-amber-300 dark:border-amber-900/60 focus-visible:ring-amber-500 bg-amber-50/5 dark:bg-amber-955/5 shadow-inner' :
                                        actionType === 'order_extension' ? 'border-emerald-300 dark:border-emerald-900/60 focus-visible:ring-emerald-500 bg-emerald-50/5 dark:bg-emerald-955/5 shadow-inner' : ''
                                    }`}
                                />
                                    {dueDate && (() => {
                                        const p = pedidos.find(item => item.id?.toString() === selectedPedidoId);
                                        if (!p) return null;
                                        
                                        const originalDateStr = actionType === 'order_postponement' ? p.expected_start_date : 
                                                               actionType === 'order_extension' ? p.expected_end_date : null;
                                                               
                                        if (!originalDateStr) return null;
                                        
                                        const [y1, m1, d1] = originalDateStr.split('T')[0].split('-').map(Number);
                                        const [y2, m2, d2] = dueDate.split('T')[0].split('-').map(Number);
                                        if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;
                                        
                                        const origTime = Date.UTC(y1, m1 - 1, d1);
                                        const newTime = Date.UTC(y2, m2 - 1, d2);
                                        const diffDays = Math.round((newTime - origTime) / (1000 * 60 * 60 * 24));
                                        
                                        if (isNaN(diffDays)) return null;
                                        
                                        if (actionType === 'order_postponement') {
                                            if (diffDays > 0) {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
                                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                                        <span>
                                                            O início da obra será adiado em <strong className="underline decoration-2 decoration-amber-500">{diffDays} dia(s)</strong> (de {formatLocalDate(originalDateStr)} para {formatLocalDate(dueDate)}).
                                                        </span>
                                                    </div>
                                                );
                                            } else if (diffDays < 0) {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-250 dark:border-rose-900/40 rounded-lg text-xs text-rose-800 dark:text-rose-450 font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
                                                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                                        <span>
                                                            Atenção: A nova data de início é <strong>{Math.abs(diffDays)} dia(s) anterior</strong> à data original.
                                                        </span>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 animate-fade-in">
                                                        <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        <span>A nova data é igual à data original.</span>
                                                    </div>
                                                );
                                            }
                                        } else if (actionType === 'order_extension') {
                                            if (diffDays > 0) {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-250 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                        <span>
                                                            A obra será estendida por mais <strong className="underline decoration-2 decoration-emerald-500">{diffDays} dia(s)</strong> (de {formatLocalDate(originalDateStr)} para {formatLocalDate(dueDate)}).
                                                        </span>
                                                    </div>
                                                );
                                            } else if (diffDays < 0) {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-250 dark:border-rose-900/40 rounded-lg text-xs text-rose-800 dark:text-rose-450 font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
                                                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                                        <span>
                                                            Atenção: A nova data de término é <strong>{Math.abs(diffDays)} dia(s) anterior</strong> ao prazo original.
                                                        </span>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 animate-fade-in">
                                                        <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        <span>A nova data é igual à data original.</span>
                                                    </div>
                                                );
                                            }
                                        }
                                        return null;
                                    })()}
                                </div>

                            {actionType === 'replacement' && (
                                <div className="space-y-4 border-t border-b py-4 my-2 border-slate-100 dark:border-slate-800 animate-fade-in">
                                    <div className="bg-indigo-50/40 dark:bg-slate-900/20 p-4 rounded-xl border border-indigo-100 dark:border-slate-850 space-y-3">
                                        <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <HelpCircle className="w-4 h-4 text-indigo-650" />
                                            Reemplazo: Funções & Perguntas
                                        </h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Você selecionou <strong className="text-indigo-950 dark:text-indigo-300 font-bold">{selectedAssignments.length} trabalhador(es)</strong> para substituição. Responda às perguntas de viabilidade técnica para cada um deles.
                                        </p>
                                        
                                        <Button
                                            type="button"
                                            onClick={() => setIsConfigDialogOpen(true)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 h-9 shadow-sm"
                                            disabled={selectedAssignments.length === 0}
                                        >
                                            <FileText className="w-4 h-4" />
                                            Configurar Perguntas Técnicas
                                        </Button>
                                        
                                        {/* Status indicator */}
                                        {selectedAssignments.length > 0 && (() => {
                                            const configuredCount = Object.keys(answers).filter(id => selectedAssignments.includes(id) && Object.keys(answers[id] || {}).length > 0).length;
                                            return (
                                                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between mt-1 pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                                                    <span>Status:</span>
                                                    <span className={configuredCount === selectedAssignments.length ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                                                        {configuredCount} de {selectedAssignments.length} configurados
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
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
                                    <div className="space-y-3 pl-6 border-l-2 border-slate-200 dark:border-slate-800 text-xs">
                                        <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150/80 dark:border-slate-800 space-y-3 text-left">
                                            <div className="flex justify-between items-center text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                                                <span>E-mail de Notificação</span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {emailLanguage === 'pt' ? '🇵🇹 PT' : emailLanguage === 'es' ? '🇪🇸 ES' : '🇬🇧 EN'}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400 font-bold block">ASSUNTO</span>
                                                <p className="font-semibold text-slate-700 dark:text-slate-350 truncate">
                                                    {emailSubject || 'Sem assunto'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400 font-bold block">DESTINATÁRIOS</span>
                                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                                    {[...selectedEmails, ...(additionalEmails ? additionalEmails.split(',').map(e => e.trim()).filter(Boolean) : [])].join(', ') || 'Nenhum destinatário'}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEmailModalOpen(true)}
                                                className="w-full h-8 text-[11px] gap-1.5 font-bold hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                                            >
                                                <FileText size={12} />
                                                Configurar E-mail & Idioma
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 mt-2 border-t">
                            <Button 
                                className="w-full" 
                                size="lg"
                                disabled={
                                    ((actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
                                        ? (selectedPedidoId === 'all' && selectedAssignments.length === 0)
                                        : (selectedAssignments.length === 0)) ||
                                    !reason.trim() ||
                                    createSolicitudWithTargets.isPending
                                }
                                onClick={handleSubmit}
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                {createSolicitudWithTargets.isPending ? 'Criando...' : 'Iniciar Operação'}
                            </Button>
                            {((actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
                                ? (selectedPedidoId === 'all' && selectedAssignments.length === 0)
                                : (selectedAssignments.length === 0)) && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    {(actionType === 'order_extension' || actionType === 'order_termination' || actionType === 'order_postponement')
                                        ? 'Selecione um Pedido (Obra) ou pelo menos um trabalhador para continuar.'
                                        : 'Selecione pelo menos um trabalhador na tabela.'}
                                </p>
                            )}
                            {!reason.trim() && (
                                <p className="text-xs text-center text-amber-600 mt-2">
                                    Informe um motivo para continuar.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal de E-mail retangular espaçoso e premium */}
            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-850 dark:text-slate-100">
                            <Mail className="h-5 w-5 text-blue-500" />
                            Configurar E-mail de Notificação
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Configure o idioma, destinatários, assunto e corpo do e-mail de notificação operacional de forma espaçosa.
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
                                <label htmlFor="modal_additional_emails" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    E-mails Adicionais (separados por vírgula)
                                </label>
                                <Input
                                    id="modal_additional_emails"
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
                                Destinatários de Notificação ({
                                    actionType === 'replacement' ? 'Reemplazo' : 
                                    actionType === 'relocation' ? 'Reubicación' : 
                                    actionType === 'technical_test' ? 'Prueba' : 
                                    (actionType === 'order_extension' || actionType === 'order_postponement' || actionType === 'order_termination') ? 'Pedido' : 
                                    'Baja'
                                })
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
                            <label htmlFor="modal_email_subject" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Assunto do E-mail
                            </label>
                            <Input
                                id="modal_email_subject"
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

                        {/* Corpo do E-mail (Editor Simulado) */}
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
                        <Button type="button" variant="outline" onClick={() => setIsEmailModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={() => setIsEmailModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            Salvar Configurações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfigurarReemplazoDialog
                isOpen={isConfigDialogOpen}
                onClose={() => setIsConfigDialogOpen(false)}
                selectedAssignments={selectedAssignments}
                assignments={assignments}
                jobFunctions={jobFunctions}
                targetFunctions={targetFunctions}
                setTargetFunctions={setTargetFunctions}
                answers={answers}
                setAnswers={setAnswers}
                selectedEmpresaId={selectedEmpresaId}
            />
        </div>
    );
}

interface ConfigurarReemplazoDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedAssignments: string[];
    assignments: any[];
    jobFunctions: any[];
    targetFunctions: Record<string, { id: string; name: string }>;
    setTargetFunctions: React.Dispatch<React.SetStateAction<Record<string, { id: string; name: string }>>>;
    answers: Record<string, Record<string, { pergunta: string; resposta: string; cargo: string }>>;
    setAnswers: React.Dispatch<React.SetStateAction<Record<string, Record<string, { pergunta: string; resposta: string; cargo: string }>>>>;
    selectedEmpresaId: string | null;
}

const ConfigurarReemplazoDialog: React.FC<ConfigurarReemplazoDialogProps> = ({
    isOpen,
    onClose,
    selectedAssignments,
    assignments,
    jobFunctions,
    targetFunctions,
    setTargetFunctions,
    answers,
    setAnswers,
    selectedEmpresaId
}) => {
    const handleTargetFuncChange = (id: string, funcId: string, funcName: string) => {
        setTargetFunctions(prev => ({
            ...prev,
            [id]: { id: funcId, name: funcName }
        }));
        // Reset answers for this worker when function changes
        setAnswers(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleAnswerChange = (id: string, questionId: string, questionText: string, value: string, cargoName: string) => {
        setAnswers(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [questionId]: {
                    pergunta: questionText,
                    resposta: value,
                    cargo: cargoName
                }
            }
        }));
    };

    const selectedWorkers = assignments.filter(a => selectedAssignments.includes(a.id));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <DialogTitle className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-650" />
                        Perguntas de Viabilidade Técnica (Reemplazo)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Responda as perguntas técnicas de viabilidade individuais para cada um dos trabalhadores que serão substituídos.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6 max-h-[55vh] pr-2">
                    {selectedWorkers.length === 0 ? (
                        <p className="text-sm text-slate-500 italic text-center py-8">Nenhum trabalhador selecionado na tabela.</p>
                    ) : (
                        selectedWorkers.map((assignment) => {
                            const workerId = assignment.id;
                            const targetFunc = targetFunctions[workerId];
                            const workerAnswers = answers[workerId] || {};

                            return (
                                <WorkerQuestionsSection
                                    key={workerId}
                                    assignment={assignment}
                                    jobFunctions={jobFunctions}
                                    targetFunc={targetFunc}
                                    onTargetFuncChange={(funcId, funcName) => handleTargetFuncChange(workerId, funcId, funcName)}
                                    answers={workerAnswers}
                                    onAnswerChange={(qId, qText, val, cargoName) => handleAnswerChange(workerId, qId, qText, val, cargoName)}
                                    selectedEmpresaId={selectedEmpresaId}
                                />
                            );
                        })
                    )}
                </div>

                <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-2 gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={onClose} className="h-9 font-semibold text-xs">
                        Fechar
                    </Button>
                    <Button 
                        type="button" 
                        onClick={onClose} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9"
                    >
                        Confirmar Respostas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface WorkerQuestionsSectionProps {
    assignment: any;
    jobFunctions: any[];
    targetFunc: { id: string; name: string } | undefined;
    onTargetFuncChange: (funcId: string, funcName: string) => void;
    answers: Record<string, { pergunta: string; resposta: string; cargo: string }>;
    onAnswerChange: (questionId: string, qText: string, val: string, cargoName: string) => void;
    selectedEmpresaId: string | null;
}

const WorkerQuestionsSection: React.FC<WorkerQuestionsSectionProps> = ({
    assignment,
    jobFunctions,
    targetFunc,
    onTargetFuncChange,
    answers,
    onAnswerChange,
    selectedEmpresaId
}) => {
    const { data: questions = [], isLoading } = useQuery({
        queryKey: ['job_function_questions', targetFunc?.id, selectedEmpresaId],
        queryFn: () => {
            if (!targetFunc?.id) return [];
            return jobFunctionQuestionsApi.getQuestions(targetFunc.id, selectedEmpresaId || undefined);
        },
        enabled: !!targetFunc?.id
    });

    return (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 border-slate-200/50 dark:border-slate-800">
                <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        {assignment.worker?.nome || assignment.worker_nome}
                    </h4>
                    <p className="text-xs text-slate-500">
                        Função Atual: <span className="font-semibold">{assignment.job_function?.name || assignment.job_function_name_snapshot}</span>
                    </p>
                </div>
                
                <div className="w-full md:w-64 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Função Alvo Substituta</label>
                    <Select 
                        value={targetFunc?.id || ''} 
                        onValueChange={(val) => {
                            const found = jobFunctions.find(jf => jf.id === val);
                            if (found) {
                                onTargetFuncChange(found.id, found.name);
                            }
                        }}
                    >
                        <SelectTrigger className="h-8.5 text-xs">
                            <SelectValue placeholder="Selecione a Função" />
                        </SelectTrigger>
                        <SelectContent>
                            {jobFunctions.map(jf => (
                                <SelectItem key={jf.id} value={jf.id || ''}>
                                    {jf.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Questions list */}
            {targetFunc?.id && (
                <div className="space-y-3.5 pl-3 border-l-2 border-indigo-500/35">
                    <h5 className="text-[11px] font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-650" />
                        Perguntas de Viabilidade ({questions.length})
                    </h5>
                    
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            <span>Carregando perguntas da função...</span>
                        </div>
                    ) : questions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma pergunta de viabilidade configurada para esta função.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                            {questions.map((q) => {
                                const isRequired = q.is_required;
                                const questionId = q.id || '';
                                const currentVal = answers[questionId]?.resposta || '';
                                
                                return (
                                    <div key={questionId} className={`space-y-1.5 ${q.question_type === 'multi_choice' || q.question_type === 'long_text' ? 'md:col-span-2' : ''}`}>
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 block">
                                            {q.question_text} {isRequired && <span className="text-red-500">*</span>}
                                        </label>
                                        
                                        {q.question_type === 'boolean' && (
                                            <Select 
                                                value={currentVal} 
                                                onValueChange={(val) => onAnswerChange(questionId, q.question_text, val, targetFunc.name)}
                                            >
                                                <SelectTrigger className="h-8.5 text-xs">
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Sim">Sim</SelectItem>
                                                    <SelectItem value="Não">Não</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {q.question_type === 'long_text' && (
                                            <Textarea 
                                                value={currentVal}
                                                onChange={(e) => onAnswerChange(questionId, q.question_text, e.target.value, targetFunc.name)}
                                                placeholder="Digite a resposta..."
                                                className="resize-none text-xs min-h-[50px] w-full"
                                                rows={2}
                                            />
                                        )}

                                        {q.question_type === 'single_choice' && q.options && q.options.length > 0 && (
                                            <Select 
                                                value={currentVal} 
                                                onValueChange={(val) => onAnswerChange(questionId, q.question_text, val, targetFunc.name)}
                                            >
                                                <SelectTrigger className="h-8.5 text-xs">
                                                    <SelectValue placeholder="Selecione uma opção..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {q.options.map((opt: string, optIdx: number) => (
                                                        <SelectItem key={optIdx} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {q.question_type === 'multi_choice' && q.options && q.options.length > 0 && (
                                            <div className="space-y-2 border rounded-lg p-3 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {q.options.map((opt: string, optIdx: number) => {
                                                        const currentList = currentVal ? currentVal.split(',').map((s: string) => s.trim()) : [];
                                                        const isChecked = currentList.includes(opt);
                                                        
                                                        return (
                                                            <label 
                                                                key={optIdx} 
                                                                className="flex items-center space-x-2.5 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        let newList: string[];
                                                                        if (checked) {
                                                                            newList = [...currentList.filter((item: string) => item !== opt), opt];
                                                                        } else {
                                                                            newList = currentList.filter((item: string) => item !== opt);
                                                                        }
                                                                        onAnswerChange(questionId, q.question_text, newList.join(', '), targetFunc.name);
                                                                    }}
                                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                <span className="font-medium text-slate-700 dark:text-slate-300 leading-tight">
                                                                    {opt}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {q.question_type !== 'boolean' && q.question_type !== 'long_text' && q.question_type !== 'single_choice' && q.question_type !== 'multi_choice' && (
                                            <Input 
                                                type={q.question_type === 'number' ? 'number' : q.question_type === 'date' ? 'date' : 'text'}
                                                value={currentVal}
                                                onChange={(e) => onAnswerChange(questionId, q.question_text, e.target.value, targetFunc.name)}
                                                placeholder="Digite a resposta..."
                                                className="h-8.5 text-xs"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
