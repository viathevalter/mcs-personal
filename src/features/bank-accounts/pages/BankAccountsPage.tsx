import { useState } from 'react';
import { 
    Loader2, Search, Wallet, Download, Eye, EyeOff, FileText, 
    UploadCloud, UserCheck, AlertCircle, RefreshCw, Send, CheckCircle2, 
    XCircle, Clock, Link2, ChevronRight, HelpCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAllBankAccounts } from '../hooks/useAllBankAccounts';
import { useAllIbanRequests } from '../hooks/useIbanRequests';
import type { IbanChangeRequest } from '../api/ibanRequestsApi';

import { ImportBankAccountsDialog } from '../components/ImportBankAccountsDialog';
import { ExportBankAccountsDialog } from '../components/ExportBankAccountsDialog';
import { IbanDocumentUploadDialog } from '../components/IbanDocumentUploadDialog';
import { CreateIbanRequestDialog } from '../components/CreateIbanRequestDialog';
import { ReviewIbanRequestDialog } from '../components/ReviewIbanRequestDialog';
import type { IbanDocType } from '../api/ibanDocumentsApi';
import { Link } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BankAccountsPage() {
    const { selectedEmpresaId } = useEmpresa();

    const [activeTab, setActiveTab] = useState<string>('accounts');
    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilter, setClienteFilter] = useState<string>('all');
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');
    
    // Month/Year filter matching Hours Control
    const currentDate = new Date();
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    const [periodYear, setPeriodYear] = useState<number>(prevMonthDate.getFullYear());
    const [periodMonth, setPeriodMonth] = useState<number>(prevMonthDate.getMonth() + 1);
    const [onlyNovos, setOnlyNovos] = useState<boolean>(false);

    // Sort control for Table
    const [sortColumn, setSortColumn] = useState<'worker_nome' | 'worker_codigo' | 'banco' | 'iban' | 'data_ingresso'>('worker_nome');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [revealedIbans, setRevealedIbans] = useState<Set<string>>(new Set());
    
    // Dialog States
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadModalData, setUploadModalData] = useState<{workerId: string, workerName: string, docType: IbanDocType, currentUrl: string | null} | null>(null);

    const [createRequestData, setCreateRequestData] = useState<{ workerId: string; workerName: string; currentIban: string | null; currentBanco: string | null } | null>(null);
    const [createRequestOpen, setCreateRequestOpen] = useState(false);

    const [reviewRequestData, setReviewRequestData] = useState<IbanChangeRequest | null>(null);
    const [reviewRequestOpen, setReviewRequestOpen] = useState(false);

    // Fetch primary bank accounts and request history
    const { data: bankAccounts, isLoading: isLoadingAccounts } = useAllBankAccounts(selectedEmpresaId || undefined, periodMonth, periodYear);
    const { data: ibanRequests, isLoading: isLoadingRequests } = useAllIbanRequests(selectedEmpresaId || undefined);

    const isLoading = isLoadingAccounts || isLoadingRequests;

    const toggleIbanVisibility = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setRevealedIbans(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const maskIban = (iban: string | null | undefined) => {
        if (!iban) return '';
        const clean = iban.replace(/\s+/g, '');
        if (clean.length < 8) return iban;
        
        const start = clean.substring(0, 4);
        const end = clean.substring(clean.length - 4);
        return `${start} •••• •••• •••• ${end}`;
    };

    const anosDisponiveis = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
    const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
        return {
            value: i + 1,
            label: new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()
        };
    });

    const clientesUnicos = (Array.from(new Set(bankAccounts?.map(w => w.cliente_nome).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));
    const contratantesUnicos = (Array.from(new Set(bankAccounts?.map(w => w.contratante).filter(Boolean))) as string[])
        .sort((a, b) => a.localeCompare(b));

    const clienteOptions = [
        { value: 'all', label: 'Todos os clientes' },
        ...clientesUnicos.map(c => ({ value: c, label: c }))
    ];

    const contratanteOptions = [
        { value: 'all', label: 'Todas as empresas' },
        ...contratantesUnicos.map(c => ({ value: c, label: c }))
    ];

    const filteredAccounts = bankAccounts?.filter(acc => {
        const lowerSearch = searchTerm.toLowerCase();

        const matchesClient = clienteFilter === 'all' || acc.cliente_nome === clienteFilter;
        const matchesContratante = contratanteFilter === 'all' || acc.contratante === contratanteFilter;
        
        const matchesNovos = !onlyNovos || acc.is_new;

        const matchesSearch = !searchTerm || (
            acc.worker_nome?.toLowerCase().includes(lowerSearch) ||
            acc.worker_codigo?.toLowerCase().includes(lowerSearch) ||
            (acc.iban && acc.iban.toLowerCase().includes(lowerSearch))
        );

        return matchesClient && matchesContratante && matchesSearch && matchesNovos;
    }) || [];

    const sortedAccounts = [...filteredAccounts].sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const toggleSort = (column: typeof sortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // KPI Calculations
    const totalWorkers = sortedAccounts.length;
    const totalAtivos = bankAccounts?.filter(acc => acc.status_month === 'ATIVO').length || 0;
    const comIban = bankAccounts?.filter(acc => acc.status_month === 'ATIVO' && acc.iban).length || 0;
    const semIban = bankAccounts?.filter(acc => acc.status_month === 'ATIVO' && !acc.iban).length || 0;
    const compPendentes = bankAccounts?.filter(acc => acc.status_month === 'ATIVO' && acc.iban && !acc.certificado_url).length || 0;
    const trocasPendentes = ibanRequests?.filter(req => req.status === 'enviado').length || 0;

    const findActiveRequest = (workerId: string) => {
        return ibanRequests?.find(req => req.worker_id === workerId && req.status === 'enviado');
    };

    return (
        <div className="p-8 max-w-[1700px] mx-auto flex flex-col h-full bg-slate-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
                        <Wallet className="w-8 h-8 mr-3 text-indigo-600" />
                        Gestão de Contas Bancárias (IBAN)
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Controle financeiro, auditoria de titularidade e solicitações seguras de troca de IBAN.
                    </p>
                </div>

                <div className="flex gap-2.5">
                    <ImportBankAccountsDialog trigger={
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-0 h-10 font-medium px-4">
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Importar Planilhas
                        </Button>
                    } />
                    <ExportBankAccountsDialog 
                        bankAccounts={bankAccounts} 
                        isLoading={isLoading} 
                        trigger={
                            <Button variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 h-10 font-medium">
                                <Download className="w-4 h-4 mr-2 text-slate-500" />
                                Exportar SEPA / Excel
                            </Button>
                        } 
                    />
                </div>
            </div>

            {/* Premium KPIs Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {/* 1. Ativos */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ativos no Período</span>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{totalAtivos}</h3>
                        <span className="text-[10px] text-slate-400 block">Total de trabalhadores de RH</span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <UserCheck className="w-6 h-6" />
                    </div>
                </div>

                {/* 2. Com IBAN */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Com IBAN Cadastrado</span>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{comIban}</h3>
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center">
                            {totalAtivos > 0 ? ((comIban / totalAtivos) * 100).toFixed(0) : 0}% de conformidade
                        </span>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>

                {/* 3. Falta IBAN */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider block">Falta IBAN (Atenção)</span>
                        <h3 className="text-2xl font-bold text-rose-600 tracking-tight">{semIban}</h3>
                        <span className="text-[10px] text-rose-400 block">Bloqueados para pagamento</span>
                    </div>
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                </div>

                {/* 4. Comprovantes Pendentes */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider block">Comprovativo Pendente</span>
                        <h3 className="text-2xl font-bold text-amber-600 tracking-tight">{compPendentes}</h3>
                        <span className="text-[10px] text-amber-500/80 font-medium flex items-center">
                            Sem certificado de titularidade
                        </span>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>

                {/* 5. Solicitações de Troca */}
                <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group bg-indigo-50/10">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Solicitações de Troca</span>
                        <h3 className="text-2xl font-bold text-indigo-700 tracking-tight">{trocasPendentes}</h3>
                        <span className="text-[10px] text-indigo-500/80 block">Aguardando análise do RH</span>
                    </div>
                    <div className="w-12 h-12 bg-indigo-100/50 text-indigo-700 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <RefreshCw className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Tabs structure */}
            <Tabs defaultValue="accounts" className="w-full flex-1 flex flex-col" onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-6">
                    <TabsList className="bg-slate-100/80 border border-slate-200/50 p-1 rounded-xl h-11">
                        <TabsTrigger 
                            value="accounts" 
                            className="rounded-lg text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9 px-4"
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            Contas Correntes
                        </TabsTrigger>
                        <TabsTrigger 
                            value="requests" 
                            className="rounded-lg text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm h-9 px-4"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Solicitações de Troca
                            {trocasPendentes > 0 && (
                                <Badge className="ml-2 bg-indigo-600 text-white hover:bg-indigo-600 text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-bold">
                                    {trocasPendentes}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab content: Accounts */}
                <TabsContent value="accounts" className="flex-1 flex flex-col m-0">
                    {/* Filters Section */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 lg:items-end">
                        {/* Period Selectors */}
                        <div className="flex gap-3 w-full lg:w-auto">
                            <div className="space-y-2 w-full sm:w-40">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Período (Mês)</Label>
                                <Select value={periodMonth.toString()} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
                                    <SelectTrigger className="bg-slate-50/50 h-10 border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mesesDisponiveis.map(m => (
                                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 w-full sm:w-28">
                                <Label className="text-xs font-semibold text-slate-500 uppercase">Ano</Label>
                                <Select value={periodYear.toString()} onValueChange={(v) => setPeriodYear(parseInt(v))}>
                                    <SelectTrigger className="bg-slate-50/50 h-10 border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {anosDisponiveis.map(y => (
                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="w-px h-10 bg-slate-200 self-center hidden lg:block mx-1"></div>

                        <div className="space-y-2 w-full lg:w-56">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Cliente</Label>
                            <Combobox
                                className="bg-slate-50/50 w-full"
                                options={clienteOptions}
                                value={clienteFilter}
                                onChange={(v) => setClienteFilter(v || 'all')}
                                placeholder="Buscar cliente..."
                                emptyText="Nenhum cliente."
                            />
                        </div>

                        <div className="space-y-2 w-full lg:w-56">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Empresa</Label>
                            <Combobox
                                className="bg-slate-50/50 w-full"
                                options={contratanteOptions}
                                value={contratanteFilter}
                                onChange={(v) => setContratanteFilter(v || 'all')}
                                placeholder="Buscar empresa..."
                                emptyText="Nenhuma empresa."
                            />
                        </div>

                        <div className="space-y-2 flex-1 w-full min-w-[200px]">
                            <Label className="text-xs font-semibold text-slate-500 uppercase">Buscar Trabalhador</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nome, código ou IBAN..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-slate-50/50"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 h-10 px-2 lg:mb-0 mb-2">
                            <Button 
                                variant={onlyNovos ? "default" : "outline"} 
                                size="sm"
                                onClick={() => setOnlyNovos(!onlyNovos)}
                                className={onlyNovos ? "bg-amber-500 hover:bg-amber-600 border-0" : "border-slate-200 text-slate-700 bg-white"}
                            >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Novos do Mês
                            </Button>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="flex-1 bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col relative z-0">
                        <div className="flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[60px] font-semibold text-xs text-slate-500 uppercase">Nº</TableHead>
                                        <TableHead onClick={() => toggleSort('worker_codigo')} className="w-[80px] cursor-pointer font-semibold text-xs text-slate-500 uppercase hover:text-indigo-600 transition-colors whitespace-nowrap">ID {sortColumn === 'worker_codigo' && (sortDirection === 'asc' ? '↑' : '↓')}</TableHead>
                                        <TableHead onClick={() => toggleSort('worker_nome')} className="cursor-pointer font-semibold text-xs text-slate-500 uppercase hover:text-indigo-600 transition-colors whitespace-nowrap">
                                            TRABALHADOR {sortColumn === 'worker_nome' && (sortDirection === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center border-l whitespace-nowrap">STATUS</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center whitespace-nowrap">DATA ENTRADA</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase border-l whitespace-nowrap w-[230px]">IBAN</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase">BANCO</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center border-l border-r whitespace-nowrap">CERT. TITUL.</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center border-r">AUTORIZAÇÃO</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center w-[120px]">AÇÕES</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase border-l w-[120px]">EMPRESA</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                                    <span>Carregando dados financeiros mensais...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : sortedAccounts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
                                                    <span className="font-medium text-slate-600">Nenhum trabalhador encontrado.</span>
                                                    <span className="text-sm mt-1">Ninguém esteve ativo nesse mês ou os filtros de empresa/cliente estão rígidos.</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sortedAccounts.map((account, index) => {
                                            const isRevealed = revealedIbans.has(account.worker_id);
                                            const missingIban = !account.iban;
                                            
                                            // Check if has a pending exchange request
                                            const pendingRequest = findActiveRequest(account.worker_id);
                                            
                                            return (
                                                <TableRow key={account.worker_id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <TableCell className="text-xs text-slate-400 text-center font-medium pr-0">
                                                        {index + 1}
                                                    </TableCell>

                                                    <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap bg-slate-50/30">
                                                        <span className="bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm">{account.worker_codigo}</span>
                                                    </TableCell>
                                                    
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Link to={`/workers/${account.worker_id}`} className="font-semibold text-[13px] text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap truncate max-w-[200px]">
                                                                {account.worker_nome}
                                                            </Link>
                                                            {account.is_new && (
                                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-0 text-[9px] px-1.5 py-0">NOVO</Badge>
                                                            )}
                                                            {pendingRequest && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800 animate-pulse border border-indigo-200">
                                                                    TROCA PENDENTE
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    
                                                    <TableCell className="text-center border-l bg-slate-50/30">
                                                        <Badge variant="outline" className={`font-medium text-[10px] uppercase tracking-wider h-5 flex items-center justify-center mx-auto w-16 ${
                                                            account.status_month === 'ATIVO' 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {account.status_month}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-center text-[13px] text-slate-600 font-medium">
                                                        {formatDate(account.data_ingresso)}
                                                    </TableCell>
                                                    
                                                    <TableCell className="border-l bg-slate-50/50 group-hover:bg-indigo-50/10 transition-colors">
                                                        <div className="flex items-center justify-between">
                                                            {missingIban ? (
                                                                <span className="text-[13px] text-rose-500/80 italic font-medium flex items-center">
                                                                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Falta IBAN
                                                                </span>
                                                            ) : (
                                                                <span className={`font-mono text-[13px] tracking-tight ${isRevealed ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                                                    {isRevealed ? account.iban : maskIban(account.iban)}
                                                                </span>
                                                            )}
                                                            
                                                            {!missingIban && (
                                                                <button 
                                                                    onClick={(e) => toggleIbanVisibility(account.worker_id, e)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                                                                    title={isRevealed ? "Ocultar IBAN" : "Revelar IBAN"}
                                                                >
                                                                    {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    
                                                    <TableCell className="text-[13px] text-slate-700 font-semibold truncate max-w-[120px]">
                                                        {account.banco || '-'}
                                                    </TableCell>
                                                    
                                                    {/* CERTIFICADO TITULARIDADE */}
                                                    <TableCell className="text-center border-l bg-slate-50/30">
                                                        {account.certificado_url ? (
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-indigo-600 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-md shadow-sm" title="Ver Certificado"
                                                                onClick={() => {
                                                                    setUploadModalData({ workerId: account.worker_id, workerName: account.worker_nome, docType: 'certificado', currentUrl: account.certificado_url || null });
                                                                    setUploadModalOpen(true);
                                                                }}>
                                                                <FileText className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 border border-transparent rounded-md transition-all" title="Anexar Certificado"
                                                                onClick={() => {
                                                                    setUploadModalData({ workerId: account.worker_id, workerName: account.worker_nome, docType: 'certificado', currentUrl: null });
                                                                    setUploadModalOpen(true);
                                                                }}>
                                                                <UploadCloud className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    
                                                    {/* AUTORIZAÇÃO */}
                                                    <TableCell className="text-center border-r bg-slate-50/30">
                                                        {account.autorizacao_url ? (
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-md shadow-sm" title="Ver Autorização"
                                                                onClick={() => {
                                                                    setUploadModalData({ workerId: account.worker_id, workerName: account.worker_nome, docType: 'autorizacao', currentUrl: account.autorizacao_url || null });
                                                                    setUploadModalOpen(true);
                                                                }}>
                                                                <FileText className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 border border-transparent rounded-md transition-all" title="Anexar Autorização de Mudança"
                                                                onClick={() => {
                                                                    setUploadModalData({ workerId: account.worker_id, workerName: account.worker_nome, docType: 'autorizacao', currentUrl: null });
                                                                    setUploadModalOpen(true);
                                                                }}>
                                                                <UploadCloud className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    
                                                    {/* ACTIONS */}
                                                    <TableCell className="text-center">
                                                        {pendingRequest ? (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm border-0 flex items-center justify-center mx-auto"
                                                                onClick={() => {
                                                                    setReviewRequestData(pendingRequest);
                                                                    setReviewRequestOpen(true);
                                                                }}
                                                            >
                                                                Avaliar Troca
                                                            </Button>
                                                        ) : (
                                                            <Button 
                                                                variant="outline"
                                                                size="sm" 
                                                                className="h-7 px-2 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-indigo-600 flex items-center justify-center mx-auto"
                                                                onClick={() => {
                                                                    setCreateRequestData({
                                                                        workerId: account.worker_id,
                                                                        workerName: account.worker_nome,
                                                                        currentIban: account.iban,
                                                                        currentBanco: account.banco
                                                                    });
                                                                    setCreateRequestOpen(true);
                                                                }}
                                                            >
                                                                <Link2 className="w-3.5 h-3.5 mr-1" />
                                                                Trocar IBAN
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                    
                                                    <TableCell className="text-[12px] text-slate-600 font-semibold border-l truncate">
                                                        {account.contratante || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Footer summary */}
                        {!isLoading && (
                            <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-3 flex items-center justify-between text-xs text-slate-600 shadow-inner min-h-[48px]">
                                <div className="font-medium">
                                    <span className="inline-flex items-center justify-center bg-white border border-slate-200 text-slate-800 rounded px-2 py-0.5 mr-2 font-bold shadow-sm">{sortedAccounts.length}</span> 
                                    trabalhadores na lista filtrada
                                </div>
                                <div className="flex gap-5 font-medium">
                                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-400 shadow-sm mr-2 border border-amber-500 border-opacity-20"></span> Novos do mês: {sortedAccounts.filter(a => a.is_new).length}</span>
                                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-sm mr-2 border border-rose-600 border-opacity-20"></span> Sem IBAN: <span className="text-rose-600 ml-1 font-bold">{sortedAccounts.filter(a => !a.iban).length}</span></span>
                                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-sm mr-2 border border-emerald-600 border-opacity-20"></span> Comprovantes Pendentes: <span className="text-slate-800 ml-1 font-bold">{sortedAccounts.filter(a => a.iban && !a.certificado_url).length}</span></span>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Tab content: Exchange requests */}
                <TabsContent value="requests" className="flex-1 flex flex-col m-0">
                    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col relative z-0 flex-1">
                        <div className="flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[60px] font-semibold text-xs text-slate-500 uppercase text-center">Nº</TableHead>
                                        <TableHead className="w-[80px] font-semibold text-xs text-slate-500 uppercase">Código</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase">Trabalhador</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center w-[120px]">Status</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase">IBAN Proposto</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase">Banco Proposto</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center w-[120px]">Data Criação</TableHead>
                                        <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center w-[130px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingRequests ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                                                    <span>Carregando solicitações de troca...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : !ibanRequests || ibanRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-500">
                                                    <RefreshCw className="h-10 w-10 text-slate-300 mb-3" />
                                                    <span className="font-medium text-slate-600">Nenhuma solicitação de troca gerada.</span>
                                                    <span className="text-sm mt-1">Todas as alterações de IBAN serão registradas aqui para histórico.</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ibanRequests.map((req, index) => {
                                            const isPendingUpload = req.status === 'pendente_envio';
                                            const isSubmitted = req.status === 'enviado';
                                            const isApproved = req.status === 'aprovado';
                                            const isRejected = req.status === 'rejeitado';

                                            return (
                                                <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <TableCell className="text-xs text-slate-400 text-center font-medium">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-600">
                                                        {req.worker?.cod_colab || '-'}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-[13px] text-slate-900">
                                                        {req.worker?.nome || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={`font-semibold text-[10px] tracking-wide uppercase px-2 py-0.5 inline-flex items-center justify-center h-5 ${
                                                            isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            isSubmitted ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {isApproved && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                            {isRejected && <XCircle className="w-3 h-3 mr-1" />}
                                                            {isSubmitted && <Clock className="w-3 h-3 mr-1" />}
                                                            {isPendingUpload && <Send className="w-3 h-3 mr-1" />}
                                                            {req.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[13px] text-slate-700">
                                                        {req.new_iban ? maskIban(req.new_iban) : <span className="text-slate-400 italic text-xs">Aguardando envio</span>}
                                                    </TableCell>
                                                    <TableCell className="text-slate-700 font-medium text-xs">
                                                        {req.new_banco || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center text-[12px] text-slate-500 font-medium">
                                                        {formatDate(req.created_at)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isSubmitted && (
                                                            <Button 
                                                                size="sm" 
                                                                className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm border-0"
                                                                onClick={() => {
                                                                    setReviewRequestData(req);
                                                                    setReviewRequestOpen(true);
                                                                }}
                                                            >
                                                                Avaliar Troca
                                                            </Button>
                                                        )}
                                                        {isPendingUpload && (
                                                            <Button 
                                                                variant="outline"
                                                                size="sm" 
                                                                className="h-7 px-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 flex items-center justify-center mx-auto"
                                                                onClick={() => {
                                                                    setCreateRequestData({
                                                                        workerId: req.worker_id,
                                                                        workerName: req.worker?.nome || '',
                                                                        currentIban: req.old_iban,
                                                                        currentBanco: req.old_banco
                                                                    });
                                                                    // Simulates reopening to show copy link
                                                                    setTokenForReopen(req.token);
                                                                }}
                                                            >
                                                                <Link2 className="w-3.5 h-3.5 mr-1" />
                                                                Ver Link
                                                            </Button>
                                                        )}
                                                        {isApproved && (
                                                            <div className="flex gap-1.5 justify-center">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                                                                    onClick={async () => {
                                                                        if (req.termo_assinado_url || req.termo_gerado_url) {
                                                                            const path = req.termo_assinado_url || req.termo_gerado_url || '';
                                                                            const url = await getIbanRequestFileUrl(path);
                                                                            window.open(url, '_blank', 'noopener,noreferrer');
                                                                        }
                                                                    }}
                                                                    title="Ver Termo de Autorização"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {isRejected && (
                                                            <span className="text-[10px] text-rose-500 font-semibold cursor-help" title={`Motivo: ${req.rejection_reason || 'Não informado'}`}>
                                                                Ver Motivo
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            {/* RENDER DIALOGS */}
            {uploadModalData && (
                <IbanDocumentUploadDialog 
                    open={uploadModalOpen} 
                    onOpenChange={setUploadModalOpen} 
                    {...uploadModalData} 
                />
            )}

            {createRequestData && selectedEmpresaId && (
                <CreateIbanRequestDialog 
                    open={createRequestOpen}
                    onOpenChange={setCreateRequestOpen}
                    workerId={createRequestData.workerId}
                    workerName={createRequestData.workerName}
                    currentIban={createRequestData.currentIban}
                    currentBanco={createRequestData.currentBanco}
                    empresaId={selectedEmpresaId}
                />
            )}

            {reviewRequestData && selectedEmpresaId && (
                <ReviewIbanRequestDialog 
                    open={reviewRequestOpen}
                    onOpenChange={setReviewRequestOpen}
                    request={reviewRequestData}
                    empresaId={selectedEmpresaId}
                />
            )}
        </div>
    );

    // Small helper helper to show copy link if someone wants to re-check
    function setTokenForReopen(token: string) {
        setCreateRequestOpen(true);
        // Force the dialog state to show this token
        // CreateIbanRequestDialog checks for workerId and generates, but we can hook into it
    }
}
