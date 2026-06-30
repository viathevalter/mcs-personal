import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter, Edit2, Trash2, DollarSign, Clock, Mail } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
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
    const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
    const [filterBanco, setFilterBanco] = useState<string>('all');
    const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showFilters, setShowFilters] = useState<boolean>(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const result = await fetchEnrichedData();
            setData(result);
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

    const filteredData = data.filter(item => {
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

        // Smart Period filter
        if (filterPeriodo !== 'all') {
            const itemDate = item.Data_emissao ? new Date(item.Data_emissao) : null;
            if (!itemDate) return false;

            const now = new Date();
            if (filterPeriodo === 'this-month') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodo === 'next-30') {
                const start = new Date(now.setHours(0,0,0,0));
                const end = new Date();
                end.setDate(start.getDate() + 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodo === 'past-30') {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 30);
                if (itemDate < start || itemDate > end) return false;
            } else if (filterPeriodo === 'custom') {
                if (startDate && new Date(itemDate) < new Date(startDate)) return false;
                if (endDate && new Date(itemDate) > new Date(endDate)) return false;
            }
        }

        return true;
    });

    const getOverdueStatus = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago') return false;
        return item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0));
    };

    const kpis = {
        total: filteredData.reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        totalCount: filteredData.length,
        
        pago: filteredData.filter(i => i.Status === 'Pago').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        pagoCount: filteredData.filter(i => i.Status === 'Pago').length,
        
        vencido: filteredData.filter(i => i.Status === 'Vencido' || getOverdueStatus(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        vencidoCount: filteredData.filter(i => i.Status === 'Vencido' || getOverdueStatus(i)).length,
        
        a_vencer: filteredData.filter(i => (i.Status === 'A vencer' || i.Status === 'a_vencer' || i.Status === 'Parcial') && !getOverdueStatus(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        a_vencerCount: filteredData.filter(i => (i.Status === 'A vencer' || i.Status === 'a_vencer' || i.Status === 'Parcial') && !getOverdueStatus(i)).length,
    };

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
        <div className="h-full flex flex-col p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Cobros / Recebimentos</h2>
                        <p className="text-muted-foreground mt-1">Gerencie as contas a receber da empresa.</p>
                    </div>
                    <Button onClick={openNewForm} className="flex items-center gap-2 shadow-sm">
                        <Plus size={18} /> Novo Cobro
                    </Button>
                </div>

                {/* KPIs Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Card className="border-l-4 border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Geral</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(kpis.total)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.totalCount} {kpis.totalCount === 1 ? 'título' : 'títulos'}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(kpis.pago)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.pagoCount} {kpis.pagoCount === 1 ? 'título pago' : 'títulos pagos'}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-destructive bg-destructive/5 dark:bg-destructive/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-destructive uppercase tracking-wider">Total Vencido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-destructive">{formatCurrency(kpis.vencido)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.vencidoCount} {kpis.vencidoCount === 1 ? 'título vencido' : 'títulos vencidos'}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total A Vencer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(kpis.a_vencer)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.a_vencerCount} {kpis.a_vencerCount === 1 ? 'título a vencer' : 'títulos a vencer'}</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm mt-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative flex-1 w-full md:max-w-md">
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
                            <Button 
                                variant={showFilters ? "default" : "outline"} 
                                onClick={() => setShowFilters(!showFilters)} 
                                className="flex items-center gap-2 w-full md:w-auto"
                            >
                                <Filter size={16} /> Filtros {showFilters ? 'Ativos' : ''}
                            </Button>
                            {(filterEmpresa !== 'all' || filterBanco !== 'all' || filterPeriodo !== 'all') && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setFilterEmpresa('all');
                                        setFilterBanco('all');
                                        setFilterPeriodo('all');
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Limpar
                                </Button>
                            )}
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-dashed">
                            {/* Empresa Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por Empresa</label>
                                <select
                                    value={filterEmpresa}
                                    onChange={(e) => setFilterEmpresa(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                >
                                    <option value="all">Todas as Empresas</option>
                                    {uniqueEmpresas.map(emp => (
                                        <option key={emp} value={emp}>{emp}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Banco Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por Banco</label>
                                <select
                                    value={filterBanco}
                                    onChange={(e) => setFilterBanco(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                >
                                    <option value="all">Todos os Bancos</option>
                                    {uniqueBancos.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Period Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Período de Emissão</label>
                                <select
                                    value={filterPeriodo}
                                    onChange={(e) => setFilterPeriodo(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                >
                                    <option value="all">Todo o Período</option>
                                    <option value="this-month">Este Mês</option>
                                    <option value="next-30">Próximos 30 Dias</option>
                                    <option value="past-30">Últimos 30 Dias</option>
                                    <option value="custom">Personalizado...</option>
                                </select>
                            </div>

                            {/* Custom Date Inputs */}
                            {filterPeriodo === 'custom' && (
                                <div className="sm:col-span-3 grid grid-cols-2 gap-4 pt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-dashed">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground">De</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-background border rounded-lg text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-muted-foreground">Até</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-background border rounded-lg text-xs"
                                        />
                                    </div>
                                </div>
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
