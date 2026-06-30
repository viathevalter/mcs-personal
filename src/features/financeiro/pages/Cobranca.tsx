import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, Phone, Mail, Clock, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, Scale, Users } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { fetchEnrichedData, updateContaReceber, saveObservacao } from '../data/loader';
import type { EnrichedTitulo, ContasReceber } from '../types';
import { ReceberCobroModal } from '../components/ReceberCobroModal';
import { ObservacoesModal } from '../components/ObservacoesModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const Cobranca = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState<EnrichedTitulo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
    const [filterBanco, setFilterBanco] = useState<string>('all');
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'atraso' | 'alerta' | 'judicial'>('atraso');

    // Modals
    const [isReceberOpen, setIsReceberOpen] = useState(false);
    const [isObsOpen, setIsObsOpen] = useState(false);
    const [selectedTitulo, setSelectedTitulo] = useState<EnrichedTitulo | null>(null);

    // Email Modal
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState<'friendly' | 'overdue' | 'legal'>('friendly');
    const [emailDestinatario, setEmailDestinatario] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [currentUser, setCurrentUser] = useState('Usuário Desconhecido');

    useEffect(() => {
        loadData();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setCurrentUser(session.user.email);
        }
    };

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

    // Templates definition
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
            // Save action in timelines table
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

    const handleSendToLegal = async (titulo: EnrichedTitulo) => {
        if (window.confirm(`Deseja encaminhar o título ${titulo.Num_doc} da ${titulo.Cliente} para o setor Jurídico?\nO status será alterado para Judicial.`)) {
            try {
                // Update status to Judicial
                const updateRes = await updateContaReceber(titulo.id, { Status: 'Judicial' });
                if (!updateRes.success) throw updateRes.error;

                // Log in timeline
                const obsToSave = {
                    conta_receber_id: titulo.id,
                    usuario: currentUser,
                    tipo: 'Encaminhamento Judicial',
                    descricao: `Título encaminhado para cobrança extrajudicial/judicial via assessoria de advocacia.`,
                    data: new Date().toISOString()
                };
                await saveObservacao(obsToSave);

                toast.success('Título enviado para o Jurídico!', {
                    description: `O status foi alterado para Judicial e o log foi adicionado ao histórico.`
                });
                loadData();
            } catch (err: any) {
                toast.error('Erro ao encaminhar para jurídico: ' + err.message);
            }
        }
    };

    // Helper functions
    const isOverdue = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago' || item.Status === 'Judicial') return false;
        return item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0));
    };

    const isDueSoon = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago' || item.Status === 'Judicial' || isOverdue(item)) return false;
        if (!item.Dt_venc) return false;
        const now = new Date();
        const next7Days = new Date();
        next7Days.setDate(now.getDate() + 7);
        const itemDate = new Date(item.Dt_venc);
        return itemDate >= new Date(now.setHours(0,0,0,0)) && itemDate <= next7Days;
    };

    // KPIs Calculations
    const kpis = {
        atrasoVal: data.filter(i => isOverdue(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        atrasoCount: data.filter(i => isOverdue(i)).length,

        alertaVal: data.filter(i => isDueSoon(i)).reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        alertaCount: data.filter(i => isDueSoon(i)).length,

        judicialVal: data.filter(i => i.Status === 'Judicial').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        judicialCount: data.filter(i => i.Status === 'Judicial').length,

        totalVal: data.filter(i => i.Status !== 'Pago').reduce((acc, item) => acc + (item.Valot_total || 0), 0),
        totalCount: data.filter(i => i.Status !== 'Pago').length,
    };

    // Extract unique lists
    const uniqueEmpresas = Array.from(new Set(data.map(i => i.Empresa).filter(Boolean)));
    const uniqueBancos = Array.from(new Set(data.map(i => i.Banco).filter(Boolean)));

    // Filters and tabs
    const filteredData = data.filter(item => {
        // Tab filter
        if (activeTab === 'atraso' && !isOverdue(item)) return false;
        if (activeTab === 'alerta' && !isDueSoon(item)) return false;
        if (activeTab === 'judicial' && item.Status !== 'Judicial') return false;

        // Search search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            (item.Cliente?.toLowerCase() || '').includes(searchLower) ||
            (item.Num_doc?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;

        // Empresa filter
        if (filterEmpresa !== 'all' && item.Empresa !== filterEmpresa) return false;

        // Banco filter
        if (filterBanco !== 'all' && item.Banco !== filterBanco) return false;

        return true;
    });

    const openReceber = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsReceberOpen(true);
    };

    const openObs = (titulo: EnrichedTitulo) => {
        setSelectedTitulo(titulo);
        setIsObsOpen(true);
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 space-y-6 w-full max-w-[1600px] mx-auto">
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ShieldAlert className="w-8 h-8 text-destructive" />
                            Gestão de Cobrança / Inadimplência
                        </h2>
                        <p className="text-muted-foreground mt-1">Monitore clientes inadimplentes, emita lembretes e encaminhe títulos para cobrança jurídica.</p>
                    </div>
                </div>

                {/* KPI Premium Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'atraso' ? 'border-l-destructive bg-destructive/5' : 'border-l-slate-400 bg-slate-50/50'}`}
                        onClick={() => setActiveTab('atraso')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-destructive uppercase tracking-wider">Em Atraso (Vencidos)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-destructive">{formatCurrency(kpis.atrasoVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.atrasoCount} {kpis.atrasoCount === 1 ? 'título em atraso' : 'títulos em atraso'}</p>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'alerta' ? 'border-l-amber-500 bg-amber-50/10' : 'border-l-slate-400 bg-slate-50/50'}`}
                        onClick={() => setActiveTab('alerta')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">A Vencer (Próximos 7 Dias)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-amber-500">{formatCurrency(kpis.alertaVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.alertaCount} {kpis.alertaCount === 1 ? 'título em alerta' : 'títulos em alerta'}</p>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`border-l-4 cursor-pointer transition-all hover:scale-[1.01] ${activeTab === 'judicial' ? 'border-l-red-800 bg-red-900/5' : 'border-l-slate-400 bg-slate-50/50'}`}
                        onClick={() => setActiveTab('judicial')}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Setor Judicial</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-red-800">{formatCurrency(kpis.judicialVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.judicialCount} {kpis.judicialCount === 1 ? 'processo' : 'processos ativos'}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-slate-600 bg-slate-100/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Sob Cobrança</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-800">{formatCurrency(kpis.totalVal)}</div>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.totalCount} {kpis.totalCount === 1 ? 'título pendente' : 'títulos pendentes'}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm mt-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente, documento..."
                                className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto animate-fade-in">
                            <Button 
                                variant={showFilters ? "default" : "outline"} 
                                onClick={() => setShowFilters(!showFilters)} 
                                className="flex items-center gap-2 w-full md:w-auto"
                            >
                                <Filter size={16} /> Filtros {showFilters ? 'Ativos' : ''}
                            </Button>
                            {(filterEmpresa !== 'all' || filterBanco !== 'all') && (
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        setFilterEmpresa('all');
                                        setFilterBanco('all');
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    Limpar Filtros
                                </Button>
                            )}
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-dashed">
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
                        </div>
                    )}
                </div>
            </div>

             {/* List Table Container */}
             <Card className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4 shadow-md">
                <CardHeader className="border-b py-3 px-4 bg-slate-50 dark:bg-slate-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-primary" />
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {activeTab === 'atraso' ? 'Lista de Devedores em Atraso' : activeTab === 'alerta' ? 'Alertas de Vencimentos Próximos' : 'Carteira Jurídico / Processos'}
                            </CardTitle>
                            <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                                {filteredData.length}
                            </span>
                        </div>

                        {/* Navigation Tabs buttons */}
                        <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-lg border max-w-fit text-xs font-semibold">
                            <button
                                onClick={() => setActiveTab('atraso')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'atraso' ? 'bg-white dark:bg-slate-800 text-destructive shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Em Atraso ({kpis.atrasoCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('alerta')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'alerta' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                A Vencer ({kpis.alertaCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('judicial')}
                                className={`px-4 py-1.5 rounded-md transition-all ${activeTab === 'judicial' ? 'bg-white dark:bg-slate-800 text-red-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Jurídico ({kpis.judicialCount})
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-380px)] flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente / Doc</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Banco</TableHead>
                                <TableHead>Mês Fat.</TableHead>
                                <TableHead>Emissão</TableHead>
                                <TableHead>Vencimento</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Situação</TableHead>
                                <TableHead className="text-right px-6">Ações de Cobrança</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                        Carregando dados de cobrança...
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground font-medium">
                                        Excelente! Nenhum título pendente nesta categoria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => {
                                    const delayDays = item.Dt_venc ? Math.floor((new Date().getTime() - new Date(item.Dt_venc).getTime()) / (1000 * 3600 * 24)) : 0;
                                    return (
                                        <TableRow key={item.id} className="group hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="font-semibold text-slate-800 dark:text-slate-100 max-w-[200px] truncate" title={item.Cliente || 'Sem Nome'}>
                                                    {item.Cliente || 'Sem Nome'}
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono">{item.Num_doc}</div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-semibold">{item.Empresa || '-'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-medium">{item.Banco || 'Não Definido'}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-medium">{item.periodo_fat || '-'}</TableCell>
                                            <TableCell>{formatDate(item.Data_emissao)}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{formatDate(item.Dt_venc)}</div>
                                                {activeTab === 'atraso' && delayDays > 0 && (
                                                    <span className="text-[10px] text-destructive font-bold uppercase tracking-wider block">
                                                        ({delayDays} {delayDays === 1 ? 'dia' : 'dias'} atraso)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold">{formatCurrency(item.Valot_total)}</TableCell>
                                            <TableCell className="text-right font-extrabold text-brand-primary">
                                                {formatCurrency(item.Saldo_a_pagar)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.Status === 'Pago' ? (
                                                     <Badge variant="default">Pago</Badge>
                                                 ) : isOverdue(item) ? (
                                                     <Badge variant="destructive">Vencido</Badge>
                                                 ) : (
                                                     <Badge variant="secondary" className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold">A vencer</Badge>
                                                 )}
                                            </TableCell>
                                            <TableCell className="text-center">
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
                                            <TableCell className="text-right px-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Cobrar Email */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        title="Cobrar via E-mail"
                                                        onClick={() => openEmailModal(item)}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 h-8 text-xs font-semibold"
                                                    >
                                                        <Mail size={14} className="mr-1" /> Cobrar
                                                    </Button>
                                                    
                                                    {/* Negociacoes Observacoes */}
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        title="Negociações / Histórico"
                                                        onClick={() => openObs(item)}
                                                        className="text-slate-600 hover:text-slate-700 hover:bg-slate-100 h-8 text-xs font-semibold"
                                                    >
                                                        <Clock size={14} className="mr-1" /> Histórico
                                                    </Button>

                                                    {/* Enviar ao Juridico */}
                                                    {item.Status !== 'Judicial' && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            title="Enviar ao Jurídico"
                                                            onClick={() => handleSendToLegal(item)}
                                                            className="text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200 h-8 text-xs font-semibold"
                                                        >
                                                            <Scale size={14} className="mr-1" /> Jurídico
                                                        </Button>
                                                    )}

                                                    {/* Marcar Pago */}
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Liquidar / Receber"
                                                        onClick={() => openReceber(item)}
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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
        </div>
    );
};
