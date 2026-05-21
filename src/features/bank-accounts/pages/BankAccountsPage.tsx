import { useState } from 'react';
import { Loader2, Search, Wallet, Download, Eye, EyeOff, FileText, UploadCloud, UserCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAllBankAccounts } from '../hooks/useAllBankAccounts';

import { ImportBankAccountsDialog } from '../components/ImportBankAccountsDialog';
import { ExportBankAccountsDialog } from '../components/ExportBankAccountsDialog';
import { IbanDocumentUploadDialog } from '../components/IbanDocumentUploadDialog';
import type { IbanDocType } from '../api/ibanDocumentsApi';
import { Link } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function BankAccountsPage() {
    const { selectedEmpresaId } = useEmpresa();

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
    
    // Upload Modal State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadModalData, setUploadModalData] = useState<{workerId: string, workerName: string, docType: IbanDocType, currentUrl: string | null} | null>(null);

    // Fetch using new parameters month and year
    const { data: bankAccounts, isLoading } = useAllBankAccounts(selectedEmpresaId || undefined, periodMonth, periodYear);

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

    return (
        <div className="p-8 max-w-[1700px] mx-auto flex flex-col h-full bg-slate-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
                        <Wallet className="w-8 h-8 mr-3 text-primary" />
                        Conta Corrente (IBAN)
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Gestão de IBAN por período e comprovativos de titularidade.
                    </p>
                </div>

                <div className="flex gap-2">
                    <ImportBankAccountsDialog trigger={
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border-0">
                            <Download className="w-4 h-4 mr-2" />
                            Importar Planilhas
                        </Button>
                    } />
                    <ExportBankAccountsDialog 
                        bankAccounts={bankAccounts} 
                        isLoading={isLoading} 
                        trigger={
                            <Button variant="outline" className="bg-white hover:bg-slate-50">
                                <Download className="w-4 h-4 mr-2" />
                                Exportar SEPA / Excel
                            </Button>
                        } 
                    />
                </div>
            </div>

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
                        className={onlyNovos ? "bg-amber-500 hover:bg-amber-600 border-0" : ""}
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
                                <TableHead className="w-[80px] font-semibold text-xs text-slate-500 uppercase">Nº</TableHead>
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
                                <TableHead className="font-semibold text-xs text-slate-500 uppercase text-center">DATA ALTERAÇÃO</TableHead>
                                <TableHead className="font-semibold text-xs text-slate-500 uppercase border-l w-[120px]">EMPRESA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>Carregando dados financeiros mensais...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
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
                                                        <span className="text-[13px] text-red-500/80 italic font-medium flex items-center">
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
                                            
                                            {/* TITULARIDADE UPLOAD MOCKUP */}
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
                                            
                                            {/* AUTORIZAÇÃO UPLOAD MOCKUP */}
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
                                            
                                            <TableCell className="text-center text-[12px] text-slate-500 font-medium">
                                                {formatDate(account.updated_at)}
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
                            trabalhadores na lista mensal
                        </div>
                        <div className="flex gap-5 font-medium">
                            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-400 shadow-sm mr-2 border border-amber-500 border-opacity-20"></span> Novos em {mesesDisponiveis.find(m => m.value === periodMonth)?.label}: {sortedAccounts.filter(a => a.is_new).length}</span>
                            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-sm mr-2 border border-rose-600 border-opacity-20"></span> Pagamentos sem IBAN: <span className="text-rose-600 ml-1 font-bold">{sortedAccounts.filter(a => !a.iban).length}</span></span>
                            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-sm mr-2 border border-emerald-600 border-opacity-20"></span> Comprovativos Pendentes: <span className="text-slate-800 ml-1 font-bold">{sortedAccounts.filter(a => a.iban && !a.certificado_url).length}</span></span>
                        </div>
                    </div>
                )}
            </div>
            
            {uploadModalData && (
                <IbanDocumentUploadDialog 
                    open={uploadModalOpen} 
                    onOpenChange={setUploadModalOpen} 
                    {...uploadModalData} 
                />
            )}
        </div>
    );
}
