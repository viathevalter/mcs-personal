import React, { useEffect, useState, useRef, useMemo } from 'react';
import { renderAsync } from 'docx-preview';
import { Layout } from '@/components/layout/Layout';
import { DepartmentTaskBoard } from '@/features/operacoes/solicitudes/components/DepartmentTaskBoard';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { 
    listContracts, generateContract, deleteContract, type Contract,
    listDocumentRequests, createDocumentRequest, updateDocumentRequest, deleteDocumentRequest, approveDocumentRequest, type DocumentRequest
} from '../api/contractsApi';
import { listWorkers } from '@/features/workers/api/workersApi';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/shared/supabase/client';
import { 
    FileText, Copy, ExternalLink, Plus, RefreshCw, CheckCircle, 
    Mail, AlertCircle, Loader2, Eye, ShieldCheck, Camera,
    MessageSquare, Send, Search, X, Pencil, Trash2, Download, Building2
} from 'lucide-react';
import { toast } from 'sonner';

export function DocumentacionTasksPage() {
    const { selectedEmpresaId, activeEmpresaId } = useEmpresa();
    
    // Contratos state
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loadingContracts, setLoadingContracts] = useState(false);

    // Document Requests state
    const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
    const [loadingDocRequests, setLoadingDocRequests] = useState(false);
    
    // Workers state for generation & request
    const [workersList, setWorkersList] = useState<{ value: string; label: string }[]>([]);

    // Dialog & Form states - Geração de Contrato
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
    const [selectedContratante, setSelectedContratante] = useState<string>('');
    const [selectedContractType, setSelectedContractType] = useState<string>('');
    const [generationSuccess, setGenerationSuccess] = useState<{
        signingLink: string;
        otpCode: string;
        emailSent: boolean;
        contractType?: string;
        documentUrl?: string;
    } | null>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Lista global de clientes e trabalhadores para formulários
    const [clientsList, setClientsList] = useState<{ id: string; name: string }[]>([]);

    // Dialog & Form states - Nova Solicitação de Docs
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [requestEmpresaId, setRequestEmpresaId] = useState<string>('dae64d51-2181-4510-b14f-e63d2f111a8e'); // Default Wiseowe
    const [requestClientId, setRequestClientId] = useState<string>('');
    const [requestStartDate, setRequestStartDate] = useState<string>('');
    const [requestWorkerId, setRequestWorkerId] = useState<string | null>(null);
    const [requestWorkersList, setRequestWorkersList] = useState<{ value: string; label: string }[]>([]);
    const [creatingRequest, setCreatingRequest] = useState(false);
    const [requestSuccessLink, setRequestSuccessLink] = useState<string | null>(null);

    // Dialog & Form states - Editar Solicitação de Docs
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
    const [editEmpresaId, setEditEmpresaId] = useState<string>('');
    const [editClientId, setEditClientId] = useState<string>('');
    const [editStartDate, setEditStartDate] = useState<string>('');
    const [updatingRequest, setUpdatingRequest] = useState(false);

    // Dialog & Form states - Verificação de Documento Enviado (Lado a Lado)
    const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [activeDocTab, setActiveDocTab] = useState<'identity' | 'nif' | 'niss' | 'license' | 'iban' | 'selfie'>('identity');
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [verifyFormData, setVerifyFormData] = useState({
        nome: '',
        email: '',
        direccion_actual: '',
        morada_contrato: '',
        ubicacion_actual: '',
        contacto_emergencia_nombre: '',
        contacto_emergencia_parentesco: '',
        contacto_emergencia_telefono: '',
        talla_camisa: '',
        talla_pantalon: '',
        banco: '',
        iban: '',
        nif: '',
        niss: '',
        nie: '',
        dni: '',
        pasaporte: '',
        licencia_conducir: '',
        nacionalidade: '',
        fecha_nacimiento: ''
    });

    // State para modal de trabalhadores associados à tarefa clicada
    const [selectedTaskForWorkers, setSelectedTaskForWorkers] = useState<any | null>(null);
    const [workersDialogOpen, setWorkersDialogOpen] = useState(false);
    const [taskWorkers, setTaskWorkers] = useState<any[]>([]);
    const [loadingTaskWorkers, setLoadingTaskWorkers] = useState(false);
    const [taskMetadata, setTaskMetadata] = useState<{ clientName: string; siteName: string; pedidoCode: string; empresaName: string; clientId?: string; siteId?: string; empresaId?: string } | null>(null);

    // States for Configuração de Modelos
    const [selectedConfigContratante, setSelectedConfigContratante] = useState<string>('STOCCO');
    const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null);
    const [uploadingTemplate, setUploadingTemplate] = useState<string | null>(null);
    const [activeUploadDocType, setActiveUploadDocType] = useState<string | null>(null);
    const configFileInputRef = useRef<HTMLInputElement>(null);

    // States para Busca e Filtros
    const [searchTermRequests, setSearchTermRequests] = useState('');
    const [statusFilterRequests, setStatusFilterRequests] = useState('all');
    const [empresaFilterRequests, setEmpresaFilterRequests] = useState('all');
    const [clientFilterRequests, setClientFilterRequests] = useState('all');
    const [sortFieldRequests, setSortFieldRequests] = useState<'worker' | 'empresa' | 'client' | 'planned_start_date' | 'created_at'>('created_at');
    const [sortDirectionRequests, setSortDirectionRequests] = useState<'asc' | 'desc'>('desc');

    const [searchTermContracts, setSearchTermContracts] = useState('');
    const [statusFilterContracts, setStatusFilterContracts] = useState('all');

    // Get unique list of empresas from docRequests dynamically
    const uniqueEmpresasRequests = useMemo(() => {
        const set = new Set<string>();
        docRequests.forEach(req => {
            const name = req.empresa?.name || 'Stocco';
            set.add(name);
        });
        return Array.from(set).sort();
    }, [docRequests]);

    // Get unique list of clients from docRequests dynamically
    const uniqueClientsRequests = useMemo(() => {
        const set = new Set<string>();
        docRequests.forEach(req => {
            const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name || 'Sem Alocação';
            set.add(clientName);
        });
        return Array.from(set).sort();
    }, [docRequests]);

    // Handler for sorting requests
    const handleRequestSort = (field: 'worker' | 'empresa' | 'client' | 'planned_start_date' | 'created_at') => {
        if (sortFieldRequests === field) {
            setSortDirectionRequests(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortFieldRequests(field);
            setSortDirectionRequests('asc');
        }
    };

    // Filtrar solicitações localmente
    const filteredRequests = useMemo(() => {
        const filtered = docRequests.filter(req => {
            const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
            const latestAssignment = req.worker?.assignments?.[0];
            const clientName = activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                               latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name || 'Sem Alocação';
            
            const empresaName = req.empresa?.name || 'Stocco';
            const workerName = req.worker?.nome || '';
            const workerEmail = req.worker?.email || '';
            const workerMovil = req.worker?.movil || '';
            const status = req.status || '';
            
            const textMatch = 
                workerName.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                workerEmail.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                workerMovil.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                empresaName.toLowerCase().includes(searchTermRequests.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTermRequests.toLowerCase());
                
            const isExpired = new Date(req.expires_at) < new Date();
            let statusMatch = true;
            if (statusFilterRequests !== 'all') {
                if (statusFilterRequests === 'expired') {
                    statusMatch = isExpired;
                } else {
                    statusMatch = status === statusFilterRequests && !isExpired;
                }
            }

            let empresaMatch = true;
            if (empresaFilterRequests !== 'all') {
                empresaMatch = empresaName === empresaFilterRequests;
            }

            let clientMatch = true;
            if (clientFilterRequests !== 'all') {
                clientMatch = clientName === clientFilterRequests;
            }
            
            return textMatch && statusMatch && empresaMatch && clientMatch;
        });

        return filtered.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortFieldRequests === 'worker') {
                valA = a.worker?.nome || '';
                valB = b.worker?.nome || '';
            } else if (sortFieldRequests === 'empresa') {
                valA = a.empresa?.name || 'Stocco';
                valB = b.empresa?.name || 'Stocco';
            } else if (sortFieldRequests === 'client') {
                const activeAssA = a.worker?.assignments?.find(as => as.status === 'active');
                const latestAssA = a.worker?.assignments?.[0];
                valA = activeAssA?.client?.trade_name || activeAssA?.client?.legal_name ||
                       latestAssA?.client?.trade_name || latestAssA?.client?.legal_name || 'Sem Alocação';

                const activeAssB = b.worker?.assignments?.find(as => as.status === 'active');
                const latestAssB = b.worker?.assignments?.[0];
                valB = activeAssB?.client?.trade_name || activeAssB?.client?.legal_name ||
                       latestAssB?.client?.trade_name || latestAssB?.client?.legal_name || 'Sem Alocação';
            } else if (sortFieldRequests === 'planned_start_date') {
                const activeAssA = a.worker?.assignments?.find(as => as.status === 'active');
                const latestAssA = a.worker?.assignments?.[0];
                valA = (a as any).extracted_data?.start_date ||
                       activeAssA?.planned_start_date || activeAssA?.start_date ||
                       latestAssA?.planned_start_date || latestAssA?.start_date || '9999-12-31';

                const activeAssB = b.worker?.assignments?.find(as => as.status === 'active');
                const latestAssB = b.worker?.assignments?.[0];
                valB = (b as any).extracted_data?.start_date ||
                       activeAssB?.planned_start_date || activeAssB?.start_date ||
                       latestAssB?.planned_start_date || latestAssB?.start_date || '9999-12-31';
            } else if (sortFieldRequests === 'created_at') {
                valA = a.created_at || '';
                valB = b.created_at || '';
            }

            if (valA < valB) return sortDirectionRequests === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirectionRequests === 'asc' ? 1 : -1;
            return 0;
        });
    }, [docRequests, searchTermRequests, statusFilterRequests, empresaFilterRequests, clientFilterRequests, sortFieldRequests, sortDirectionRequests]);

    // Filtrar contratos localmente
    const filteredContracts = useMemo(() => {
        return contracts.filter(contract => {
            const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || 'Sem Alocação';
            const empresaName = contract.contratante || '';
            const workerName = contract.worker?.nome || '';
            const workerEmail = contract.worker?.email || '';
            
            const textMatch = 
                workerName.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                workerEmail.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                empresaName.toLowerCase().includes(searchTermContracts.toLowerCase()) ||
                clientName.toLowerCase().includes(searchTermContracts.toLowerCase());
                
            let statusMatch = true;
            if (statusFilterContracts !== 'all') {
                statusMatch = contract.status === statusFilterContracts;
            }
            
            return textMatch && statusMatch;
        });
    }, [contracts, searchTermContracts, statusFilterContracts]);

    const getTemplatePath = (contratante: string, docType: string) => {
        const upper = contratante.toUpperCase();
        if (docType === 'contrato_nis') {
            return `${contratante}/CONTRATO NIS - ${upper}.docx`;
        } else if (docType === 'contrato_termo_incerto') {
            return `${contratante}/CONTRATO TERMO INCERTO - ${upper}.docx`;
        } else if (docType === 'contrato_alta') {
            return `${contratante}/CONTRATO DE ALTA - ${upper}.docx`;
        } else if (docType === 'rescisao') {
            return `${contratante}/COMUNICADO RESCISAO ${upper}.docx`;
        }
        return '';
    };

    const handleDownloadConfigTemplate = async (docType: string) => {
        try {
            setDownloadingTemplate(docType);
            const filePath = getTemplatePath(selectedConfigContratante, docType);
            if (!filePath) throw new Error("Caminho inválido");

            const { data, error } = await supabase.storage
                .from('contract-templates')
                .download(filePath);

            if (error) throw error;
            if (!data) throw new Error("Arquivo vazio retornado");

            // Baixar no navegador
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath.split('/').pop() || 'template.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Download do modelo concluído com sucesso!");
        } catch (err: any) {
            console.error("Erro ao baixar modelo:", err);
            toast.error(`Erro ao baixar modelo: ${err.message || err}`);
        } finally {
            setDownloadingTemplate(null);
        }
    };

    const triggerUpload = (docType: string) => {
        setActiveUploadDocType(docType);
        if (configFileInputRef.current) {
            configFileInputRef.current.value = '';
            configFileInputRef.current.click();
        }
    };

    const handleUploadConfigTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeUploadDocType) return;

        // Validar extensão
        if (!file.name.toLowerCase().endsWith('.docx')) {
            toast.error("Por favor, envie um arquivo no formato Word (.docx)");
            return;
        }

        try {
            setUploadingTemplate(activeUploadDocType);
            const filePath = getTemplatePath(selectedConfigContratante, activeUploadDocType);
            if (!filePath) throw new Error("Caminho inválido");

            // Sanitizar e normalizar o arquivo XML (posicionamento de cabeçalho e escapar &) antes de subir
            let fileToUpload: Blob = file;
            try {
                const arrayBuf = await file.arrayBuffer();
                const zip = new JSZip();
                await zip.loadAsync(arrayBuf);

                for (const relPath of Object.keys(zip.files)) {
                    if (relPath.endsWith('.xml') && relPath.startsWith('word/')) {
                        let xml = await zip.file(relPath)!.async('text');
                        if (relPath.startsWith('word/header') || relPath.startsWith('word/footer')) {
                            if (xml.includes('<wp:anchor')) {
                                xml = xml.replace(/<wp:anchor[\s\S]*?>/g, '<wp:inline distT="0" distB="0" distL="0" distR="0">');
                                xml = xml.replace(/<\/wp:anchor>/g, '</wp:inline>');
                                xml = xml.replace(/<wp:simplePos[\s\S]*?\/>/g, '');
                                xml = xml.replace(/<wp:positionH[\s\S]*?<\/wp:positionH>/g, '');
                                xml = xml.replace(/<wp:positionV[\s\S]*?<\/wp:positionV>/g, '');
                                xml = xml.replace(/<wp:wrapNone\/>/g, '');
                            }
                            xml = xml.replace(/cx="7\d+"/g, 'cx="6600000"').replace(/cx="75\d+"/g, 'cx="6600000"');
                            if (xml.includes('<w:pPr>')) {
                                if (!xml.includes('<w:jc')) {
                                    xml = xml.replace('<w:pPr>', '<w:pPr><w:jc w:val="center"/>');
                                } else {
                                    xml = xml.replace(/<w:jc w:val="[^"]*"\/>/g, '<w:jc w:val="center"/>');
                                }
                            }
                        }
                        const escaped = xml.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
                        zip.file(relPath, escaped);
                    }
                }
                fileToUpload = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            } catch (zipErr) {
                console.warn("Erro na sanitização JSZip do upload:", zipErr);
            }

            const { error } = await supabase.storage
                .from('contract-templates')
                .upload(filePath, fileToUpload, {
                    upsert: true,
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });

            if (error) throw error;

            toast.success(`Modelo "${file.name}" atualizado com sucesso!`);
        } catch (err: any) {
            console.error("Erro ao enviar modelo:", err);
            toast.error(`Erro ao enviar modelo: ${err.message || err}`);
        } finally {
            setUploadingTemplate(null);
            setActiveUploadDocType(null);
        }
    };

    const handleDeleteContractItem = async (contractId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este registro de contrato?")) return;
        try {
            await deleteContract(contractId);
            toast.success("Contrato excluído com sucesso!");
            loadContracts();
        } catch (err: any) {
            console.error("Erro ao excluir contrato:", err);
            toast.error(`Erro ao excluir contrato: ${err.message || err}`);
        }
    };

    const loadTaskWorkers = async (task: any) => {
        if (!task || !selectedEmpresaId) return;
        try {
            setLoadingTaskWorkers(true);
            setTaskWorkers([]);
            setTaskMetadata(null);

            const solicitudId = task.solicitud_id;

            // Fetch full solicitud record to ensure we get client_id, client_site_id, empresa_id, codigo, tipo, title
            const { data: solData } = await supabase
                .schema('core_operacoes')
                .from('solicitudes_operativas')
                .select('id, codigo, client_id, client_site_id, empresa_id, pedido_id, tipo, title')
                .eq('id', solicitudId)
                .maybeSingle();

            const pedidoId = solData?.pedido_id || task.solicitud?.pedido_id;
            let clientId = solData?.client_id || task.solicitud?.client_id;
            let siteId = solData?.client_site_id || task.solicitud?.client_site_id;
            let empresaId = solData?.empresa_id || task.solicitud?.empresa_id || selectedEmpresaId;
            let pedidoCode = solData?.codigo || task.solicitud?.codigo || 'N/A';

            // If pedidoId is present, fetch order info to refine code/client/site
            if (pedidoId) {
                const { data: pedidoData } = await supabase
                    .schema('core_comercial')
                    .from('pedidos')
                    .select('id, codigo, client_id, client_site_id')
                    .eq('id', pedidoId)
                    .maybeSingle();

                if (pedidoData) {
                    if (pedidoData.codigo) pedidoCode = pedidoData.codigo;
                    if (pedidoData.client_id) clientId = pedidoData.client_id;
                    if (pedidoData.client_site_id) siteId = pedidoData.client_site_id;
                }
            }

            // If clientId is still missing, try fetching from solicitud_targets source_client_id or target worker_assignments
            if (!clientId) {
                const { data: targetClientData } = await supabase
                    .schema('core_operacoes')
                    .from('solicitud_targets')
                    .select('source_client_id, target_client_id')
                    .eq('solicitud_id', solicitudId)
                    .limit(1)
                    .maybeSingle();

                if (targetClientData) {
                    clientId = targetClientData.source_client_id || targetClientData.target_client_id;
                }
            }

            // Fetch Names for Client, Site & Empresa
            const [{ data: clientData }, { data: siteData }, { data: empresaData }] = await Promise.all([
                clientId ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').eq('id', clientId).maybeSingle() : Promise.resolve({ data: null }),
                siteId ? supabase.schema('core_common').from('client_sites').select('id, name').eq('id', siteId).maybeSingle() : Promise.resolve({ data: null }),
                empresaId ? supabase.schema('core_common').from('empresas').select('id, nome, trade_name, legal_name').eq('id', empresaId).maybeSingle() : Promise.resolve({ data: null })
            ]);

            let clientName = 'N/A';
            if (clientData) {
                clientName = clientData.trade_name || clientData.legal_name || 'N/A';
            }

            let siteName = 'N/A';
            if (siteData) {
                siteName = siteData.name;
            } else if (clientName !== 'N/A') {
                siteName = 'Instalações do Cliente';
            }

            const empresaName = empresaData?.trade_name || empresaData?.legal_name || empresaData?.nome || 'N/A';

            setTaskMetadata({ 
                clientName, 
                siteName, 
                pedidoCode,
                empresaName,
                clientId,
                siteId,
                empresaId
            });

            // 2. Fetch targets first
            const { data: targets, error: targetsErr } = await supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select(`
                    *,
                    source_worker:workers!solicitud_targets_source_worker_id_fkey(id, nome, cod_colab, email, movil, funcion),
                    target_worker:workers!solicitud_targets_target_worker_id_fkey(id, nome, cod_colab, email, movil, funcion)
                `)
                .eq('solicitud_id', solicitudId);

            if (targetsErr) throw targetsErr;

            let displayItems: any[] = [];
            if (targets && targets.length > 0) {
                displayItems = targets.map((t: any) => ({
                    id: t.id,
                    worker: t.target_worker || t.source_worker,
                    action_type: t.action_type || 'substituição',
                    status: t.status || 'pendente'
                }));
            } else if (pedidoId) {
                // Fetch from worker_assignments
                const { data: assignments, error: assignErr } = await supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select(`
                        *,
                        worker:workers(id, nome, cod_colab, email, movil, funcion)
                    `)
                    .eq('empresa_id', selectedEmpresaId)
                    .eq('pedido_id', pedidoId)
                    .in('status', ['planned', 'active']);

                if (assignErr) throw assignErr;

                if (assignments) {
                    displayItems = assignments.map((a: any) => ({
                        id: a.id,
                        worker: a.worker,
                        action_type: 'alocação',
                        status: a.status === 'planned' ? 'planejado' : 'ativo'
                    }));
                }
            }

            // 3. For each worker, check if there is an active doc request
            if (displayItems.length > 0) {
                const workerIds = displayItems.map(item => item.worker?.id).filter(Boolean);
                if (workerIds.length > 0) {
                    const { data: requests } = await supabase
                        .schema('core_personal')
                        .from('document_requests')
                        .select('*, worker:workers(id, nome, email, movil, cod_colab)')
                        .in('worker_id', workerIds);

                    const requestsMap = new Map(requests?.map(r => [r.worker_id, r]) || []);
                    displayItems = displayItems.map(item => ({
                        ...item,
                        docRequest: item.worker ? requestsMap.get(item.worker.id) : null
                    }));
                }
            }

            setTaskWorkers(displayItems);

        } catch (err) {
            console.error("Erro ao carregar trabalhadores da tarefa:", err);
            toast.error("Erro ao obter a lista de trabalhadores.");
        } finally {
            setLoadingTaskWorkers(false);
        }
    };

    const handleSendWhatsApp = async (item: any) => {
        if (!item.worker) {
            toast.error("Trabalhador inválido.");
            return;
        }

        const workerName = item.worker.nome;
        const phone = item.worker.movil || '';
        
        let inviteLink = '';
        
        // Se já existe uma solicitação de documentos, usa o token existente
        if (item.docRequest) {
            inviteLink = `${window.location.origin}/enviar-documentos/${item.docRequest.token}`;
        } else {
            // Caso contrário, cria uma nova solicitação silenciosamente na hora!
            try {
                const loadingToast = toast.loading("Gerando link de envio de documentos...");
                const res = await createDocumentRequest(selectedEmpresaId!, item.worker.id);
                inviteLink = `${window.location.origin}/enviar-documentos/${res.token}`;
                
                // Atualiza a lista local
                setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: res } : w));
                // Atualiza a aba geral de solicitações de documentos
                loadDocRequests();
                toast.dismiss(loadingToast);
            } catch (err) {
                console.error("Erro ao criar solicitação automática:", err);
                toast.dismiss();
                toast.error("Erro ao gerar link de documentos.");
                return;
            }
        }

        // Constrói a mensagem personalizada
        const msg = `Hola ${workerName}
A continuación se compartirá un link, donde proporcionarás la documentación e información requerida para poder continuar con el proceso de gestión de contrato.
 
*LINK: ${inviteLink}
 
Muchas gracias.`;

        // Copia a mensagem para a área de transferência
        try {
            await navigator.clipboard.writeText(msg);
        } catch (clipErr) {
            console.warn("Clipboard copy failed: ", clipErr);
        }
        
        // Abre o link do WhatsApp
        const cleanPhone = phone.replace(/\D/g, ''); // Remove caracteres não numéricos
        const whatsappUrl = cleanPhone 
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
            : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
            
        window.open(whatsappUrl, '_blank');
        
        toast.success(`Mensagem personalizada para ${workerName} copiada e WhatsApp aberto!`);
    };

    // 1. Carregar Contratos
    const loadContracts = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoadingContracts(true);
            const data = await listContracts({ empresaId: selectedEmpresaId });
            setContracts(data);
        } catch (err: any) {
            console.error("Erro ao carregar contratos:", err);
            toast.error("Erro ao carregar lista de contratos.");
        } finally {
            setLoadingContracts(false);
        }
    };

    // 2. Carregar Solicitações de Documentos
    const loadDocRequests = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoadingDocRequests(true);
            const data = await listDocumentRequests(selectedEmpresaId);
            setDocRequests(data);
        } catch (err) {
            console.error("Erro ao carregar solicitações de documentos:", err);
            toast.error("Erro ao carregar solicitações de documentos.");
        } finally {
            setLoadingDocRequests(false);
        }
    };

    // 3. Carregar Trabalhadores para o Combobox
    const loadWorkersForEmpresa = async (empresaId: string) => {
        if (!empresaId) return;
        try {
            const res = await listWorkers({
                empresaId: empresaId,
                page: 1,
                pageSize: 1000,
                statusTrabajador: ['ativos', 'pendentes_ingresso'],
            });
            const options = res.data.map(w => ({
                value: w.id || '',
                label: `${w.nome} (${w.cod_colab || 'Sem Cód.'})`
            }));
            setRequestWorkersList(options);
            setWorkersList(options);
        } catch (err) {
            console.error("Erro ao carregar trabalhadores da empresa:", err);
        }
    };

    const loadWorkers = async () => {
        const targetEmpresa = activeEmpresaId || requestEmpresaId;
        await loadWorkersForEmpresa(targetEmpresa);
    };

    // Carregar Lista de Clientes Ativos (com Código e filtro por Empresa)
    const loadClients = async (empresaId?: string) => {
        try {
            const { data, error } = await supabase
                .schema('core_common')
                .from('clients')
                .select(`
                    id, codigo, trade_name, legal_name, tax_id,
                    client_company_settings (
                        empresa_id,
                        status
                    )
                `)
                .order('trade_name', { ascending: true });
            
            if (error) throw error;

            const mapped = (data || [])
                .filter(client => {
                    const settings = client.client_company_settings || [];
                    if (settings.length === 0) return true;
                    
                    if (empresaId) {
                        const targetSetting = settings.find((s: any) => s.empresa_id === empresaId);
                        if (targetSetting) {
                            return targetSetting.status === 'active';
                        }
                    }
                    return settings.some((s: any) => s.status === 'active');
                })
                .map(client => {
                    const codePrefix = client.codigo ? `[${client.codigo}] ` : (client.tax_id ? `[NIF: ${client.tax_id}] ` : '');
                    const clientName = client.trade_name || client.legal_name || 'Sem Nome';
                    return {
                        id: client.id,
                        name: `${codePrefix}${clientName}`
                    };
                });

            setClientsList(mapped);
        } catch (err) {
            console.error("Erro ao carregar lista de clientes:", err);
        }
    };

    useEffect(() => {
        loadClients(selectedEmpresaId);
    }, [selectedEmpresaId]);

    useEffect(() => {
        if (selectedEmpresaId) {
            loadContracts();
            loadDocRequests();
            loadWorkers();
        }
    }, [selectedEmpresaId]);

    useEffect(() => {
        if ((generateDialogOpen || requestDialogOpen) && selectedEmpresaId) {
            loadWorkers();
        }

        if (generateDialogOpen && selectedEmpresaId) {
            if (selectedEmpresaId === '441f1f5d-aed3-40e3-8c77-7b1217757251') {
                setSelectedContratante('STOCCO');
            } else if (selectedEmpresaId === 'dae64d51-2181-4510-b14f-e63d2f111a8e') {
                setSelectedContratante('WISEOWE UNIPESSOAL LDA');
            } else if (selectedEmpresaId === '847796c4-b253-4e53-9e6b-34a127ec7d85') {
                setSelectedContratante('LUMINOUS CAPITAL UNIPESSOAL LDA');
            } else if (selectedEmpresaId === 'a798620a-358a-4c6c-9db2-3a507c583cac') {
                setSelectedContratante('TRIANGULO');
            } else {
                setSelectedContratante('');
            }
        }
    }, [generateDialogOpen, requestDialogOpen, selectedEmpresaId]);

    useEffect(() => {
        if (previewBlob && previewContainerRef.current) {
            console.log("Renderizando visualização prévia do contrato gerado...");
            previewContainerRef.current.innerHTML = "";
            renderAsync(previewBlob, previewContainerRef.current, undefined, {
                className: "docx",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                useBase64URL: false,
                renderHeaders: true,
                renderFooters: true,
            })
            .then(() => {
                if (previewContainerRef.current?.parentElement) {
                    previewContainerRef.current.parentElement.scrollTop = 0;
                }
            })
            .catch(err => {
                console.error("Erro ao renderizar pré-visualização:", err);
            });
        }
    }, [previewBlob]);

    // 4. Submeter geração de contrato
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkerId || !selectedContratante || !selectedContractType) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        try {
            setGenerating(true);
            setPreviewBlob(null);
            const res = await generateContract({
                worker_id: selectedWorkerId,
                contratante: selectedContratante,
                contract_type: selectedContractType,
                empresa_id: selectedEmpresaId || undefined,
            });

            setGenerationSuccess({
                signingLink: res.signing_link,
                otpCode: res.otp_code,
                emailSent: res.email_sent,
                contractType: selectedContractType,
                documentUrl: res.document_url
            });
            
            toast.success(selectedContractType === 'contrato_alta' ? "Contrato de alta emitido!" : "Contrato emitido e pronto para assinatura!");
            loadContracts();

            // Baixar o arquivo para visualização prévia
            if (res.document_url) {
                setLoadingPreview(true);
                try {
                    console.log("Obtendo link assinado para preview:", res.document_url);
                    const { data: signedData, error: signedErr } = await supabase.storage
                        .from('worker-contracts')
                        .createSignedUrl(res.document_url, 300);
                    
                    if (signedErr) throw signedErr;
                    if (!signedData?.signedUrl) throw new Error("Link assinado não retornado.");

                    console.log("Baixando blob do link assinado...");
                    const fileRes = await fetch(signedData.signedUrl);
                    if (!fileRes.ok) throw new Error(`Falha no download HTTP: ${fileRes.status}`);
                    
                    const fileData = await fileRes.blob();
                    setPreviewBlob(fileData);
                } catch (previewErr: any) {
                    console.error("Erro ao obter documento via link assinado, tentando download direto:", previewErr);
                    // Fallback para download direto
                    try {
                        const { data: fileData, error: fileErr } = await supabase.storage
                            .from('worker-contracts')
                            .download(res.document_url);
                        if (fileErr) throw fileErr;
                        setPreviewBlob(fileData);
                    } catch (directErr) {
                        console.error("Erro no download direto de preview:", directErr);
                    }
                } finally {
                    setLoadingPreview(false);
                }
            }
        } catch (err: any) {
            console.error("Erro ao gerar contrato:", err);
            toast.error(err.message || "Erro interno ao tentar emitir o contrato.");
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadContract = async (contract: Contract) => {
        const path = contract.signed_document_url || contract.document_url;
        if (!path) {
            toast.error("Documento não encontrado.");
            return;
        }
        try {
            const { data, error } = await supabase.storage
                .from('worker-contracts')
                .createSignedUrl(path, 3600);
            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            console.error("Erro ao baixar documento:", err);
            toast.error("Erro ao gerar link de download do documento.");
        }
    };

    // 5. Submeter nova solicitação de documentos
    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestWorkerId || !requestEmpresaId) {
            toast.error("Por favor, selecione a Empresa e o Trabalhador.");
            return;
        }

        try {
            setCreatingRequest(true);
            const targetClient = (requestClientId && requestClientId !== 'none') ? requestClientId : undefined;
            const res = await createDocumentRequest(requestEmpresaId, requestWorkerId, targetClient, requestStartDate || undefined);
            const link = `${window.location.origin}/enviar-documentos/${res.token}`;
            setRequestSuccessLink(link);
            toast.success("Solicitação criada com sucesso!");
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao solicitar documentos:", err);
            toast.error("Falha ao criar solicitação de documentos.");
        } finally {
            setCreatingRequest(false);
        }
    };

    // 5b. Editar Solicitação Existente
    const handleOpenEditRequest = (req: DocumentRequest) => {
        setEditingRequest(req);
        setEditEmpresaId(req.empresa_id);
        loadClients(req.empresa_id);
        const explicitClientId = (req as any).extracted_data?.client_id || (req as any).client?.id || 'none';
        setEditClientId(explicitClientId);
        const explicitStartDate = (req as any).extracted_data?.start_date || (req as any).worker?.assignments?.[0]?.start_date || (req as any).worker?.assignments?.[0]?.planned_start_date || '';
        setEditStartDate(explicitStartDate);
        setEditDialogOpen(true);
    };

    const handleSaveEditRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest || !editEmpresaId) {
            toast.error("Por favor, selecione a Empresa.");
            return;
        }

        try {
            setUpdatingRequest(true);
            const targetClient = (editClientId && editClientId !== 'none') ? editClientId : undefined;
            await updateDocumentRequest(editingRequest.id, editEmpresaId, targetClient, editStartDate || undefined);
            toast.success("Solicitação atualizada com sucesso!");
            setEditDialogOpen(false);
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao atualizar solicitação:", err);
            toast.error("Falha ao atualizar solicitação de documentos.");
        } finally {
            setUpdatingRequest(false);
        }
    };

    // 5c. Excluir Solicitação
    const handleDeleteRequest = async (reqId: string, workerName?: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir a solicitação de documentos de ${workerName || 'este trabalhador'}?`)) {
            return;
        }

        try {
            await deleteDocumentRequest(reqId);
            toast.success("Solicitação excluída com sucesso!");
            loadDocRequests();
        } catch (err) {
            console.error("Erro ao excluir solicitação:", err);
            toast.error("Falha ao excluir solicitação.");
        }
    };

    // 6. Abrir verificação lado a lado de documentos
    const handleOpenVerify = (req: DocumentRequest) => {
        setSelectedRequest(req);
        const data = req.extracted_data || {};
        setVerifyFormData({
            nome: data.nome || req.worker?.nome || '',
            email: data.email || req.worker?.email || '',
            direccion_actual: data.direccion_actual || req.worker?.address_line || '',
            morada_contrato: data.morada_contrato || req.worker?.morada_contrato || '',
            ubicacion_actual: data.ubicacion_actual || req.worker?.location || '',
            contacto_emergencia_nombre: data.contacto_emergencia_nombre || '',
            contacto_emergencia_parentesco: data.contacto_emergencia_parentesco || '',
            contacto_emergencia_telefono: data.contacto_emergencia_telefono || '',
            talla_camisa: data.talla_camisa || '',
            talla_pantalon: data.talla_pantalon || '',
            banco: data.banco || '',
            iban: data.iban || req.worker?.iban || '',
            nif: data.nif || '',
            niss: data.niss || '',
            nie: data.nie || '',
            dni: data.dni || '',
            pasaporte: data.pasaporte || '',
            licencia_conducir: data.licencia_conducir || '',
            nacionalidade: data.nacionalidade || '',
            fecha_nacimiento: data.fecha_nacimiento || ''
        });
        setActiveDocTab('identity');
        setVerifyDialogOpen(true);
    };

    // 7. Obter URL temporária assinada para visualizar a imagem enviada
    useEffect(() => {
        if (!selectedRequest) return;
        
        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'nif') path = selectedRequest.nif_url || '';
        else if (activeDocTab === 'niss') path = selectedRequest.niss_url || '';
        else if (activeDocTab === 'license') path = selectedRequest.license_url || '';
        else if (activeDocTab === 'iban') path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || '';
        else if (activeDocTab === 'selfie') path = selectedRequest.selfie_url || '';

        if (!path) {
            setActiveDocUrl(null);
            return;
        }

        async function getSigned() {
            try {
                const { data, error } = await supabase.storage
                    .from('worker-incoming-docs')
                    .createSignedUrl(path, 3600);
                
                if (error) throw error;
                setActiveDocUrl(data?.signedUrl || null);
            } catch (err) {
                console.error("Erro ao gerar URL assinada:", err);
                setActiveDocUrl(null);
            }
        }
        getSigned();
    }, [selectedRequest, activeDocTab]);

    // Funções para download individual e em lote dos documentos enviados pelo trabalhador
    const handleDownloadCurrentDoc = async () => {
        if (!selectedRequest) return;
        let path = '';
        if (activeDocTab === 'identity') path = selectedRequest.passport_url || '';
        else if (activeDocTab === 'nif') path = selectedRequest.nif_url || '';
        else if (activeDocTab === 'niss') path = selectedRequest.niss_url || '';
        else if (activeDocTab === 'license') path = selectedRequest.license_url || '';
        else if (activeDocTab === 'iban') path = selectedRequest.iban_url || (selectedRequest.extracted_data?.iban_url) || '';
        else if (activeDocTab === 'selfie') path = selectedRequest.selfie_url || '';

        if (!path) {
            toast.error("Nenhum arquivo enviado nesta aba de documento.");
            return;
        }

        const workerName = selectedRequest.worker?.nome || 'Trabalhador';
        try {
            const { data, error } = await supabase.storage
                .from('worker-incoming-docs')
                .createSignedUrl(path, 60, { download: true });

            if (error || !data?.signedUrl) throw error;

            const ext = path.split('.').pop() || 'file';
            const a = document.createElement('a');
            a.href = data.signedUrl;
            a.download = `${workerName}_${activeDocTab}.${ext}`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Download do documento (${activeDocTab.toUpperCase()}) iniciado!`);
        } catch (err: any) {
            console.error("Erro ao baixar documento:", err);
            toast.error("Falha ao baixar o documento.");
        }
    };

    const handleDownloadAllDocs = async () => {
        if (!selectedRequest) return;
        const workerName = selectedRequest.worker?.nome || 'Trabalhador';
        const docs = [
            { label: 'Identificacao_Passaporte', path: selectedRequest.passport_url },
            { label: 'NIF', path: selectedRequest.nif_url },
            { label: 'NISS', path: selectedRequest.niss_url },
            { label: 'Carta_Conducao', path: selectedRequest.license_url },
            { label: 'Comprovativo_IBAN', path: selectedRequest.iban_url || selectedRequest.extracted_data?.iban_url },
            { label: 'Selfie', path: selectedRequest.selfie_url },
        ].filter(d => Boolean(d.path));

        if (docs.length === 0) {
            toast.error("Nenhum documento anexado para download.");
            return;
        }

        toast.info(`Iniciando download de ${docs.length} documentos de ${workerName}...`);
        for (const doc of docs) {
            try {
                const { data } = await supabase.storage
                    .from('worker-incoming-docs')
                    .createSignedUrl(doc.path!, 60, { download: true });

                if (data?.signedUrl) {
                    const ext = doc.path!.split('.').pop() || 'file';
                    const a = document.createElement('a');
                    a.href = data.signedUrl;
                    a.download = `${workerName}_${doc.label}.${ext}`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            } catch (err) {
                console.error(`Erro ao baixar ${doc.label}:`, err);
            }
        }
    };

    // 8. Salvar aprovação de cadastro
    const handleApproveVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;

        try {
            setVerifying(true);
            
            // Montar notas consolidadas de contatos de emergência e uniformes se houver
            let emergencyNotes = '';
            if (verifyFormData.contacto_emergencia_nombre || verifyFormData.contacto_emergencia_telefono) {
                emergencyNotes += `Contacto Emergência: ${verifyFormData.contacto_emergencia_nombre} (${verifyFormData.contacto_emergencia_parentesco || 'Familiar'}) - Tel: ${verifyFormData.contacto_emergencia_telefono}`;
            }
            if (verifyFormData.talla_camisa || verifyFormData.talla_pantalon) {
                if (emergencyNotes) emergencyNotes += ' | ';
                emergencyNotes += `Uniformes - Camisa: ${verifyFormData.talla_camisa || '-'}, Calça: ${verifyFormData.talla_pantalon || '-'}`;
            }

            // Selfie URL passa a ser a foto oficial do trabalhador se presente
            const approvedPayload = {
                nome: verifyFormData.nome,
                email: verifyFormData.email || undefined,
                location: verifyFormData.ubicacion_actual || undefined,
                address_line: verifyFormData.direccion_actual || undefined,
                morada_contrato: verifyFormData.morada_contrato || undefined,
                notes: emergencyNotes || undefined,
                iban: verifyFormData.iban || undefined,
                nif: verifyFormData.nif,
                niss: verifyFormData.niss,
                nie: verifyFormData.nie,
                dni: verifyFormData.dni,
                pasaporte: verifyFormData.pasaporte,
                licencia_conducir: verifyFormData.licencia_conducir,
                nacionalidade: verifyFormData.nacionalidade,
                fecha_nacimiento: verifyFormData.fecha_nacimiento,
                foto: selectedRequest.selfie_url || undefined
            };

            await approveDocumentRequest(selectedRequest.id, selectedRequest.worker_id, approvedPayload);
            toast.success("Documentação validada e cadastro atualizado com sucesso!");
            setVerifyDialogOpen(false);
            loadDocRequests();
            if (selectedTaskForWorkers) {
                loadTaskWorkers(selectedTaskForWorkers);
            }
        } catch (err) {
            console.error("Erro ao aprovar documentos:", err);
            toast.error("Erro ao salvar validação de documentos.");
        } finally {
            setVerifying(false);
        }
    };

    // 8.5 Trigger para abrir modal de gerar contrato a partir de uma solicitação validada
    const handleTriggerGenerate = (workerId: string, empresaId: string) => {
        setSelectedWorkerId(workerId);
        
        // Mapear empresaId para selectedContratante
        if (empresaId === '441f1f5d-aed3-40e3-8c77-7b1217757251') {
            setSelectedContratante('STOCCO');
        } else if (empresaId === 'dae64d51-2181-4510-b14f-e63d2f111a8e') {
            setSelectedContratante('WISEOWE UNIPESSOAL LDA');
        } else if (empresaId === '847796c4-b253-4e53-9e6b-34a127ec7d85') {
            setSelectedContratante('LUMINOUS CAPITAL UNIPESSOAL LDA');
        } else if (empresaId === 'a798620a-358a-4c6c-9db2-3a507c583cac') {
            setSelectedContratante('TRIANGULO');
        } else {
            setSelectedContratante('');
        }
        
        setGenerateDialogOpen(true);
    };

    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success("Link copiado para a área de transferência!");
    };

    const handleCopyInviteLink = (link: string, workerName?: string) => {
        const greeting = workerName ? `Hola ${workerName}` : 'Hola';
        const msg = `${greeting} 
A continuación se compartirá un link, donde proporcionarás la documentación e información requerida para poder continuar con el proceso de gestión de contrato.
 
*LINK: ${link}
 
Muchas gracias.`;
        navigator.clipboard.writeText(msg);
        toast.success("Mensagem padrão com o link copiada!");
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-115px)] overflow-hidden space-y-6 p-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            Painel de Documentos & Contratos
                        </h1>
                        <p className="text-muted-foreground">
                            Gerencie e emita contratos de trabalho com assinatura eletrônica e captura inteligente de documentos.
                        </p>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Botão Solicitar Documentos */}
                        <Dialog open={requestDialogOpen} onOpenChange={(open) => {
                            setRequestDialogOpen(open);
                            if (!open) {
                                setRequestWorkerId(null);
                                setRequestSuccessLink(null);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-600/25 hover:bg-slate-50 dark:hover:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold gap-1.5">
                                    <Camera className="h-4 w-4" />
                                    Solicitar Documentos
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
                                <DialogHeader>
                                    <DialogTitle>Solicitar Documentos por Link</DialogTitle>
                                    <DialogDescription>
                                        Gere um portal exclusivo e temporário para o trabalhador tirar fotos e enviar os documentos de cadastro do próprio celular.
                                    </DialogDescription>
                                </DialogHeader>
                                
                                {!requestSuccessLink ? (
                                    <form onSubmit={handleCreateRequest} className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Empresa (Contratante)</Label>
                                            <Select 
                                                value={requestEmpresaId} 
                                                onValueChange={(val) => {
                                                    setRequestEmpresaId(val);
                                                    setRequestWorkerId(null);
                                                    setRequestClientId('none');
                                                    loadWorkersForEmpresa(val);
                                                    loadClients(val);
                                                }}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                    <SelectValue placeholder="Selecione a empresa contratante..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="dae64d51-2181-4510-b14f-e63d2f111a8e">Wiseowe Unipessoal Lda</SelectItem>
                                                    <SelectItem value="441f1f5d-aed3-40e3-8c77-7b1217757251">Stocco, Lda</SelectItem>
                                                    <SelectItem value="847796c4-b253-4e53-9e6b-34a127ec7d85">Luminous Capital Unipessoal Lda</SelectItem>
                                                    <SelectItem value="a798620a-358a-4c6c-9db2-3a507c583cac">Triângulo</SelectItem>
                                                    <SelectItem value="f5d32323-4d68-4a54-8fb8-0ba670dcaecf">Kotrik & Rosas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                         <div className="space-y-2">
                                            <Label>Cliente (Alocação / Destino)</Label>
                                            <Select 
                                                value={requestClientId} 
                                                onValueChange={setRequestClientId}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                    <SelectValue placeholder="Selecione o cliente de destino..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sem Cliente Especificado</SelectItem>
                                                    {clientsList.map(cli => (
                                                        <SelectItem key={cli.id} value={cli.id}>{cli.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Data de Início Previsto (Trabalho)</Label>
                                            <Input 
                                                type="date"
                                                value={requestStartDate}
                                                onChange={(e) => setRequestStartDate(e.target.value)}
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Selecionar Trabalhador</Label>
                                            <Combobox
                                                options={requestWorkersList.length > 0 ? requestWorkersList : workersList}
                                                value={requestWorkerId || ''}
                                                onChange={(val) => setRequestWorkerId(val || null)}
                                                placeholder="Pesquise o trabalhador cadastrado..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={creatingRequest || !requestWorkerId || !requestEmpresaId} className="bg-indigo-600 hover:bg-indigo-500">
                                                {creatingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Criar Link
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-4 pt-2">
                                        <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                <CheckCircle className="h-5 w-5" />
                                                <span>Link de Cadastro Criado!</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Copie o link seguro abaixo e envie para o trabalhador iniciar o preenchimento e captura das fotos:</p>
                                            
                                            <div className="flex gap-2">
                                                <Input readOnly value={requestSuccessLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                <Button size="icon" variant="outline" onClick={() => handleCopyInviteLink(requestSuccessLink, workers.find(w => w.id === requestWorkerId)?.nome)} title="Copiar mensagem formatada com o link">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>

                        {/* Modal de Editar Solicitação de Documentos */}
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent className="max-w-xl bg-white dark:bg-slate-900">
                                <DialogHeader>
                                    <DialogTitle>Editar Solicitação de Documentos</DialogTitle>
                                    <DialogDescription>
                                        Altere a Empresa Contratante, o Cliente de destino e a Data de Início do trabalho para <strong>{editingRequest?.worker?.nome}</strong>.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleSaveEditRequest} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Empresa (Contratante)</Label>
                                        <Select 
                                            value={editEmpresaId} 
                                            onValueChange={(val) => {
                                                setEditEmpresaId(val);
                                                setEditClientId('none');
                                                loadClients(val);
                                            }}
                                        >
                                            <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                <SelectValue placeholder="Selecione a empresa contratante..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dae64d51-2181-4510-b14f-e63d2f111a8e">Wiseowe Unipessoal Lda</SelectItem>
                                                <SelectItem value="441f1f5d-aed3-40e3-8c77-7b1217757251">Stocco, Lda</SelectItem>
                                                <SelectItem value="847796c4-b253-4e53-9e6b-34a127ec7d85">Luminous Capital Unipessoal Lda</SelectItem>
                                                <SelectItem value="a798620a-358a-4c6c-9db2-3a507c583cac">Triângulo</SelectItem>
                                                <SelectItem value="f5d32323-4d68-4a54-8fb8-0ba670dcaecf">Kotrik & Rosas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Cliente (Alocação / Destino)</Label>
                                        <Select 
                                            value={editClientId} 
                                            onValueChange={setEditClientId}
                                        >
                                            <SelectTrigger className="bg-white dark:bg-black w-full text-left">
                                                <SelectValue placeholder="Selecione o cliente de destino..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sem Cliente Especificado</SelectItem>
                                                {clientsList.map(cli => (
                                                    <SelectItem key={cli.id} value={cli.id}>{cli.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Data de Início Previsto (Trabalho)</Label>
                                        <Input 
                                            type="date"
                                            value={editStartDate}
                                            onChange={(e) => setEditStartDate(e.target.value)}
                                            className="bg-white dark:bg-black"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                                        <Button type="submit" disabled={updatingRequest || !editEmpresaId} className="bg-indigo-600 hover:bg-indigo-500">
                                            {updatingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Botão Gerar Contrato */}
                        <Dialog open={generateDialogOpen} onOpenChange={(open) => {
                            setGenerateDialogOpen(open);
                            if (!open) {
                                setSelectedWorkerId(null);
                                setSelectedContratante('');
                                setSelectedContractType('');
                                setGenerationSuccess(null);
                                setPreviewBlob(null);
                            }
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1">
                                    <Plus className="h-4 w-4" />
                                    Gerar Contrato
                                </Button>
                            </DialogTrigger>
                            <DialogContent className={`${generationSuccess ? 'max-w-7xl h-[85vh]' : 'max-w-md'} flex flex-col bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300`}>
                                <DialogHeader>
                                    <DialogTitle>Gerar Novo Contrato</DialogTitle>
                                    <DialogDescription>
                                        Selecione o trabalhador e o modelo de contrato. O sistema gerará o arquivo automaticamente com validade eIDAS.
                                    </DialogDescription>
                                </DialogHeader>

                                {!generationSuccess ? (
                                    <form onSubmit={handleGenerate} className="space-y-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Selecionar Trabalhador</Label>
                                            <Combobox
                                                options={workersList}
                                                value={selectedWorkerId || ''}
                                                onChange={(val) => setSelectedWorkerId(val || null)}
                                                placeholder="Digite o nome do trabalhador..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Empresa Contratante</Label>
                                            <Select value={selectedContratante} onValueChange={setSelectedContratante}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a empresa contratante..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="STOCCO">Stocco</SelectItem>
                                                    <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                                    <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                                    <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Modelo de Contrato</Label>
                                            <Select value={selectedContractType} onValueChange={setSelectedContractType}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo de contrato..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="contrato_termo_incerto">Contrato a Termo Incerto (Passaporte)</SelectItem>
                                                    <SelectItem value="contrato_nis">Contrato NIS (NIF)</SelectItem>
                                                    <SelectItem value="contrato_alta">Contrato de Alta (Contabilidade - Sem Assinatura)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancelar</Button>
                                            <Button type="submit" disabled={generating} className="bg-indigo-600 hover:bg-indigo-500">
                                                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Gerar Contrato
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0 pt-2">
                                        {/* Painel Esquerdo: Pré-visualização do Contrato */}
                                        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 relative min-h-0 flex flex-col docx-preview-container-parent">
                                            {loadingPreview && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 gap-2">
                                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Carregando visualização prévia...</span>
                                                </div>
                                            )}
                                            {!loadingPreview && !previewBlob && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                                                    <AlertCircle className="h-10 w-10 text-slate-400 mb-2" />
                                                    <span className="text-sm text-center font-medium text-slate-500">Pré-visualização indisponível.</span>
                                                </div>
                                            )}
                                            <div ref={previewContainerRef} className="docx-wrapper" />
                                        </div>

                                        {/* Painel Direito: Ações e Status */}
                                        <div className="w-full md:w-[380px] shrink-0 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-y-auto">
                                            <div className="space-y-4">
                                                <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                                                        <CheckCircle className="h-5 w-5" />
                                                        <span>Contrato Gerado com Sucesso!</span>
                                                    </div>
                                                    {generationSuccess.contractType === 'contrato_alta' ? (
                                                        <p className="text-xs text-slate-500 leading-relaxed">
                                                            Este contrato foi classificado como <strong>Alta (Contabilidade)</strong>. Não requer assinatura eletrônica ou código OTP. O arquivo foi enviado diretamente para o histórico de contratos.
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p className="text-xs text-slate-500">
                                                                Código OTP temporário (Desenvolvimento): <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-2 py-0.5 rounded">{generationSuccess.otpCode}</span>
                                                            </p>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs text-muted-foreground">Link de Assinatura Pública</Label>
                                                                <div className="flex gap-2">
                                                                    <Input readOnly value={generationSuccess.signingLink} className="font-mono text-xs select-all bg-white dark:bg-black" />
                                                                    <Button size="icon" variant="outline" onClick={() => handleCopyLink(generationSuccess.signingLink)}>
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {generationSuccess.documentUrl && (
                                                        <div className="pt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold"
                                                                onClick={() => handleDownloadContract({
                                                                    document_url: generationSuccess.documentUrl,
                                                                    contract_type: generationSuccess.contractType,
                                                                    worker: { nome: 'Contrato' }
                                                                } as any)}
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                Baixar Arquivo Gerado (.docx)
                                                            </Button>
                                                        </div>
                                                    )}

                                                    <div className="text-xs flex items-center gap-2 text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 leading-normal">
                                                        {generationSuccess.contractType === 'contrato_alta' ? (
                                                            <span>Pronto para envio à contabilidade.</span>
                                                        ) : generationSuccess.emailSent ? (
                                                            <>
                                                                <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                <span>E-mail enviado com sucesso ao trabalhador.</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                                                <span>Sem envio automático de e-mail (Resend não configurado ou trabalhador sem e-mail). Copie o link acima.</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                                                <Button onClick={() => setGenerateDialogOpen(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                                    Fechar Painel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Tabs de Navegação */}
                <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0 overflow-hidden" onValueChange={(value) => {
                    if (value === 'requests') {
                        loadDocRequests();
                    } else if (value === 'contracts') {
                        loadContracts();
                    } else if (value === 'tasks' && selectedTaskForWorkers) {
                        loadTaskWorkers(selectedTaskForWorkers);
                    }
                }}>
                    <TabsList className="grid w-full md:w-[800px] grid-cols-4 shrink-0">
                        <TabsTrigger value="tasks">Tarefas Operacionais</TabsTrigger>
                        <TabsTrigger value="requests">Solicitações de Documentos</TabsTrigger>
                        <TabsTrigger value="contracts">Contratos & Assinaturas</TabsTrigger>
                        <TabsTrigger value="templates">Configuração de Modelos</TabsTrigger>
                    </TabsList>
                    
                    {/* Conteúdo 1: Tarefas do Kanban */}
                    <TabsContent value="tasks" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4">
                        <DepartmentTaskBoard 
                            title="Fila de Tarefas de Documentação" 
                            departmentCodes={['DOCUMENTACION', 'CONTRATOS']} 
                            onTaskClick={(task) => {
                                setSelectedTaskForWorkers(task);
                                loadTaskWorkers(task);
                                setWorkersDialogOpen(true);
                            }}
                        />
                    </TabsContent>

                    {/* Conteúdo 2: Solicitações de Documentos (OCR) */}
                    <TabsContent value="requests" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4 space-y-4">
                        {/* Barra de Filtros e Busca */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTermRequests}
                                    onChange={(e) => setSearchTermRequests(e.target.value)}
                                    placeholder="Pesquisar por trabalhador, empresa ou cliente..."
                                    className="pl-9 pr-8 bg-white dark:bg-black"
                                />
                                {searchTermRequests && (
                                    <button
                                        onClick={() => setSearchTermRequests('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[180px]">
                                    <Select value={empresaFilterRequests} onValueChange={setEmpresaFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Empresa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as Empresas</SelectItem>
                                            {uniqueEmpresasRequests.map(emp => (
                                                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[200px]">
                                    <Select value={clientFilterRequests} onValueChange={setClientFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Clientes</SelectItem>
                                            {uniqueClientsRequests.map(cli => (
                                                <SelectItem key={cli} value={cli}>{cli}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="w-[180px]">
                                    <Select value={statusFilterRequests} onValueChange={setStatusFilterRequests}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Status</SelectItem>
                                            <SelectItem value="pending_upload">Aguardando Envio</SelectItem>
                                            <SelectItem value="submitted">Recebido - Analisar</SelectItem>
                                            <SelectItem value="verified">Cadastro Validado</SelectItem>
                                            <SelectItem value="expired">Expirado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(searchTermRequests || statusFilterRequests !== 'all' || empresaFilterRequests !== 'all' || clientFilterRequests !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTermRequests('');
                                            setStatusFilterRequests('all');
                                            setEmpresaFilterRequests('all');
                                            setClientFilterRequests('all');
                                        }}
                                        className="text-indigo-600 dark:text-indigo-400 font-semibold"
                                    >
                                        Limpar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Links e Envios Cadastrais</h3>
                                <Button size="sm" variant="ghost" onClick={loadDocRequests}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingDocRequests ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Carregando solicitações...</span>
                                    </div>
                                ) : filteredRequests.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Camera className="h-10 w-10 text-slate-400" />
                                        <span>Nenhuma solicitação de documentos encontrada.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('worker')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Trabalhador
                                                        {sortFieldRequests === 'worker' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('empresa')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Empresa
                                                        {sortFieldRequests === 'empresa' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('client')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Cliente
                                                        {sortFieldRequests === 'client' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('planned_start_date')}
                                                >
                                                    <div className="flex items-center gap-1 flex-row">
                                                        Início Previsto
                                                        {sortFieldRequests === 'planned_start_date' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
                                                    onClick={() => handleRequestSort('created_at')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Criado Em
                                                        {sortFieldRequests === 'created_at' ? (sortDirectionRequests === 'asc' ? ' ↑' : ' ↓') : ' ⇅'}
                                                    </div>
                                                </TableHead>
                                                <TableHead>Expira Em</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRequests.map((req) => {
                                                const inviteLink = `${window.location.origin}/enviar-documentos/${req.token}`;
                                                const isExpired = new Date(req.expires_at) < new Date();
                                                
                                                const activeAssignment = req.worker?.assignments?.find(a => a.status === 'active');
                                                const latestAssignment = req.worker?.assignments?.[0];
                                                const clientName = req.client?.trade_name || req.client?.legal_name ||
                                                                   activeAssignment?.client?.trade_name || activeAssignment?.client?.legal_name ||
                                                                   latestAssignment?.client?.trade_name || latestAssignment?.client?.legal_name || 'Sem Alocação';
                                                
                                                const rawWorkerCode = (req.worker as any)?.cod_colab || '';
                                                const workerCode = rawWorkerCode ? (String(rawWorkerCode).startsWith('E') ? String(rawWorkerCode) : `E${rawWorkerCode}`) : '';

                                                const rawClientCode = (req.client as any)?.codigo || (activeAssignment?.client as any)?.codigo || (latestAssignment?.client as any)?.codigo || '';
                                                const clientCode = rawClientCode ? (String(rawClientCode).startsWith('C') ? String(rawClientCode) : `C${rawClientCode}`) : '';

                                                const empresaName = req.empresa?.name || 'Stocco';
                                                
                                                const plannedStartDate = (req as any).extracted_data?.start_date ||
                                                                          activeAssignment?.planned_start_date || activeAssignment?.start_date ||
                                                                          latestAssignment?.planned_start_date || latestAssignment?.start_date;

                                                const formatDisplayDate = (dateStr?: string | null) => {
                                                    if (!dateStr) return 'Não informada';
                                                    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
                                                    if (match) {
                                                        return `${match[3]}/${match[2]}/${match[1]}`;
                                                    }
                                                    try {
                                                        return new Date(dateStr).toLocaleDateString('pt-PT');
                                                    } catch (_) {
                                                        return dateStr;
                                                    }
                                                };

                                                return (
                                                    <TableRow key={req.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                                                <span>{req.worker?.nome}</span>
                                                                {workerCode && (
                                                                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                                        ({workerCode})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">{req.worker?.email || req.worker?.movil || 'Sem contato'}</div>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            {empresaName}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {clientCode && (
                                                                    <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-1.5 py-0.5 rounded">
                                                                        [{clientCode}]
                                                                    </span>
                                                                )}
                                                                <span>{clientName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                                            {formatDisplayDate(plannedStartDate)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                                req.status === 'submitted' ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/20' :
                                                                isExpired ? 'bg-red-500/10 text-red-500 hover:bg-red-500/10 border-red-500/20' :
                                                                'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10'
                                                            }>
                                                                {req.status === 'verified' ? 'Cadastro Validado' :
                                                                 req.status === 'submitted' ? 'Recebido - Analisar' :
                                                                 isExpired ? 'Expirado' : 'Aguardando Envio'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {new Date(req.created_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-slate-500 text-sm">
                                                            {new Date(req.expires_at).toLocaleDateString('pt-PT')}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleOpenEditRequest(req)}
                                                                title="Editar Empresa e Cliente"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>

                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleDeleteRequest(req.id, req.worker?.nome)}
                                                                title="Excluir Solicitação"
                                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>

                                                            {req.status === 'pending_upload' && !isExpired && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    onClick={() => handleCopyInviteLink(inviteLink, req.worker?.nome)}
                                                                    title="Copiar Link de Envio"
                                                                >
                                                                    <Copy className="h-4 w-4 mr-1 text-slate-500" /> Copiar Link
                                                                </Button>
                                                            )}
                                                            {req.status === 'submitted' && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-indigo-600 hover:bg-indigo-500"
                                                                    onClick={() => handleOpenVerify(req)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" /> Analisar
                                                                </Button>
                                                            )}
                                                            {req.status === 'verified' && (
                                                                <div className="inline-flex items-center gap-2">
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold text-xs gap-1"
                                                                        onClick={() => handleOpenVerify(req)}
                                                                        title="Visualizar e Baixar Documentos do Trabalhador"
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5" /> Visualizar / Baixar Docs
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                                        onClick={() => handleTriggerGenerate(req.worker_id, req.empresa_id)}
                                                                    >
                                                                        <Plus className="h-3 w-3" /> Gerar Contrato
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Conteúdo 3: Gerenciador de Contratos */}
                    <TabsContent value="contracts" className="flex-1 hidden data-[state=active]:flex flex-col min-h-0 overflow-hidden pt-4 space-y-4">
                        {/* Barra de Filtros e Busca */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchTermContracts}
                                    onChange={(e) => setSearchTermContracts(e.target.value)}
                                    placeholder="Pesquisar por trabalhador, empresa ou cliente..."
                                    className="pl-9 pr-8 bg-white dark:bg-black"
                                />
                                {searchTermContracts && (
                                    <button
                                        onClick={() => setSearchTermContracts('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-[200px]">
                                    <Select value={statusFilterContracts} onValueChange={setStatusFilterContracts}>
                                        <SelectTrigger className="bg-white dark:bg-black">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Status</SelectItem>
                                            <SelectItem value="pending_signature">Pendente Assinatura</SelectItem>
                                            <SelectItem value="signed">Assinado</SelectItem>
                                            <SelectItem value="no_signature">Não Requer Assinatura</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(searchTermContracts || statusFilterContracts !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTermContracts('');
                                            setStatusFilterContracts('all');
                                        }}
                                        className="text-indigo-600 dark:text-indigo-400 font-semibold"
                                    >
                                        Limpar Filtros
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Contratos Gerados</h3>
                                <Button size="sm" variant="ghost" onClick={loadContracts}><RefreshCw className="h-4 w-4" /></Button>
                            </div>

                            <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                                {loadingContracts ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                        <span>Buscando contratos gerados...</span>
                                    </div>
                                ) : filteredContracts.length === 0 ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                        <FileText className="h-10 w-10 text-slate-400" />
                                        <span>Nenhum contrato encontrado.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead>Trabalhador</TableHead>
                                                <TableHead>Empresa</TableHead>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>OTP Código</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Data de Geração</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredContracts.map((contract) => {
                                                const signLink = `${window.location.origin}/assinar/${contract.signature_token}`;
                                                const clientName = contract.assignment?.client?.trade_name || contract.assignment?.client?.legal_name || 'Sem Alocação';
                                                
                                                return (
                                                    <TableRow key={contract.id}>
                                                        <TableCell>
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {contract.worker?.nome}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {contract.worker?.email || 'E-mail não cadastrado'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {contract.contratante}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {clientName}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">
                                                                {contract.contract_type.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                                                            {contract.otp_code || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={
                                                                contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                                contract.status === 'pending_signature' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20' :
                                                                contract.status === 'no_signature' ? 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10 border-slate-500/20' :
                                                                'bg-slate-500/10 text-slate-500 hover:bg-slate-500/10'
                                                            }>
                                                                {contract.status === 'signed' ? 'Assinado' :
                                                                 contract.status === 'pending_signature' ? 'Pendente Assinatura' :
                                                                 contract.status === 'no_signature' ? 'Não Requer Assinatura' :
                                                                 contract.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {contract.created_at ? new Date(contract.created_at).toLocaleDateString('pt-PT') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDownloadContract(contract)}
                                                                title="Baixar Contrato"
                                                            >
                                                                <FileText className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                            </Button>

                                                            {contract.status !== 'no_signature' && (
                                                                <>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleCopyLink(signLink)}
                                                                        title="Copiar Link de Assinatura"
                                                                    >
                                                                        <Copy className="h-4 w-4 text-slate-600 hover:text-slate-800" />
                                                                    </Button>
                                                                    
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => window.open(signLink, '_blank')}
                                                                        title="Abrir Tela de Assinatura"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteContractItem(contract.id)}
                                                                title="Excluir Contrato"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-rose-500 hover:text-rose-700" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Conteúdo 4: Configuração de Modelos */}
                    <TabsContent value="templates" className="flex-1 overflow-y-auto min-h-0 pt-4">
                        <div className="rounded-md border bg-card p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-500" />
                                        Modelos de Contratos e Documentos
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Selecione a empresa contratante para gerenciar e customizar os modelos de arquivo .docx
                                    </p>
                                </div>
                                <div className="w-full md:w-[320px]">
                                    <Label className="text-xs text-slate-500 font-semibold mb-1 block">Empresa Contratante</Label>
                                    <Select value={selectedConfigContratante} onValueChange={setSelectedConfigContratante}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecione a empresa contratante..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STOCCO">Stocco</SelectItem>
                                            <SelectItem value="WISEOWE UNIPESSOAL LDA">Wiseowe Unipessoal Lda</SelectItem>
                                            <SelectItem value="LUMINOUS CAPITAL UNIPESSOAL LDA">Luminous Capital Unipessoal Lda</SelectItem>
                                            <SelectItem value="MASTERCORP PORTUGAL UNIPESSOAL LDA">Mastercorp Portugal Unipessoal Lda</SelectItem>
                                            <SelectItem value="TRIANGULO">Triangulo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                                {[
                                    {
                                        type: 'contrato_termo_incerto',
                                        name: 'Contrato a Termo Incerto (Passaporte)',
                                        desc: 'Modelo padrão para admissão de trabalhadores temporários identificados por número de Passaporte.',
                                        fileName: `CONTRATO TERMO INCERTO - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'contrato_nis',
                                        name: 'Contrato NIS (NIF)',
                                        desc: 'Modelo padrão para admissão de trabalhadores com identificação NISS/NIF registrada.',
                                        fileName: `CONTRATO NIS - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'contrato_alta',
                                        name: 'Contrato de Alta (Sem Assinatura)',
                                        desc: 'Modelo enviado diretamente à contabilidade/administrativo. Não exige assinatura eletrônica do trabalhador.',
                                        fileName: `CONTRATO DE ALTA - ${selectedConfigContratante.toUpperCase()}.docx`
                                    },
                                    {
                                        type: 'rescisao',
                                        name: 'Comunicado de Rescisão',
                                        desc: 'Modelo oficial de comunicação e notificação de fim de contrato / encerramento de vínculo.',
                                        fileName: `COMUNICADO RESCISAO ${selectedConfigContratante.toUpperCase()}.docx`
                                    }
                                ].map((doc) => (
                                    <div key={doc.type} className="flex flex-col justify-between border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50/50 dark:bg-slate-900/20 hover:shadow-sm transition-all">
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</h4>
                                                <Badge variant="outline" className="text-[10px] font-mono border-indigo-100 bg-indigo-50/30 text-indigo-600 dark:border-slate-800 dark:text-indigo-400">
                                                    .docx
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{doc.desc}</p>
                                            <div className="pt-2 text-[11px] font-mono text-slate-400 leading-normal border-t border-slate-100 dark:border-slate-800 mt-2">
                                                <div><span className="text-slate-500">Pasta:</span> {selectedConfigContratante}/</div>
                                                <div className="truncate"><span className="text-slate-500">Arquivo:</span> {doc.fileName}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 pt-5 border-t border-slate-200 dark:border-slate-800/80 mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => handleDownloadConfigTemplate(doc.type)}
                                                disabled={downloadingTemplate === doc.type}
                                            >
                                                {downloadingTemplate === doc.type ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                        Baixando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                                                        Baixar Modelo
                                                    </>
                                                )}
                                            </Button>
                                            
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => triggerUpload(doc.type)}
                                                disabled={uploadingTemplate === doc.type}
                                            >
                                                {uploadingTemplate === doc.type ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                                        Subir Novo
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Input de Arquivo oculto para upload de templates */}
                        <input
                            type="file"
                            ref={configFileInputRef}
                            onChange={handleUploadConfigTemplate}
                            accept=".docx"
                            className="hidden"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal Lado a Lado de Verificação (Revisão OCR) */}
            <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
                <DialogContent className="max-w-7xl h-[85vh] flex flex-col bg-white dark:bg-slate-900">
                    <DialogHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                    Revisão e Visualização de Documentos do Trabalhador
                                </DialogTitle>
                                <DialogDescription>
                                    Visualize e baixe os documentos originais (Identificação, NIF, NISS, Carta de Condução, Selfie) enviados pelo trabalhador.
                                </DialogDescription>
                            </div>
                            {selectedRequest && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold gap-1.5"
                                        onClick={handleDownloadCurrentDoc}
                                    >
                                        <Download className="h-4 w-4" /> Baixar Doc Atual
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-1.5"
                                        onClick={handleDownloadAllDocs}
                                    >
                                        <Download className="h-4 w-4" /> Baixar Todos os Anexos
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden pt-2">
                            {/* Painel Esquerdo: Anexos Enviados */}
                            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-950/20">
                                {/* Navegador de Abas de Anexos */}
                                <div className="flex border-b dark:border-slate-800 text-xs font-semibold bg-slate-100 dark:bg-slate-800/80">
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('identity')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'identity' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Identificação
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('nif')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'nif' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NIF
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('niss')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'niss' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        NISS
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('license')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'license' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Carta
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('iban')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'iban' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        IBAN
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setActiveDocTab('selfie')}
                                        className={`flex-1 py-3 px-2 border-b-2 text-center transition-all ${activeDocTab === 'selfie' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                                    >
                                        Selfie
                                    </button>
                                </div>

                                {/* Preview da Imagem */}
                                <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 overflow-auto">
                                    {activeDocUrl ? (
                                        activeDocUrl.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                                            <iframe src={activeDocUrl} className="w-full h-full border-none rounded bg-white" title="PDF Document Viewer" />
                                        ) : (
                                            <img src={activeDocUrl} className="max-w-full max-h-full object-contain rounded" alt="Document Preview" />
                                        )
                                    ) : (
                                        <div className="text-center text-slate-600 flex flex-col items-center gap-2">
                                            <FileText className="h-10 w-10 text-slate-700" />
                                            <span>Nenhum arquivo enviado para esta categoria.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Painel Direito: Formulário com Dados do OCR */}
                            <form onSubmit={handleApproveVerify} className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20 p-4 justify-between overflow-y-auto">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2 text-sm">Dados Cadastrais Revisados</h4>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-xs">Nome Completo</Label>
                                            <Input required value={verifyFormData.nome} onChange={(e) => setVerifyFormData({ ...verifyFormData, nome: e.target.value })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Banco / Entidade</Label>
                                                <Input value={verifyFormData.banco} onChange={(e) => setVerifyFormData({ ...verifyFormData, banco: e.target.value })} placeholder="Ex: Santander, Revolut" />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Número de IBAN</Label>
                                                <Input value={verifyFormData.iban} onChange={(e) => setVerifyFormData({ ...verifyFormData, iban: e.target.value })} placeholder="Ex: ES91 2100..." className="font-mono text-xs" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">NIF (Portugal)</Label>
                                                <Input value={verifyFormData.nif} onChange={(e) => setVerifyFormData({ ...verifyFormData, nif: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">NISS (Portugal)</Label>
                                                <Input value={verifyFormData.niss} onChange={(e) => setVerifyFormData({ ...verifyFormData, niss: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <Label className="text-xs">DNI</Label>
                                                <Input value={verifyFormData.dni} onChange={(e) => setVerifyFormData({ ...verifyFormData, dni: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">NIE</Label>
                                                <Input value={verifyFormData.nie} onChange={(e) => setVerifyFormData({ ...verifyFormData, nie: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Passaporte</Label>
                                                <Input value={verifyFormData.pasaporte} onChange={(e) => setVerifyFormData({ ...verifyFormData, pasaporte: e.target.value })} />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs">Carta de Condução / Habilitação</Label>
                                            <Input value={verifyFormData.licencia_conducir} onChange={(e) => setVerifyFormData({ ...verifyFormData, licencia_conducir: e.target.value })} />
                                        </div>

                                         <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs">Nacionalidade</Label>
                                                <Input value={verifyFormData.nacionalidade} onChange={(e) => setVerifyFormData({ ...verifyFormData, nacionalidade: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Data de Nascimento (AAAA-MM-DD)</Label>
                                                <Input type="date" value={verifyFormData.fecha_nacimiento} onChange={(e) => setVerifyFormData({ ...verifyFormData, fecha_nacimiento: e.target.value })} />
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto & Moradas</h5>
                                            <div>
                                                <Label className="text-xs">Correo Electrónico (E-mail)</Label>
                                                <Input type="email" value={verifyFormData.email} onChange={(e) => setVerifyFormData({ ...verifyFormData, email: e.target.value })} placeholder="email@exemplo.com" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Ubicación / Cidade e País</Label>
                                                    <Input value={verifyFormData.ubicacion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, ubicacion_actual: e.target.value })} placeholder="Ex: Madrid, España" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Endereço / Morada Atual (Origem)</Label>
                                                    <Input value={verifyFormData.direccion_actual} onChange={(e) => setVerifyFormData({ ...verifyFormData, direccion_actual: e.target.value })} placeholder="Ex: Calle Mayor 12, 3ºB" />
                                                </div>
                                            </div>

                                            {/* Campo para Endereço Oficial do Contrato em Portugal */}
                                            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                                                <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Endereço para Contrato (Portugal)
                                                </Label>
                                                <Input 
                                                    value={verifyFormData.morada_contrato} 
                                                    onChange={(e) => setVerifyFormData({ ...verifyFormData, morada_contrato: e.target.value })} 
                                                    placeholder="Ex: Rua Garrett 25, 2º Dto, 1200-203 Lisboa, Portugal" 
                                                    className="bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 text-sm font-medium"
                                                />
                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                                                    * Se preenchido, este endereço de Portugal será utilizado na morada do contrato em vez do endereço de origem.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Contacto de Emergência / Familiar</h5>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs">Nome do Familiar</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_nombre} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_nombre: e.target.value })} placeholder="Nome completo" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Parentesco</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_parentesco} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_parentesco: e.target.value })} placeholder="Ex: Esposa" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Telefone</Label>
                                                    <Input value={verifyFormData.contacto_emergencia_telefono} onChange={(e) => setVerifyFormData({ ...verifyFormData, contacto_emergencia_telefono: e.target.value })} placeholder="+34 600..." />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-3 space-y-3">
                                            <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Tamanhos de Uniforme / EPI</h5>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Talla Camisa / Polo</Label>
                                                    <Input value={verifyFormData.talla_camisa} onChange={(e) => setVerifyFormData({ ...verifyFormData, talla_camisa: e.target.value })} placeholder="Ex: M, L, XL" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Talla Pantalón</Label>
                                                    <Input value={verifyFormData.talla_pantalon} onChange={(e) => setVerifyFormData({ ...verifyFormData, talla_pantalon: e.target.value })} placeholder="Ex: 40, 42, 44" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t mt-4">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setVerifyDialogOpen(false)}>Fechar</Button>
                                    <Button type="submit" disabled={verifying} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                                        {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {selectedRequest?.status === 'verified' ? 'Salvar Alterações no Cadastro' : 'Aprovar & Salvar no Cadastro'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Gerenciamento de Trabalhadores da Solicitação */}
            <Dialog open={workersDialogOpen} onOpenChange={setWorkersDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            Trabalhadores da Solicitação {selectedTaskForWorkers?.solicitud?.codigo}
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie o envio de documentos, contato via WhatsApp e emissão de contratos para os trabalhadores vinculados a este pedido.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumo da solicitação/pedido */}
                    {taskMetadata && (
                        <div className="grid grid-cols-4 gap-3 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/30 text-sm mb-2 mt-2">
                            <div>
                                <span className="font-semibold text-muted-foreground block text-xs">EMPRESA DO GRUPO</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{taskMetadata.empresaName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block text-xs">CLIENTE</span>
                                <span className="font-bold text-indigo-900 dark:text-indigo-200">{taskMetadata.clientName}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block text-xs">LOCAL / OBRA</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{taskMetadata.siteName}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground block text-xs">PEDIDO / SOLICITAÇÃO</span>
                                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800/50 px-2 py-0.5 rounded text-xs truncate block" title={taskMetadata.pedidoCode}>
                                    {taskMetadata.pedidoCode}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 relative min-h-[300px] border rounded-lg mt-2 [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                        {loadingTaskWorkers ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <span>Carregando trabalhadores...</span>
                            </div>
                        ) : taskWorkers.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 h-full">
                                <AlertCircle className="h-10 w-10 text-slate-400" />
                                <span>Nenhum trabalhador vinculado a este pedido foi encontrado.</span>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                                    <TableRow>
                                        <TableHead>Trabalhador</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Status Documentos</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {taskWorkers.map((item) => {
                                        const phone = item.worker?.movil || 'Sem telefone';
                                        
                                        // Determinar status do convite de documentos
                                        const docStatus = item.docRequest?.status;
                                        
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {item.worker?.nome || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Cód: {item.worker?.cod_colab || 'N/A'} | Tel: {phone}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {item.worker?.funcion || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {!item.docRequest ? (
                                                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200">
                                                            Sem Link de Envio
                                                        </Badge>
                                                    ) : docStatus === 'verified' ? (
                                                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                                                            Cadastro Validado
                                                        </Badge>
                                                    ) : docStatus === 'submitted' ? (
                                                        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/20 hover:bg-blue-500/20">
                                                            Recebido - Analisar
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                                                            Aguardando Envio
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                                                    {/* Analisar Button */}
                                                    {docStatus === 'submitted' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs gap-1.5"
                                                            onClick={() => handleOpenVerify(item.docRequest)}
                                                            title="Analisar documentos enviados"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            Analisar
                                                        </Button>
                                                    )}

                                                    {/* WhatsApp Button */}
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                                                        onClick={() => handleSendWhatsApp(item)}
                                                        title="Enviar mensagem com template via WhatsApp"
                                                    >
                                                        <Send className="h-3 w-3" />
                                                        WhatsApp
                                                    </Button>

                                                    {/* Copiar Link Button */}
                                                     {item.docRequest ? (
                                                         <Button
                                                             size="sm"
                                                             variant="outline"
                                                             className="text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                                             onClick={() => handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${item.docRequest.token}`, item.worker?.nome)}
                                                             title="Copiar mensagem com link formatado"
                                                         >
                                                             <Copy className="h-3.5 w-3.5 mr-1" />
                                                             Link
                                                         </Button>
                                                     ) : (
                                                         <Button
                                                             size="sm"
                                                             variant="outline"
                                                             className="text-slate-600 hover:text-indigo-600"
                                                             onClick={async () => {
                                                                  try {
                                                                      const empId = taskMetadata?.empresaId || selectedEmpresaId!;
                                                                      const res = await createDocumentRequest(empId, item.worker.id, taskMetadata?.clientId);
                                                                      setTaskWorkers(prev => prev.map(w => w.worker?.id === item.worker.id ? { ...w, docRequest: res } : w));
                                                                      loadDocRequests();
                                                                      handleCopyInviteLink(`${window.location.origin}/enviar-documentos/${res.token}`, item.worker?.nome);
                                                                  } catch (err) {
                                                                      toast.error("Erro ao criar link cadastral.");
                                                                  }
                                                              }}
                                                             title="Criar e copiar mensagem com link"
                                                         >
                                                             <Plus className="h-3.5 w-3.5 mr-1" />
                                                             Criar Link
                                                         </Button>
                                                     )}

                                                    {/* Gerar Contrato Button */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
                                                        onClick={() => {
                                                            setSelectedWorkerId(item.worker.id);
                                                            if (taskMetadata?.empresaId) setSelectedEmpresaId(taskMetadata.empresaId);
                                                            if (taskMetadata?.clientId) setRequestClientId(taskMetadata.clientId);
                                                            setWorkersDialogOpen(false);
                                                            setGenerateDialogOpen(true);
                                                        }}
                                                        title="Emitir contrato de trabalho"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                        <Button variant="outline" onClick={() => setWorkersDialogOpen(false)}>Fechar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
