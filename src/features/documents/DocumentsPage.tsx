import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useRole } from '@/app/providers/RoleProvider';
import { supabase } from '@/shared/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    ShieldCheck, AlertCircle, CheckCircle2, Clock, Plus, Search, Building2, User,
    Mail, MessageSquare, Calendar, ChevronRight, Loader2, UploadCloud, X, RefreshCw,
    FileText, Check, ExternalLink, Eye, Edit2, ShieldAlert
} from 'lucide-react';

interface ComplianceConfig {
    id: string;
    client_id: string;
    client_site_id: string | null;
    uses_platform: boolean;
    platform_name: string | null;
    required_doc_types: string[];
    client?: { legal_name: string; trade_name: string | null };
    site?: { name: string };
}

interface WorkerComplianceStatus {
    id: string;
    worker_id: string;
    client_id: string;
    client_site_id: string;
    is_apto: boolean;
    overall_status: 'pending' | 'submitted' | 'partially_approved' | 'approved' | 'rejected';
    notes: string | null;
    last_checked_at: string;
    worker?: { id: string; nome: string; cod_colab: string; email: string | null; movil: string | null };
    client?: { legal_name: string; trade_name: string | null };
    site?: { name: string };
}

interface ComplianceDocument {
    id: string;
    compliance_status_id: string;
    doc_type: string;
    worker_document_id: string | null;
    status: 'missing' | 'uploaded' | 'pending_validation' | 'approved' | 'rejected';
    expiry_date: string | null;
    validation_notes: string | null;
    file_path?: string;
    file_name?: string;
}

const ALL_DOC_TYPES = [
    { value: 'a1', label: 'Certificado A1' },
    { value: 'apto_medico', label: 'Apto Médico' },
    { value: 'prl_certificate', label: 'Certificado PRL' },
    { value: 'epi_recibo', label: 'Recibo de EPIs' },
    { value: 'formacao_seguranca', label: 'Formação de Posto / Segurança' },
    { value: 'contrato_trabalho', label: 'Contrato de Trabalho' },
    { value: 'niss', label: 'NISS' },
    { value: 'nif', label: 'NIF' }
];

export function DocumentsPage() {
    const { selectedEmpresaId } = useEmpresa();
    const { role: globalRole } = useRole();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'configs' | 'alerts'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // States
    const [configs, setConfigs] = useState<ComplianceConfig[]>([]);
    const [statuses, setStatuses] = useState<WorkerComplianceStatus[]>([]);
    const [alertsList, setAlertsList] = useState<any[]>([]);

    // Clients & Sites for dropdowns
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [sitesList, setSitesList] = useState<any[]>([]);
    const [workersList, setWorkersList] = useState<any[]>([]);

    // Config Dialog State
    const [configDialogOpen, setConfigDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ComplianceConfig | null>(null);
    const [configForm, setConfigForm] = useState({
        client_id: '',
        client_site_id: '',
        uses_platform: false,
        platform_name: '',
        required_doc_types: [] as string[]
    });

    // Detail / Validation Dialog State
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<WorkerComplianceStatus | null>(null);
    const [statusDocs, setStatusDocs] = useState<ComplianceDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [selectedFileDoc, setSelectedFileDoc] = useState<{ docType: string; file: File | null }>({ docType: '', file: null });
    const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

    // Filtered lists
    const filteredStatuses = useMemo(() => {
        return statuses.filter(s => {
            const workerName = s.worker?.nome.toLowerCase() || '';
            const clientName = s.client?.trade_name?.toLowerCase() || s.client?.legal_name?.toLowerCase() || '';
            const query = searchQuery.toLowerCase();
            return workerName.includes(query) || clientName.includes(query);
        });
    }, [statuses, searchQuery]);

    // Fetch lists
    const fetchClients = async () => {
        if (!selectedEmpresaId) return;
        const { data } = await supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').eq('empresa_id', selectedEmpresaId).eq('status', 'active');
        setClientsList(data || []);
    };

    const fetchSites = async (clientId: string) => {
        if (!selectedEmpresaId || !clientId) {
            setSitesList([]);
            return;
        }
        const { data } = await supabase.schema('core_common').from('client_sites').select('id, name').eq('client_id', clientId).eq('status', 'active');
        setSitesList(data || []);
    };

    const fetchWorkers = async () => {
        if (!selectedEmpresaId) return;
        const { data } = await supabase.schema('core_personal').from('workers').select('id, nome, cod_colab').eq('empresa_id', selectedEmpresaId).eq('status', 'active');
        setWorkersList(data || []);
    };

    const fetchConfigs = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .schema('core_personal')
                .from('client_compliance_configs')
                .select('*')
                .eq('empresa_id', selectedEmpresaId);

            if (error) throw error;

            // Fetch relations manually
            const configsWithRelations = await Promise.all((data || []).map(async (cfg: any) => {
                const { data: clientData } = await supabase.schema('core_common').from('clients').select('legal_name, trade_name').eq('id', cfg.client_id).maybeSingle();
                const { data: siteData } = cfg.client_site_id ? await supabase.schema('core_common').from('client_sites').select('name').eq('id', cfg.client_site_id).maybeSingle() : { data: null };
                return {
                    ...cfg,
                    client: clientData,
                    site: siteData
                };
            }));

            setConfigs(configsWithRelations);
        } catch (err) {
            console.error('Error fetching configs:', err);
            toast.error('Erro ao carregar configurações de requisitos.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatuses = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_compliance_status')
                .select('*')
                .eq('empresa_id', selectedEmpresaId);

            if (error) throw error;

            // Fetch relations
            const statusesWithRelations = await Promise.all((data || []).map(async (st: any) => {
                const { data: workerData } = await supabase.schema('core_personal').from('workers').select('id, nome, cod_colab, email, movil').eq('id', st.worker_id).maybeSingle();
                const { data: clientData } = await supabase.schema('core_common').from('clients').select('legal_name, trade_name').eq('id', st.client_id).maybeSingle();
                const { data: siteData } = await supabase.schema('core_common').from('client_sites').select('name').eq('id', st.client_site_id).maybeSingle();
                return {
                    ...st,
                    worker: workerData,
                    client: clientData,
                    site: siteData
                };
            }));

            setStatuses(statusesWithRelations);
        } catch (err) {
            console.error('Error fetching compliance statuses:', err);
            toast.error('Erro ao carregar cockpits de conformidade.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        if (!selectedEmpresaId) return;
        try {
            setLoading(true);
            // Fetch all compliance documents
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_compliance_documents')
                .select('*')
                .eq('empresa_id', selectedEmpresaId);

            if (error) throw error;

            // Filter for expired or expiring within 30 days
            const today = new Date();
            const warningLimit = new Date();
            warningLimit.setDate(today.getDate() + 30);

            const filteredAlerts = await Promise.all((data || [])
                .filter((doc: any) => doc.expiry_date && new Date(doc.expiry_date) <= warningLimit)
                .map(async (doc: any) => {
                    const { data: statusData } = await supabase.schema('core_personal').from('worker_compliance_status').select('worker_id, client_id, client_site_id').eq('id', doc.compliance_status_id).maybeSingle();
                    if (!statusData) return null;

                    const { data: workerData } = await supabase.schema('core_personal').from('workers').select('nome, email, movil').eq('id', statusData.worker_id).maybeSingle();
                    const { data: clientData } = await supabase.schema('core_common').from('clients').select('trade_name, legal_name').eq('id', statusData.client_id).maybeSingle();
                    const { data: siteData } = await supabase.schema('core_common').from('client_sites').select('name').eq('id', statusData.client_site_id).maybeSingle();

                    const expiryDateObj = new Date(doc.expiry_date);
                    const isExpired = expiryDateObj < today;
                    const diffDays = Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    return {
                        ...doc,
                        worker: workerData,
                        client: clientData,
                        site: siteData,
                        isExpired,
                        daysToExpiry: diffDays
                    };
                })
            );

            setAlertsList(filteredAlerts.filter(Boolean));
        } catch (err) {
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedEmpresaId) {
            fetchClients();
            fetchWorkers();
            if (activeTab === 'dashboard') fetchStatuses();
            if (activeTab === 'configs') fetchConfigs();
            if (activeTab === 'alerts') fetchAlerts();
        }
    }, [selectedEmpresaId, activeTab]);

    // Handle Config Save
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmpresaId || !configForm.client_id) {
            toast.error('Preencha os campos obrigatórios.');
            return;
        }

        try {
            const payload = {
                empresa_id: selectedEmpresaId,
                client_id: configForm.client_id,
                client_site_id: configForm.client_site_id || null,
                uses_platform: configForm.uses_platform,
                platform_name: configForm.uses_platform ? configForm.platform_name : null,
                required_doc_types: configForm.required_doc_types
            };

            if (editingConfig) {
                const { error } = await supabase
                    .schema('core_personal')
                    .from('client_compliance_configs')
                    .update(payload)
                    .eq('id', editingConfig.id);
                if (error) throw error;
                toast.success('Configuração de conformidade atualizada!');
            } else {
                const { error } = await supabase
                    .schema('core_personal')
                    .from('client_compliance_configs')
                    .insert(payload);
                if (error) throw error;
                toast.success('Configuração de conformidade criada!');
            }

            setConfigDialogOpen(false);
            fetchConfigs();
        } catch (err) {
            console.error('Error saving config:', err);
            toast.error('Erro ao salvar as configurações.');
        }
    };

    // Load Documents for Worker Validation
    const loadComplianceDocs = async (status: WorkerComplianceStatus) => {
        try {
            setLoadingDocs(true);
            const { data, error } = await supabase
                .schema('core_personal')
                .from('worker_compliance_documents')
                .select('*')
                .eq('compliance_status_id', status.id);

            if (error) throw error;

            // Fetch file URLs from worker_documents table if linked
            const docsWithFiles = await Promise.all((data || []).map(async (doc: any) => {
                if (doc.worker_document_id) {
                    const { data: fileData } = await supabase
                        .schema('core_personal')
                        .from('worker_documents')
                        .select('file_path, file_name')
                        .eq('id', doc.worker_document_id)
                        .maybeSingle();
                    if (fileData) {
                        return {
                            ...doc,
                            file_path: fileData.file_path,
                            file_name: fileData.file_name
                        };
                    }
                }
                return doc;
            }));

            setStatusDocs(docsWithFiles);
        } catch (err) {
            console.error('Error fetching status docs:', err);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleOpenDetail = (st: WorkerComplianceStatus) => {
        setSelectedStatus(st);
        loadComplianceDocs(st);
        setDetailDialogOpen(true);
    };

    // File Upload within Compliance Drawer
    const handleDocUpload = async (docType: string, file: File) => {
        if (!selectedEmpresaId || !selectedStatus) return;

        try {
            setUploadingDocType(docType);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${selectedEmpresaId}/${selectedStatus.worker_id}/${docType}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('mcs-personal-docs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Insert into worker_documents
            const { data: dbDoc, error: dbError } = await supabase
                .schema('core_personal')
                .from('worker_documents')
                .insert({
                    empresa_id: selectedEmpresaId,
                    worker_id: selectedStatus.worker_id,
                    doc_type: docType,
                    file_path: filePath,
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type
                })
                .select('*')
                .single();

            if (dbError) throw dbError;

            // 3. Update/Link in worker_compliance_documents
            const { error: compErr } = await supabase
                .schema('core_personal')
                .from('worker_compliance_documents')
                .update({
                    worker_document_id: dbDoc.id,
                    status: 'uploaded',
                    updated_at: new Date().toISOString()
                })
                .eq('compliance_status_id', selectedStatus.id)
                .eq('doc_type', docType);

            if (compErr) throw compErr;

            toast.success('Documento enviado com sucesso!');
            loadComplianceDocs(selectedStatus);
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Erro ao fazer upload do documento.');
        } finally {
            setUploadingDocType(null);
        }
    };

    const handleViewFile = async (path: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('mcs-personal-docs')
                .createSignedUrl(path, 3600);
            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err) {
            toast.error('Erro ao gerar link para o documento.');
        }
    };

    const handleUpdateDocStatus = async (docId: string, status: string, notes: string, expiry: string | null) => {
        try {
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_compliance_documents')
                .update({
                    status,
                    validation_notes: notes,
                    expiry_date: expiry || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', docId);

            if (error) throw error;
            toast.success('Status do documento atualizado!');
            if (selectedStatus) loadComplianceDocs(selectedStatus);
        } catch (err) {
            toast.error('Falha ao atualizar validação.');
        }
    };

    const handleToggleApto = async (statusId: string, currentApto: boolean) => {
        try {
            const { error } = await supabase
                .schema('core_personal')
                .from('worker_compliance_status')
                .update({
                    is_apto: !currentApto,
                    overall_status: !currentApto ? 'approved' : 'pending',
                    last_checked_at: new Date().toISOString()
                })
                .eq('id', statusId);

            if (error) throw error;
            toast.success(`Trabalhador marcado como ${!currentApto ? 'Apto' : 'Não Apto'}!`);
            fetchStatuses();
            if (selectedStatus) {
                setSelectedStatus(prev => prev ? { ...prev, is_apto: !currentApto, overall_status: !currentApto ? 'approved' : 'pending' } : null);
            }
        } catch (err) {
            toast.error('Erro ao alterar aptidão.');
        }
    };

    // Notification Sender (WhatsApp / Email mailto)
    const handleSendNotification = (alertItem: any, channel: 'email' | 'whatsapp') => {
        const workerName = alertItem.worker?.nome || 'Trabalhador';
        const docLabel = ALL_DOC_TYPES.find(d => d.value === alertItem.doc_type)?.label || alertItem.doc_type;
        const clientName = alertItem.client?.trade_name || alertItem.client?.legal_name || 'Cliente';
        const siteName = alertItem.site?.name || 'Obra';

        const subject = `MCS Conformidade - Atualização Pendente: ${docLabel}`;
        const bodyText = `Hola *${workerName}*,

Te contactamos desde el Departamento de Conformidad de MCS.
Tu documento *${docLabel}* requerido para acceder a la obra *${siteName}* de *${clientName}* se encuentra vencido o próximo a expirar.

Necesitamos que nos envíes tu documento actualizado a la brevedad para evitar bloqueos de acceso a la plataforma.

Si tienes dudas, ponte en contacto con nosotros.

Saludos cordiales,
Equipo de Conformidad y CAE.`;

        if (channel === 'email') {
            const email = alertItem.worker?.email || '';
            const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
            window.open(mailtoUrl, '_blank');
            toast.success(`Cliente de e-mail aberto para ${workerName}!`);
        } else {
            const phone = alertItem.worker?.movil || '';
            const cleanPhone = phone.replace(/\D/g, '');
            const msg = window.encodeURIComponent(bodyText);
            const whatsappUrl = cleanPhone 
                ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`
                : `https://api.whatsapp.com/send?text=${msg}`;
            window.open(whatsappUrl, '_blank');
            toast.success(`Mensagem enviada via WhatsApp para ${workerName}!`);
        }
    };

    // Quick KPIs
    const kpis = useMemo(() => {
        const total = statuses.length;
        const aptos = statuses.filter(s => s.is_apto).length;
        const naoAptos = total - aptos;
        const pendentes = statuses.filter(s => s.overall_status === 'pending').length;
        return { total, aptos, naoAptos, pendentes };
    }, [statuses]);

    return (
        <Layout>
            <div className="flex flex-col space-y-6 p-4 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <ShieldCheck className="h-8 w-8 text-indigo-500" />
                            Painel de Conformidade & CAE
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Monitore a validação documental em plataformas clientes (Nalanda, Obralia) e assegure a aptidão dos trabalhadores nas obras.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {activeTab === 'configs' && (
                            <Button 
                                onClick={() => {
                                    setEditingConfig(null);
                                    setConfigForm({ client_id: '', client_site_id: '', uses_platform: false, platform_name: '', required_doc_types: [] });
                                    setConfigDialogOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                            >
                                <Plus className="h-4 w-4" />
                                Configurar Requisitos
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                if (activeTab === 'dashboard') fetchStatuses();
                                if (activeTab === 'configs') fetchConfigs();
                                if (activeTab === 'alerts') fetchAlerts();
                            }}
                            className="text-slate-600 dark:text-slate-300"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* KPIs */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-slate-400">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Total de Vínculos</p>
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.total}</h3>
                                </div>
                                <Building2 className="h-8 w-8 text-slate-400" />
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-emerald-500">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Trabalhadores Aptos</p>
                                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{kpis.aptos}</h3>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-rose-500">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Não Aptos / Pendentes</p>
                                    <h3 className="text-2xl font-bold text-rose-600 mt-1">{kpis.naoAptos}</h3>
                                </div>
                                <AlertCircle className="h-8 w-8 text-rose-500" />
                            </CardContent>
                        </Card>
                        <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-amber-500">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Aguardando Envio</p>
                                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{kpis.pendentes}</h3>
                                </div>
                                <Clock className="h-8 w-8 text-amber-500" />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                    <TabsList className="grid w-full md:w-[600px] grid-cols-3 bg-slate-100 dark:bg-slate-800">
                        <TabsTrigger value="dashboard">Conformidade Geral</TabsTrigger>
                        <TabsTrigger value="configs">Plataformas & Requisitos</TabsTrigger>
                        <TabsTrigger value="alerts">Alertas de Vencimento</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Compliance Dashboard */}
                    <TabsContent value="dashboard" className="pt-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Buscar trabalhador ou cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    <span>Carregando informações de conformidade...</span>
                                </div>
                            ) : filteredStatuses.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <User className="h-10 w-10 text-slate-400" />
                                    <span>Nenhum trabalhador com status de conformidade registrado.</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                            <TableHead>Trabalhador</TableHead>
                                            <TableHead>Cliente / Obra</TableHead>
                                            <TableHead>Plataforma CAE</TableHead>
                                            <TableHead>Status Geral</TableHead>
                                            <TableHead>Aptidão (Acesso)</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStatuses.map((st) => (
                                            <TableRow key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <TableCell>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{st.worker?.nome}</div>
                                                    <div className="text-xs text-muted-foreground">{st.worker?.cod_colab || 'Sem Cód.'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">{st.client?.trade_name || st.client?.legal_name}</div>
                                                    <div className="text-xs text-muted-foreground">{st.site?.name || 'Geral'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-semibold">
                                                        {st.overall_status === 'pending' ? 'E-mail / Direto' : 'Nalanda'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={
                                                        st.overall_status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                        st.overall_status === 'rejected' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-rose-500/20' :
                                                        st.overall_status === 'submitted' ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10 border-indigo-500/20' :
                                                        'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20'
                                                    }>
                                                        {st.overall_status === 'approved' ? 'Aprovado' :
                                                         st.overall_status === 'rejected' ? 'Rejeitado' :
                                                         st.overall_status === 'submitted' ? 'Enviado Validação' : 'Documentação Pendente'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`h-2.5 w-2.5 rounded-full ${st.is_apto ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                        <span className="text-xs font-semibold">{st.is_apto ? 'Apto Obra' : 'Acesso Bloqueado'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost" className="gap-1 text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-slate-800" onClick={() => handleOpenDetail(st)}>
                                                        Verificar Docs
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab 2: Client Configs */}
                    <TabsContent value="configs" className="pt-4">
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    <span>Carregando configurações...</span>
                                </div>
                            ) : configs.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <Building2 className="h-10 w-10 text-slate-400" />
                                    <span>Nenhuma configuração de conformidade de cliente registrada.</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Obra (Site)</TableHead>
                                            <TableHead>Usa Plataforma</TableHead>
                                            <TableHead>Nome Plataforma</TableHead>
                                            <TableHead>Documentos Exigidos</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {configs.map((cfg) => (
                                            <TableRow key={cfg.id}>
                                                <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {cfg.client?.trade_name || cfg.client?.legal_name}
                                                </TableCell>
                                                <TableCell>{cfg.site?.name || 'Todas as Obras (Geral)'}</TableCell>
                                                <TableCell>{cfg.uses_platform ? 'Sim' : 'Não (E-mail)'}</TableCell>
                                                <TableCell>{cfg.platform_name || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {cfg.required_doc_types.map(dt => {
                                                            const label = ALL_DOC_TYPES.find(d => d.value === dt)?.label || dt;
                                                            return <Badge key={dt} variant="outline" className="text-[10px]">{label}</Badge>;
                                                        })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => {
                                                            setEditingConfig(cfg);
                                                            setConfigForm({
                                                                client_id: cfg.client_id,
                                                                client_site_id: cfg.client_site_id || '',
                                                                uses_platform: cfg.uses_platform,
                                                                platform_name: cfg.platform_name || '',
                                                                required_doc_types: cfg.required_doc_types
                                                            });
                                                            fetchSites(cfg.client_id);
                                                            setConfigDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab 3: Expiration Alerts */}
                    <TabsContent value="alerts" className="pt-4">
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                    <span>Carregando alertas de vencimento...</span>
                                </div>
                            ) : alertsList.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                    <ShieldCheck className="h-10 w-10 text-slate-400" />
                                    <span>Nenhum documento vencido ou a vencer nos próximos 30 dias.</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                            <TableHead>Trabalhador</TableHead>
                                            <TableHead>Documento</TableHead>
                                            <TableHead>Cliente / Obra</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Gravidade</TableHead>
                                            <TableHead className="text-right">Notificar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {alertsList.map((alert) => {
                                            const label = ALL_DOC_TYPES.find(d => d.value === alert.doc_type)?.label || alert.doc_type;
                                            return (
                                                <TableRow key={alert.id}>
                                                    <TableCell className="font-semibold">{alert.worker?.nome}</TableCell>
                                                    <TableCell className="font-medium text-slate-800 dark:text-slate-300">{label}</TableCell>
                                                    <TableCell>
                                                        <div className="text-xs font-semibold">{alert.client?.trade_name || alert.client?.legal_name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{alert.site?.name}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-semibold">{new Date(alert.expiry_date).toLocaleDateString('pt-PT')}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {alert.isExpired ? 'Vencido há' : 'Vence em'} {Math.abs(alert.daysToExpiry)} dias
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={alert.isExpired ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/10'}>
                                                            {alert.isExpired ? 'Crítico (Vencido)' : 'Aviso (Expirando)'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 hover:text-emerald-500 border-emerald-500/30" onClick={() => handleSendNotification(alert, 'whatsapp')}>
                                                            <MessageSquare className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-8 w-8 text-indigo-600 hover:text-indigo-500 border-indigo-500/30" onClick={() => handleSendNotification(alert, 'email')}>
                                                            <Mail className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Dialog 1: Configuration Editor */}
                <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                    <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <DialogHeader>
                            <DialogTitle>{editingConfig ? 'Editar Requisitos de Cliente' : 'Configurar Novos Requisitos de Cliente'}</DialogTitle>
                            <DialogDescription>
                                Associe um cliente/obra aos documentos e plataformas necessárias para sua validação.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label>Selecionar Cliente</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={configForm.client_id}
                                    onChange={(e) => {
                                        const cid = e.target.value;
                                        setConfigForm(prev => ({ ...prev, client_id: cid, client_site_id: '' }));
                                        fetchSites(cid);
                                    }}
                                    disabled={!!editingConfig}
                                >
                                    <option value="">Selecione o cliente...</option>
                                    {clientsList.map(c => (
                                        <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Selecionar Obra (Site) - Opcional</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={configForm.client_site_id}
                                    onChange={(e) => setConfigForm(prev => ({ ...prev, client_site_id: e.target.value }))}
                                    disabled={!!editingConfig}
                                >
                                    <option value="">Todas as obras (Padrão do Cliente)</option>
                                    {sitesList.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2 pt-2 pb-2">
                                <input
                                    id="uses_platform"
                                    type="checkbox"
                                    checked={configForm.uses_platform}
                                    onChange={(e) => setConfigForm(prev => ({ ...prev, uses_platform: e.target.checked }))}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                />
                                <Label htmlFor="uses_platform" className="cursor-pointer">Este cliente valida via plataforma CAE (ex: Nalanda)?</Label>
                            </div>

                            {configForm.uses_platform && (
                                <div className="space-y-1.5">
                                    <Label>Nome da Plataforma</Label>
                                    <Input
                                        type="text"
                                        placeholder="Ex: Nalanda, Metacontratas, CTAIMA"
                                        value={configForm.platform_name}
                                        onChange={(e) => setConfigForm(prev => ({ ...prev, platform_name: e.target.value }))}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label>Documentos Exigidos (Selecione todos que aplicam)</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded p-2">
                                    {ALL_DOC_TYPES.map(type => {
                                        const isChecked = configForm.required_doc_types.includes(type.value);
                                        return (
                                            <div key={type.value} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`chk-${type.value}`}
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const updated = isChecked
                                                            ? configForm.required_doc_types.filter(v => v !== type.value)
                                                            : [...configForm.required_doc_types, type.value];
                                                        setConfigForm(prev => ({ ...prev, required_doc_types: updated }));
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                />
                                                <label htmlFor={`chk-${type.value}`} className="text-xs cursor-pointer select-none text-slate-700 dark:text-slate-300">{type.label}</label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">Salvar Configurações</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog 2: Worker Compliance Validation & Document Checklist */}
                <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                    <DialogContent className="max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[85vh]">
                        {selectedStatus && (
                            <>
                                <DialogHeader className="border-b pb-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                                <User className="h-5 w-5 text-indigo-500" />
                                                Validação: {selectedStatus.worker?.nome}
                                            </DialogTitle>
                                            <DialogDescription className="text-xs text-muted-foreground">
                                                Cliente: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStatus.client?.trade_name || selectedStatus.client?.legal_name}</span> | Obra: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStatus.site?.name}</span>
                                            </DialogDescription>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-muted-foreground">Acesso Obra:</span>
                                            <Button 
                                                size="sm" 
                                                variant={selectedStatus.is_apto ? 'default' : 'destructive'}
                                                onClick={() => handleToggleApto(selectedStatus.id, selectedStatus.is_apto)}
                                                className="font-semibold text-xs"
                                            >
                                                {selectedStatus.is_apto ? 'Apto (Acesso Liberado)' : 'Bloqueado (Não Apto)'}
                                            </Button>
                                        </div>
                                    </div>
                                </DialogHeader>

                                {/* Checklist */}
                                <div className="space-y-4 pt-4">
                                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Checklist de Documentos de Conformidade</h4>
                                    
                                    {loadingDocs ? (
                                        <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                                    ) : statusDocs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-6">Nenhum documento de conformidade configurado para esta obra.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {statusDocs.map((doc) => {
                                                const label = ALL_DOC_TYPES.find(d => d.value === doc.doc_type)?.label || doc.doc_type;
                                                return (
                                                    <div key={doc.id} className="border border-slate-100 dark:border-slate-800/80 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label}</span>
                                                                <Badge className={
                                                                    doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20' :
                                                                    doc.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 border-rose-500/20' :
                                                                    doc.status === 'uploaded' || doc.status === 'pending_validation' ? 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/10' :
                                                                    'bg-slate-500/10 text-slate-500'
                                                                }>
                                                                    {doc.status === 'approved' ? 'Aprovado' :
                                                                     doc.status === 'rejected' ? 'Rejeitado' :
                                                                     doc.status === 'uploaded' || doc.status === 'pending_validation' ? 'Pendente Validação' : 'Em falta'}
                                                                </Badge>
                                                            </div>

                                                            {/* File Link */}
                                                            {doc.worker_document_id && doc.file_path ? (
                                                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold cursor-pointer hover:underline pt-1" onClick={() => handleViewFile(doc.file_path!)}>
                                                                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{doc.file_name}</span>
                                                                    <Eye className="h-3 w-3 text-slate-400" />
                                                                </div>
                                                            ) : (
                                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                                                                    <X className="h-3 w-3 text-rose-500" /> Nenhum arquivo associado
                                                                </div>
                                                            )}

                                                            {doc.expiry_date && (
                                                                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                                                                    <Calendar className="h-3.5 w-3.5" />
                                                                    Vencimento: <span className="font-semibold text-slate-600 dark:text-slate-400">{new Date(doc.expiry_date).toLocaleDateString('pt-PT')}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions & Validator Forms */}
                                                        <div className="flex flex-col gap-2 min-w-[200px] shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-xs">Validade</Label>
                                                                <input
                                                                    type="date"
                                                                    defaultValue={doc.expiry_date || ''}
                                                                    onChange={(e) => doc.expiry_date = e.target.value}
                                                                    className="h-8 w-full text-xs rounded border border-input px-2 bg-background"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Label className="text-xs">Observação</Label>
                                                                <input
                                                                    type="text"
                                                                    defaultValue={doc.validation_notes || ''}
                                                                    onChange={(e) => doc.validation_notes = e.target.value}
                                                                    placeholder="Notas de validação..."
                                                                    className="h-8 w-full text-xs rounded border border-input px-2 bg-background"
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-1.5 pt-1">
                                                                {/* Upload direct */}
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        id={`upload-file-${doc.id}`}
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            if (e.target.files && e.target.files.length > 0) {
                                                                                handleDocUpload(doc.doc_type, e.target.files[0]);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Button 
                                                                        size="icon" 
                                                                        variant="outline" 
                                                                        className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                                                                        disabled={uploadingDocType === doc.doc_type}
                                                                        onClick={() => document.getElementById(`upload-file-${doc.id}`)?.click()}
                                                                    >
                                                                        {uploadingDocType === doc.doc_type ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                                    </Button>
                                                                </div>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-7 px-2 text-rose-600 border-rose-500/30 hover:bg-rose-500/10 font-semibold text-xs"
                                                                    onClick={() => handleUpdateDocStatus(doc.id, 'rejected', doc.validation_notes || '', doc.expiry_date)}
                                                                >
                                                                    Rejeitar
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                                                                    onClick={() => handleUpdateDocStatus(doc.id, 'approved', doc.validation_notes || '', doc.expiry_date)}
                                                                >
                                                                    Aprovar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-4 border-t gap-2">
                                    <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Fechar</Button>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
