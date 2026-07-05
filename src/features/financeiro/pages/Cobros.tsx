import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, Edit2, Trash2, DollarSign, Clock, Mail, RefreshCw, X } from 'lucide-react';
import { formatCurrency, formatDate, formatCompactCurrency } from '../lib/utils';
import { fetchEnrichedData, createContaReceber, updateContaReceber, deleteContaReceber, saveObservacao } from '../data/loader';
import type { EnrichedTitulo, ContasReceber } from '../types';
import { CobroFormSheet } from '../components/CobroFormSheet';
import { ReceberCobroModal } from '../components/ReceberCobroModal';
import { ObservacoesModal } from '../components/ObservacoesModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CobroDetalhesSheet } from '../components/CobroDetalhesSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export const Cobros = () => {
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('cobros_searchTerm') || '');
    const [data, setData] = useState<EnrichedTitulo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCobro, setEditingCobro] = useState<ContasReceber | null>(null);

    const [isReceberOpen, setIsReceberOpen] = useState(false);
    const [isObsOpen, setIsObsOpen] = useState(false);
    const [selectedTitulo, setSelectedTitulo] = useState<EnrichedTitulo | null>(null);

    // Zoom Detail Sheet State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedDetailTitulo, setSelectedDetailTitulo] = useState<EnrichedTitulo | null>(null);

    // Email Modal states
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState<'friendly' | 'overdue' | 'legal'>('friendly');
    const [emailDestinatario, setEmailDestinatario] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [currentUser, setCurrentUser] = useState('Usuário Desconhecido');

    // Advanced Filtering States
    const [filterEmpresa, setFilterEmpresa] = useState(() => localStorage.getItem('cobros_filterEmpresa') || 'all');
    const [filterBanco, setFilterBanco] = useState(() => localStorage.getItem('cobros_filterBanco') || 'all');
    const [filterPeriodoFat, setFilterPeriodoFat] = useState(() => localStorage.getItem('cobros_filterPeriodoFat') || 'all');
    const [filterPeriodoEmissao, setFilterPeriodoEmissao] = useState(() => localStorage.getItem('cobros_filterPeriodoEmissao') || 'all');
    const [startDateEmissao, setStartDateEmissao] = useState(() => localStorage.getItem('cobros_startDateEmissao') || '');
    const [endDateEmissao, setEndDateEmissao] = useState(() => localStorage.getItem('cobros_endDateEmissao') || '');
    const [filterPeriodoVencimento, setFilterPeriodoVencimento] = useState(() => localStorage.getItem('cobros_filterPeriodoVencimento') || 'all');
    const [startDateVencimento, setStartDateVencimento] = useState(() => localStorage.getItem('cobros_startDateVencimento') || '');
    const [endDateVencimento, setEndDateVencimento] = useState(() => localStorage.getItem('cobros_endDateVencimento') || '');
    const [filterPeriodoAlteracao, setFilterPeriodoAlteracao] = useState(() => localStorage.getItem('cobros_filterPeriodoAlteracao') || 'all');
    const [startDateAlteracao, setStartDateAlteracao] = useState(() => localStorage.getItem('cobros_startDateAlteracao') || '');
    const [endDateAlteracao, setEndDateAlteracao] = useState(() => localStorage.getItem('cobros_endDateAlteracao') || '');

    // Temporary/Draft states for Popover Form
    const [tempFilterEmpresa, setTempFilterEmpresa] = useState(filterEmpresa);
    const [tempFilterBanco, setTempFilterBanco] = useState(filterBanco);
    const [tempFilterPeriodoFat, setTempFilterPeriodoFat] = useState(filterPeriodoFat);
    const [tempFilterPeriodoEmissao, setTempFilterPeriodoEmissao] = useState(filterPeriodoEmissao);
    const [tempStartDateEmissao, setTempStartDateEmissao] = useState(startDateEmissao);
    const [tempEndDateEmissao, setTempEndDateEmissao] = useState(endDateEmissao);
    const [tempFilterPeriodoVencimento, setTempFilterPeriodoVencimento] = useState(filterPeriodoVencimento);
    const [tempStartDateVencimento, setTempStartDateVencimento] = useState(startDateVencimento);
    const [tempEndDateVencimento, setTempEndDateVencimento] = useState(endDateVencimento);
    const [tempFilterPeriodoAlteracao, setTempFilterPeriodoAlteracao] = useState(filterPeriodoAlteracao);
    const [tempStartDateAlteracao, setTempStartDateAlteracao] = useState(startDateAlteracao);
    const [tempEndDateAlteracao, setTempEndDateAlteracao] = useState(endDateAlteracao);

    const [showFilters, setShowFilters] = useState(false);
    const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'pago' | 'vencido' | 'a_vencer'>(() => (localStorage.getItem('cobros_activeKpiFilter') as any) || 'all');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncSharePoint = async () => {
        setIsSyncing(true);
        const toastId = toast.loading('Iniciando sincronização com o SharePoint...');
        try {
            const { data: resData, error: invokeErr } = await supabase.functions.invoke('sync-contas-receber');
            
            if (invokeErr) {
                throw new Error(invokeErr.message);
            }
            
            if (resData && resData.success) {
                toast.success('Sincronização concluída!', {
                    id: toastId,
                    description: `${resData.synced_records} títulos de contas a receber foram atualizados com o SharePoint.`
                });
                await loadData();
            } else {
                throw new Error(resData?.error || 'Erro desconhecido na sincronização.');
            }
        } catch (err: any) {
            console.error('Sync failed:', err);
            toast.error('Erro na Sincronização: ' + err.message, { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [result, obsResult] = await Promise.all([
                fetchEnrichedData(),
                supabase.from('cobranca_observacoes').select('conta_receber_id, data')
            ]);
            
            // Map last observation date to each title
            const obsMap = new Map<string, string>();
            if (obsResult.data) {
                obsResult.data.forEach((o: any) => {
                    const existing = obsMap.get(o.conta_receber_id);
                    if (!existing || new Date(o.data) > new Date(existing)) {
                        obsMap.set(o.conta_receber_id, o.data);
                      }
                });
            }

            const enrichedWithObs = result.map(item => ({
                ...item,
                lastObsDate: obsMap.get(item.id) ? new Date(obsMap.get(item.id)!) : null
            }));

            setData(enrichedWithObs);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setCurrentUser(session.user.email);
        }
    };

    useEffect(() => {
        loadData();
        fetchUser();
    }, []);

    // Save states to localStorage
    useEffect(() => {
        localStorage.setItem('cobros_searchTerm', searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        localStorage.setItem('cobros_filterEmpresa', filterEmpresa);
    }, [filterEmpresa]);

    useEffect(() => {
        localStorage.setItem('cobros_filterBanco', filterBanco);
    }, [filterBanco]);

    useEffect(() => {
        localStorage.setItem('cobros_filterPeriodoFat', filterPeriodoFat);
    }, [filterPeriodoFat]);

    useEffect(() => {
        localStorage.setItem('cobros_filterPeriodoEmissao', filterPeriodoEmissao);
    }, [filterPeriodoEmissao]);

    useEffect(() => {
        localStorage.setItem('cobros_startDateEmissao', startDateEmissao);
    }, [startDateEmissao]);

    useEffect(() => {
        localStorage.setItem('cobros_endDateEmissao', endDateEmissao);
    }, [endDateEmissao]);

    useEffect(() => {
        localStorage.setItem('cobros_filterPeriodoVencimento', filterPeriodoVencimento);
    }, [filterPeriodoVencimento]);

    useEffect(() => {
        localStorage.setItem('cobros_startDateVencimento', startDateVencimento);
    }, [startDateVencimento]);

    useEffect(() => {
        localStorage.setItem('cobros_endDateVencimento', endDateVencimento);
    }, [endDateVencimento]);

    useEffect(() => {
        localStorage.setItem('cobros_activeKpiFilter', activeKpiFilter);
    }, [activeKpiFilter]);

    useEffect(() => {
        localStorage.setItem('cobros_filterPeriodoAlteracao', filterPeriodoAlteracao);
    }, [filterPeriodoAlteracao]);

    useEffect(() => {
        localStorage.setItem('cobros_startDateAlteracao', startDateAlteracao);
    }, [startDateAlteracao]);

    useEffect(() => {
        localStorage.setItem('cobros_endDateAlteracao', endDateAlteracao);
    }, [endDateAlteracao]);

    // Sync temp states with active states when popover opens
    useEffect(() => {
        if (showFilters) {
            setTempFilterEmpresa(filterEmpresa);
            setTempFilterBanco(filterBanco);
            setTempFilterPeriodoFat(filterPeriodoFat);
            setTempFilterPeriodoEmissao(filterPeriodoEmissao);
            setTempStartDateEmissao(startDateEmissao);
            setTempEndDateEmissao(endDateEmissao);
            setTempFilterPeriodoVencimento(filterPeriodoVencimento);
            setTempStartDateVencimento(startDateVencimento);
            setTempEndDateVencimento(endDateVencimento);
            setTempFilterPeriodoAlteracao(filterPeriodoAlteracao);
            setTempStartDateAlteracao(startDateAlteracao);
            setTempEndDateAlteracao(endDateAlteracao);
        }
    }, [showFilters]);

    const handleTemplateChange = (template: 'friendly' | 'overdue' | 'legal', title: EnrichedTitulo) => {
        setEmailTemplate(template);
        const clientName = title.Cliente || 'Cliente';
        const docNum = title.Num_doc || 'Fatura';
        const docValue = formatCurrency(title.Valot_total);
        const vencDate = title.Dt_venc ? new Date(title.Dt_venc).toLocaleDateString('pt-PT') : 'N/A';

        if (template === 'friendly') {
            setEmailSubject(`Lembrete de Vencimento: Documento ${docNum}`);
            setEmailBody(
                `Olá, equipe do departamento financeiro da ${clientName}.\n\n` +
                `Gostaríamos de lembrar amigavelmente que o título ${docNum} no valor de ${docValue} vencerá em ${vencDate}.\n\n` +
                `Por favor, confirme se o pagamento está agendado e envie o comprovativo assim que possível.\n\n` +
                `Agradecemos a parceria,\nDepartamento Financeiro`
            );
        } else if (template === 'overdue') {
            setEmailSubject(`Aviso de Cobrança - Título em Atraso: ${docNum}`);
            setEmailBody(
                `Prezados,\n\n` +
                `Constatamos em nosso sistema que o título ${docNum} no valor de ${docValue}, vencido em ${vencDate}, ainda não foi liquidado.\n\n` +
                `Solicitamos a gentileza de verificar a pendência financeira e efetuar o pagamento. Caso já tenha realizado o depósito, por favor ignore este e-mail e nos envie o comprovativo.\n\n` +
                `Atenciosamente,\nDepartamento de Cobrança`
            );
        } else if (template === 'legal') {
            setEmailSubject(`NOTIFICAÇÃO EXTRAJUDICIAL - Cobrança Urgente: Título ${docNum}`);
            setEmailBody(
                `Prezada Direção da ${clientName},\n\n` +
                `Apesar de nossas tentativas anteriores de negociação, o título ${docNum} no valor de ${docValue} (vencido desde ${vencDate}) permanece em aberto.\n\n` +
                `Esta notificação serve como aviso formal de que, caso a liquidação do valor não ocorra no prazo de 48 horas, seremos obrigados a encaminhar esta pendência ao nosso Departamento Jurídico para as devidas cobranças judiciais.\n\n` +
                `Evite maiores encargos e processos legais entrando em contato imediatamente.\n\n` +
                `Atenciosamente,\nDiretoria Financeira`
            );
        }
    };

    const openEmailModal = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setEmailDestinatario(titulo.clienteInfo?.EmailCobros || titulo.clienteInfo?.EmailCobros || '');
        handleTemplateChange('friendly', titulo);
        setIsEmailOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedTitulo) return;
        setIsSendingEmail(true);
        try {
            const obsToSave = {
                conta_receber_id: selectedTitulo.id,
                usuario: currentUser,
                tipo: 'E-mail de Cobrança',
                descricao: `Enviado e-mail de cobrança (${emailTemplate === 'friendly' ? 'Lembrete Amigável' : emailTemplate === 'overdue' ? 'Aviso de Atraso' : 'Notificação Pré-Jurídica'}) para ${emailDestinatario || 'cliente'}. Assunto: "${emailSubject}"`,
                data: new Date().toISOString()
            };

            await saveObservacao(obsToSave);
            toast.success('E-mail de cobrança enviado com sucesso!', {
                description: `O log do envio foi registrado na linha do tempo do cobro.`
            });
            setIsEmailOpen(false);
            loadData();
        } catch (err: any) {
            toast.error('Erro ao registrar envio de e-mail: ' + err.message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleSave = async (formData: Partial<ContasReceber>) => {
        if (editingCobro) {
            await updateContaReceber(editingCobro.id, formData);
        } else {
            await createContaReceber(formData);
        }
        await loadData();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este recebimento?")) {
            await deleteContaReceber(id);
            await loadData();
        }
    };

    const openNewForm = () => {
        setEditingCobro(null);
        setIsFormOpen(true);
    };

    const openEditForm = (cobro: ContasReceber) => {
        setEditingCobro(cobro);
        setIsFormOpen(true);
    };

    const openReceber = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsReceberOpen(true);
    };

    const openObs = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsObsOpen(true);
    };

    const openZoom = (item: EnrichedTitulo) => {
        setSelectedDetailTitulo(item);
        setIsDetailOpen(true);
    };

    const uniqueEmpresas = Array.from(new Set(data.map(i => i.Empresa).filter(Boolean)));
    const uniqueBancos = Array.from(new Set(data.map(i => i.Banco).filter(Boolean)));
    const uniquePeriodosFat = Array.from(new Set(data.map(i => i.periodo_fat).filter(Boolean))).sort();

    const kpiData = data.filter(item => {
        // Search filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (item.Cliente?.toLowerCase() || '').includes(searchLower) ||
            (item.Num_doc?.toLowerCase() || '').includes(searchLower) ||
            (item.Obra?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;

        // Empresa filter
        if (filterEmpresa !== 'all' && item.Empresa !== filterEmpresa) return false;

        // Banco filter
        if (filterBanco !== 'all' && item.Banco !== filterBanco) return false;

        // Periodo Fat filter
        if (filterPeriodoFat !== 'all' && item.periodo_fat !== filterPeriodoFat) return false;

        // Periodo Emissao filter
        if (filterPeriodoEmissao !== 'all') {
            const itemDate = item.Data_emissao ? new Date(item.Data_emissao) : null;
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoEmissao === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoEmissao === 'past-30') {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoEmissao === 'custom') {
                if (startDateEmissao && new Date(itemDate) < new Date(startDateEmissao)) return false;
                if (endDateEmissao && new Date(itemDate) > new Date(endDateEmissao)) return false;
            }
        }

        // Periodo Vencimento filter
        if (filterPeriodoVencimento !== 'all') {
            const itemDate = item.Dt_venc ? new Date(item.Dt_venc) : null;
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoVencimento === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoVencimento === 'next-30') {
                const start = new Date(now.setHours(0,0,0,0));
                const end = new Date();
                end.setDate(start.getDate() + 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoVencimento === 'custom') {
                if (startDateVencimento && new Date(itemDate) < new Date(startDateVencimento)) return false;
                if (endDateVencimento && new Date(itemDate) > new Date(endDateVencimento)) return false;
            }
        }

        // Periodo Alteracao filter
        if (filterPeriodoAlteracao !== 'all') {
            const itemDate = getAlteracaoDate(item);
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodoAlteracao === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoAlteracao === 'past-30') {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodoAlteracao === 'custom') {
                if (startDateAlteracao && new Date(itemDate) < new Date(startDateAlteracao)) return false;
                if (endDateAlteracao && new Date(itemDate) > new Date(endDateAlteracao)) return false;
            }
        }

        return true;
    });

    const getAlteracaoDate = (item: EnrichedTitulo): Date | null => {
        const dates: Date[] = [];
        if (item.Modificado) dates.push(new Date(item.Modificado));
        if (item.Creado) dates.push(new Date(item.Creado));
        if (item.lastObsDate) dates.push(new Date(item.lastObsDate));
        if (item.pagamentos_reais && item.pagamentos_reais.length > 0) {
            item.pagamentos_reais.forEach((p: any) => {
                if (p.data_recebimento) {
                    dates.push(new Date(p.data_recebimento));
                }
            });
        }
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates.map(d => d.getTime())));
    };

    const getOverdueStatus = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago') return false;
        return item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0));
    };

    const getUniqueClientsCount = (items: EnrichedTitulo[]) => {
        const clients = items.map(i => i.Cliente || i.Cliente_id).filter(Boolean);
        return new Set(clients).size;
    };

    const kpis = {
        total: kpiData.reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        totalCount: kpiData.length,
        totalClientes: getUniqueClientsCount(kpiData),
        
        pago: kpiData.filter(i => i.Status === 'Pago').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        pagoCount: kpiData.filter(i => i.Status === 'Pago').length,
        pagoClientes: getUniqueClientsCount(kpiData.filter(i => i.Status === 'Pago')),
        
        vencido: kpiData.filter(i => i.Status !== 'Pago' && getOverdueStatus(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        vencidoCount: kpiData.filter(i => i.Status !== 'Pago' && getOverdueStatus(i)).length,
        vencidoClientes: getUniqueClientsCount(kpiData.filter(i => i.Status !== 'Pago' && getOverdueStatus(i))),
        
        a_vencer: kpiData.filter(i => i.Status !== 'Pago' && !getOverdueStatus(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        a_vencerCount: kpiData.filter(i => i.Status !== 'Pago' && !getOverdueStatus(i)).length,
        a_vencerClientes: getUniqueClientsCount(kpiData.filter(i => i.Status !== 'Pago' && !getOverdueStatus(i))),
    };

    const filteredData = kpiData.filter(item => {
        if (activeKpiFilter === 'pago' && item.Status !== 'Pago') return false;
        if (activeKpiFilter === 'vencido' && !(item.Status !== 'Pago' && getOverdueStatus(item))) return false;
        if (activeKpiFilter === 'a_vencer' && !(item.Status !== 'Pago' && !getOverdueStatus(item))) return false;
        return true;
    });

    const activeFiltersCount = [
        filterEmpresa !== 'all',
        filterBanco !== 'all',
        filterPeriodoFat !== 'all',
        filterPeriodoEmissao !== 'all',
        filterPeriodoVencimento !== 'all',
        filterPeriodoAlteracao !== 'all'
    ].filter(Boolean).length;

    const getStatusVariant = (status: string, dtVenc?: Date | null): "default" | "secondary" | "destructive" | "outline" | "warning" => {
        if (status === 'Pago') return 'default';
        
        // If it's not paid, and the due date is in the past, it's overdue
        const isOverdue = dtVenc && new Date(dtVenc) < new Date(new Date().setHours(0,0,0,0));
        
        if (isOverdue) return 'destructive';

        switch (status) {
            case 'Vencido': return 'destructive';
            case 'A vencer':
            case 'a_vencer': return 'secondary';
            case 'Parcial': return 'warning';
            default: return 'outline';
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 pt-0 md:pt-0 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Cobros / Recebimentos</h2>
                        <p className="text-muted-foreground mt-1">Gerencie as contas a receber da empresa.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={handleSyncSharePoint} 
                            disabled={isSyncing} 
                            variant="outline" 
                            className="flex items-center gap-2 border-slate-300 dark:border-slate-800"
                        >
                            {isSyncing ? (
                                <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                            ) : (
                                <RefreshCw size={18} className="text-slate-500" />
                            )}
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar SharePoint'}
                        </Button>
                        <Button onClick={openNewForm} className="flex items-center gap-2 shadow-sm">
                            <Plus size={18} /> Novo Cobro
                        </Button>
                    </div>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${activeKpiFilter === 'all' ? 'border-l-slate-600 bg-slate-100/50 dark:bg-slate-800/40 ring-1 ring-slate-200/50' : 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30'}`}
                        onClick={() => setActiveKpiFilter('all')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-slate-650 dark:text-slate-400 uppercase tracking-wider">Total Geral</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(kpis.total)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {kpis.totalCount} {kpis.totalCount === 1 ? 'título' : 'títulos'} ({kpis.totalClientes} {kpis.totalClientes === 1 ? 'cliente' : 'clientes'})
                            </p>
                        </CardContent>
                    </Card>
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${activeKpiFilter === 'pago' ? 'border-l-emerald-600 bg-emerald-100/30 dark:bg-emerald-950/20 ring-1 ring-emerald-200/40' : 'border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'}`}
                        onClick={() => setActiveKpiFilter('pago')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.pago)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {kpis.pagoCount} {kpis.pagoCount === 1 ? 'título pago' : 'títulos pagos'} ({kpis.pagoClientes} {kpis.pagoClientes === 1 ? 'cliente' : 'clientes'})
                            </p>
                        </CardContent>
                    </Card>
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${activeKpiFilter === 'vencido' ? 'border-l-destructive bg-destructive/10 dark:bg-destructive/20 ring-1 ring-destructive/20' : 'border-l-destructive bg-destructive/5 dark:bg-destructive/10'}`}
                        onClick={() => setActiveKpiFilter('vencido')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Total Vencido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-destructive">{formatCurrency(kpis.vencido)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {kpis.vencidoCount} {kpis.vencidoCount === 1 ? 'título vencido' : 'títulos vencidos'} ({kpis.vencidoClientes} {kpis.vencidoClientes === 1 ? 'cliente' : 'clientes'})
                            </p>
                        </CardContent>
                    </Card>
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${activeKpiFilter === 'a_vencer' ? 'border-l-blue-600 bg-blue-100/30 dark:bg-blue-950/20 ring-1 ring-blue-200/40' : 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10'}`}
                        onClick={() => setActiveKpiFilter('a_vencer')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total A Vencer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(kpis.a_vencer)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {kpis.a_vencerCount} {kpis.a_vencerCount === 1 ? 'título a vencer' : 'títulos a vencer'} ({kpis.a_vencerClientes} {kpis.a_vencerClientes === 1 ? 'cliente' : 'clientes'})
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm mt-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative flex-1 w-full md:max-w-2xl">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar cobros por cliente, doc..."
                                className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative">
                                <Button 
                                    variant={activeFiltersCount > 0 ? "default" : "outline"} 
                                    onClick={() => setShowFilters(!showFilters)} 
                                    className="flex items-center gap-2 w-full md:w-auto"
                                >
                                    <Filter size={16} /> Filtros {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                                </Button>

                                {showFilters && (
                                    <div className="absolute right-0 top-full mt-2 z-50 w-[300px] sm:w-[600px] md:w-[680px] bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl p-5 space-y-4 text-left">
                                        <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Filtrar Lançamentos</h3>
                                            <button 
                                                onClick={() => setShowFilters(false)}
                                                className="text-muted-foreground hover:text-slate-850 dark:hover:text-slate-100"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[380px] overflow-y-auto pr-1">
                                            {/* Coluna 1 - Filtros Gerais */}
                                            <div className="space-y-3">
                                                {/* Empresa Filter */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Empresa</label>
                                                    <select
                                                        value={tempFilterEmpresa}
                                                        onChange={(e) => setTempFilterEmpresa(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todas as Empresas</option>
                                                        {uniqueEmpresas.map(emp => (
                                                            <option key={emp} value={emp}>{emp}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Banco Filter */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Banco</label>
                                                    <select
                                                        value={tempFilterBanco}
                                                        onChange={(e) => setTempFilterBanco(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todos os Bancos</option>
                                                        {uniqueBancos.map(b => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Mês de Faturamento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês de Faturamento</label>
                                                    <select
                                                        value={tempFilterPeriodoFat}
                                                        onChange={(e) => setTempFilterPeriodoFat(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todos os Meses</option>
                                                        {uniquePeriodosFat.map(pf => (
                                                            <option key={pf} value={pf}>{pf}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Coluna 2 - Períodos */}
                                            <div className="space-y-3 sm:border-l sm:pl-4 dark:border-slate-800">
                                                {/* Período de Emissão */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período de Emissão</label>
                                                    <select
                                                        value={tempFilterPeriodoEmissao}
                                                        onChange={(e) => setTempFilterPeriodoEmissao(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="past-30">Últimos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {/* Custom Emissao dates */}
                                                {tempFilterPeriodoEmissao === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateEmissao}
                                                                onChange={(e) => setTempStartDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateEmissao}
                                                                onChange={(e) => setTempEndDateEmissao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Vencimento */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período de Vencimento</label>
                                                    <select
                                                        value={tempFilterPeriodoVencimento}
                                                        onChange={(e) => setTempFilterPeriodoVencimento(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="next-30">Próximos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {/* Custom Vencimento dates */}
                                                {tempFilterPeriodoVencimento === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateVencimento}
                                                                onChange={(e) => setTempStartDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateVencimento}
                                                                onChange={(e) => setTempEndDateVencimento(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Período de Alteração */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período de Alteração</label>
                                                    <select
                                                        value={tempFilterPeriodoAlteracao}
                                                        onChange={(e) => setTempFilterPeriodoAlteracao(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-background border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="all">Todo o Período</option>
                                                        <option value="this-month">Este Mês</option>
                                                        <option value="past-30">Últimos 30 Dias</option>
                                                        <option value="custom">Personalizado...</option>
                                                    </select>
                                                </div>

                                                {/* Custom Alteracao dates */}
                                                {tempFilterPeriodoAlteracao === 'custom' && (
                                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-dashed dark:border-slate-800">
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">DE</label>
                                                            <input
                                                                type="date"
                                                                value={tempStartDateAlteracao}
                                                                onChange={(e) => setTempStartDateAlteracao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <label className="text-[9px] font-semibold text-muted-foreground">ATÉ</label>
                                                            <input
                                                                type="date"
                                                                value={tempEndDateAlteracao}
                                                                onChange={(e) => setTempEndDateAlteracao(e.target.value)}
                                                                className="w-full px-2 py-1 bg-background border rounded text-[11px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex justify-between items-center pt-3 border-t dark:border-slate-800">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    // Clear temporary
                                                    setTempFilterEmpresa('all');
                                                    setTempFilterBanco('all');
                                                    setTempFilterPeriodoFat('all');
                                                    setTempFilterPeriodoEmissao('all');
                                                    setTempStartDateEmissao('');
                                                    setTempEndDateEmissao('');
                                                    setTempFilterPeriodoVencimento('all');
                                                    setTempStartDateVencimento('');
                                                    setTempEndDateVencimento('');
                                                    setTempFilterPeriodoAlteracao('all');
                                                    setTempStartDateAlteracao('');
                                                    setTempEndDateAlteracao('');

                                                    // Clear active
                                                    setFilterEmpresa('all');
                                                    setFilterBanco('all');
                                                    setFilterPeriodoFat('all');
                                                    setFilterPeriodoEmissao('all');
                                                    setStartDateEmissao('');
                                                    setEndDateEmissao('');
                                                    setFilterPeriodoVencimento('all');
                                                    setStartDateVencimento('');
                                                    setEndDateVencimento('');
                                                    setFilterPeriodoAlteracao('all');
                                                    setStartDateAlteracao('');
                                                    setEndDateAlteracao('');

                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-semibold h-8"
                                            >
                                                Limpar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    // Apply filters
                                                    setFilterEmpresa(tempFilterEmpresa);
                                                    setFilterBanco(tempFilterBanco);
                                                    setFilterPeriodoFat(tempFilterPeriodoFat);
                                                    setFilterPeriodoEmissao(tempFilterPeriodoEmissao);
                                                    setStartDateEmissao(tempStartDateEmissao);
                                                    setEndDateEmissao(tempEndDateEmissao);
                                                    setFilterPeriodoVencimento(tempFilterPeriodoVencimento);
                                                    setStartDateVencimento(tempStartDateVencimento);
                                                    setEndDateVencimento(tempEndDateVencimento);
                                                    setFilterPeriodoAlteracao(tempFilterPeriodoAlteracao);
                                                    setStartDateAlteracao(tempStartDateAlteracao);
                                                    setEndDateAlteracao(tempEndDateAlteracao);

                                                    setShowFilters(false);
                                                }}
                                                className="text-[11px] font-bold h-8 text-white bg-primary hover:bg-primary/95"
                                            >
                                                Aplicar Filtros
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(filterEmpresa !== 'all' || filterBanco !== 'all' || filterPeriodoFat !== 'all' || filterPeriodoEmissao !== 'all' || filterPeriodoVencimento !== 'all' || filterPeriodoAlteracao !== 'all' || activeKpiFilter !== 'all' || searchTerm !== '') && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setFilterEmpresa('all');
                                        setFilterBanco('all');
                                        setFilterPeriodoFat('all');
                                        setFilterPeriodoEmissao('all');
                                        setStartDateEmissao('');
                                        setEndDateEmissao('');
                                        setFilterPeriodoVencimento('all');
                                        setStartDateVencimento('');
                                        setEndDateVencimento('');
                                        setFilterPeriodoAlteracao('all');
                                        setStartDateAlteracao('');
                                        setEndDateAlteracao('');
                                        setSearchTerm('');
                                        setActiveKpiFilter('all');
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>

                    {(activeKpiFilter !== 'all' || filterEmpresa !== 'all' || filterBanco !== 'all' || filterPeriodoFat !== 'all' || filterPeriodoEmissao !== 'all' || filterPeriodoVencimento !== 'all' || filterPeriodoAlteracao !== 'all') && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtros ativos:</span>
                            
                            {/* KPI Filter */}
                            {activeKpiFilter !== 'all' && (
                                <Badge 
                                    variant={
                                        activeKpiFilter === 'pago' ? 'default' : 
                                        activeKpiFilter === 'vencido' ? 'destructive' : 'secondary'
                                    }
                                    className={`flex items-center gap-1 font-bold shadow-sm py-0.5 pl-2 pr-1 ${
                                        activeKpiFilter === 'a_vencer' ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950/30 dark:text-blue-450' : ''
                                    }`}
                                >
                                    <span className="capitalize">{activeKpiFilter.replace('_', ' ')}</span>
                                    <button 
                                        onClick={() => setActiveKpiFilter('all')} 
                                        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Empresa Filter */}
                            {filterEmpresa !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Empresa: {filterEmpresa}</span>
                                    <button 
                                        onClick={() => setFilterEmpresa('all')} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Banco Filter */}
                            {filterBanco !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Banco: {filterBanco}</span>
                                    <button 
                                        onClick={() => setFilterBanco('all')} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Fat Filter */}
                            {filterPeriodoFat !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Fat: {filterPeriodoFat}</span>
                                    <button 
                                        onClick={() => setFilterPeriodoFat('all')} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Emissao Filter */}
                            {filterPeriodoEmissao !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Emissão: {filterPeriodoEmissao === 'custom' ? `${formatDate(startDateEmissao)} a ${formatDate(endDateEmissao)}` : filterPeriodoEmissao.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoEmissao('all');
                                            setStartDateEmissao('');
                                            setEndDateEmissao('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Vencimento Filter */}
                            {filterPeriodoVencimento !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Venc: {filterPeriodoVencimento === 'custom' ? `${formatDate(startDateVencimento)} a ${formatDate(endDateVencimento)}` : filterPeriodoVencimento.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoVencimento('all');
                                            setStartDateVencimento('');
                                            setEndDateVencimento('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}

                            {/* Periodo Alteracao Filter */}
                            {filterPeriodoAlteracao !== 'all' && (
                                <Badge variant="outline" className="flex items-center gap-1 font-bold py-0.5 pl-2 pr-1 border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-900/60 dark:text-slate-350 dark:border-slate-800">
                                    <span>Alteração: {filterPeriodoAlteracao === 'custom' ? `${formatDate(startDateAlteracao)} a ${formatDate(endDateAlteracao)}` : filterPeriodoAlteracao.replace('-', ' ')}</span>
                                    <button 
                                        onClick={() => {
                                            setFilterPeriodoAlteracao('all');
                                            setStartDateAlteracao('');
                                            setEndDateAlteracao('');
                                        }} 
                                        className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
                <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-360px)] flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-4 w-12">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </TableHead>
                                <TableHead>Cliente / Doc</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Mês Fat.</TableHead>
                                <TableHead>Emissão</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Situação</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        Carregando dados...
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.id} className="group cursor-pointer hover:bg-slate-50/50 transition-colors duration-150" onClick={() => openZoom(item)}>
                                        <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium max-w-[200px] truncate" title={item.Cliente || 'Sem Nome'}>{item.Cliente || 'Sem Nome'}</div>
                                            <div className="text-xs text-muted-foreground">{item.Num_doc}</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm font-medium">{item.Empresa || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{item.periodo_fat || '-'}</TableCell>
                                        <TableCell>{formatDate(item.Data_emissao)}</TableCell>
                                        <TableCell>{formatDate(item.Dt_venc)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.Valot_total)}</TableCell>
                                        <TableCell className="text-right font-bold text-brand-primary" onClick={(e) => e.stopPropagation()}>
                                            {item.pagamentos_reais && item.pagamentos_reais.length > 0 ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger className="cursor-help border-b border-dashed border-brand-primary/50">
                                                            {formatCurrency(item.Saldo_a_pagar)}
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-white border shadow-xl p-3 text-gray-800 text-sm max-w-[250px]">
                                                            <p className="font-semibold mb-2 text-brand-primary border-b pb-1">Histórico de Pagamentos:</p>
                                                            <div className="space-y-1">
                                                                {item.pagamentos_reais.map((p: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center gap-4 border-b border-gray-100 last:border-0 pb-1">
                                                                        <span className="text-gray-500 text-xs">{formatDate(p.data_recebimento)}</span>
                                                                        <span className="font-medium">€ {p.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                formatCurrency(item.Saldo_a_pagar)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            {item.Status === 'Pago' ? (
                                                <Badge variant="default">Pago</Badge>
                                            ) : getOverdueStatus(item) ? (
                                                <Badge variant="destructive">Vencido</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold">A vencer</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            {item.Status === 'Parcial' ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger className="cursor-help">
                                                            <Badge variant="warning" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">Parcial</Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-white dark:bg-slate-900 border shadow-xl p-3 text-slate-800 dark:text-slate-100 text-xs max-w-[250px]">
                                                            <p className="font-semibold text-brand-primary border-b pb-1 mb-1.5">Recebimento Parcial:</p>
                                                            <div className="space-y-1 font-medium">
                                                                <div className="flex justify-between"><span>Valor Total:</span><span>{formatCurrency(item.Valot_total)}</span></div>
                                                                <div className="flex justify-between text-green-600"><span>Valor Pago:</span><span>{formatCurrency(item.Valot_total - item.Saldo_a_pagar)}</span></div>
                                                                <div className="flex justify-between text-destructive"><span>Saldo Restante:</span><span>{formatCurrency(item.Saldo_a_pagar)}</span></div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : item.Status === 'Judicial' ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger className="cursor-help">
                                                            <Badge variant="outline" className="border-red-600 text-red-600 bg-red-50 hover:bg-red-100 font-bold dark:bg-red-950/20 dark:text-red-400 dark:border-red-500">Jurídico</Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-white dark:bg-slate-900 border shadow-xl p-3 text-slate-800 dark:text-slate-100 text-xs max-w-[250px]">
                                                            <p className="font-semibold text-red-600 border-b pb-1 mb-1.5">Cobrança Jurídica:</p>
                                                            <p className="font-medium">Este título foi encaminhado ao departamento jurídico para cobrança judicial.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" title="Receber" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openReceber(item)}>
                                                    <DollarSign size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Observações/Histórico" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openObs(item)}>
                                                    <Clock size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Editar" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEditForm(item)}>
                                                    <Edit2 size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Excluir" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CobroFormSheet
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                initialData={editingCobro}
            />

            {selectedTitulo && (
                <>
                    <ReceberCobroModal
                        titulo={selectedTitulo}
                        isOpen={isReceberOpen}
                        onClose={() => setIsReceberOpen(false)}
                        onSuccess={() => { loadData(); }}
                    />
                    <ObservacoesModal
                        titulo={selectedTitulo}
                        isOpen={isObsOpen}
                        onClose={() => setIsObsOpen(false)}
                    />
                </>
            )}

            {selectedDetailTitulo && (
                <CobroDetalhesSheet
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    titulo={selectedDetailTitulo}
                    onOpenEdit={openEditForm}
                    onOpenReceber={openReceber}
                    onOpenEmail={openEmailModal}
                    onRefresh={loadData}
                />
            )}

            {/* Email Template Modal Dialog */}
            <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
                <DialogContent className="sm:max-w-xl dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-blue-600">
                            <Mail className="w-5 h-5" />
                            Enviar E-mail de Cobrança
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Selecione um modelo de texto pré-pronto, valide o destinatário de faturamento e edite se necessário.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTitulo && (
                        <div className="space-y-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-350">
                            {/* Templates Selection Tabs */}
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                <button
                                    onClick={() => handleTemplateChange('friendly', selectedTitulo)}
                                    className={`flex-1 py-1.5 text-center rounded-md font-bold transition-all ${emailTemplate === 'friendly' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Lembrete Amigável
                                </button>
                                <button
                                    onClick={() => handleTemplateChange('overdue', selectedTitulo)}
                                    className={`flex-1 py-1.5 text-center rounded-md font-bold transition-all ${emailTemplate === 'overdue' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Aviso de Atraso
                                </button>
                                <button
                                    onClick={() => handleTemplateChange('legal', selectedTitulo)}
                                    className={`flex-1 py-1.5 text-center rounded-md font-bold transition-all ${emailTemplate === 'legal' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                >
                                    Notificação Pré-Jurídico
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="emailDestinatario" className="text-[10px] text-muted-foreground font-bold uppercase">Destinatário (E-mail de Cobros do Cliente)</Label>
                                    <Input
                                        id="emailDestinatario"
                                        type="email"
                                        value={emailDestinatario}
                                        onChange={e => setEmailDestinatario(e.target.value)}
                                        placeholder="financeiro@cliente.com"
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="emailSubject" className="text-[10px] text-muted-foreground font-bold uppercase">Assunto</Label>
                                    <Input
                                        id="emailSubject"
                                        type="text"
                                        value={emailSubject}
                                        onChange={e => setEmailSubject(e.target.value)}
                                        className="h-9 text-xs font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="emailBody" className="text-[10px] text-muted-foreground font-bold uppercase">Mensagem de Cobrança</Label>
                                    <textarea
                                        id="emailBody"
                                        rows={8}
                                        value={emailBody}
                                        onChange={e => setEmailBody(e.target.value)}
                                        className="w-full border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background resize-none font-sans"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t dark:border-slate-800 pt-3">
                        <Button variant="outline" onClick={() => setIsEmailOpen(false)} disabled={isSendingEmail}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSendEmail} 
                            disabled={isSendingEmail || !emailDestinatario}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSendingEmail ? 'Enviando...' : 'Enviar e Registrar no Histórico'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
