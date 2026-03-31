import { useState } from 'react';
import { Loader2, Search, Wallet, Download, ChevronUp, ChevronDown, Eye, EyeOff, User, Building, Landmark, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAllBankAccounts } from '../hooks/useAllBankAccounts';

import { ImportBankAccountsDialog } from '../components/ImportBankAccountsDialog';
import { ExportBankAccountsDialog } from '../components/ExportBankAccountsDialog';
import { Link } from 'react-router-dom';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

export function BankAccountsPage() {
    const { selectedEmpresaId } = useEmpresa();

    const [searchTerm, setSearchTerm] = useState('');
    const [clienteFilter, setClienteFilter] = useState<string>('all');
    const [contratanteFilter, setContratanteFilter] = useState<string>('all');

    const [sortColumn, setSortColumn] = useState<'worker_nome' | 'worker_codigo' | 'banco' | 'iban'>('worker_nome');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Estado para controlar a visibilidade do IBAN por ID de trabalhador
    const [revealedIbans, setRevealedIbans] = useState<Set<string>>(new Set());

    const { data: bankAccounts, isLoading } = useAllBankAccounts(selectedEmpresaId || undefined);

    const toggleIbanVisibility = (id: string, e: React.MouseEvent) => {
        e.preventDefault(); // Impede o clique de navegar (como o Card é um Link)
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
        if (clean.length < 8) return iban; // Se for muito curto para mascarar bem
        
        const start = clean.substring(0, 4);
        const end = clean.substring(clean.length - 4);
        return `${start} •••• •••• •••• ${end}`;
    };

    // Derive dropdown options
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

        const matchesSearch = !searchTerm || (
            acc.worker_nome?.toLowerCase().includes(lowerSearch) ||
            acc.worker_codigo?.toLowerCase().includes(lowerSearch) ||
            acc.iban?.toLowerCase().includes(lowerSearch)
        );

        return matchesClient && matchesContratante && matchesSearch;
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

    const SortIcon = ({ column }: { column: typeof sortColumn }) => {
        if (sortColumn !== column) return <ChevronUp className="w-4 h-4 ml-1 opacity-20" />;
        return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    };



    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col h-full bg-slate-50">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
                        <Wallet className="w-8 h-8 mr-3 text-primary" />
                        Conta Corrente
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Gestão global de contas bancárias (IBAN) e parâmetros financeiros dos trabalhadores.
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
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 w-full md:w-64">
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

                <div className="space-y-2 w-full md:w-64">
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

                <div className="space-y-2 flex-1 w-full">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Buscar</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, código ou IBAN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-slate-50/50"
                        />
                    </div>
                </div>
            </div>



            {/* Sort & Order Controls for Gallery */}
            <div className="flex items-center gap-4 mb-4 text-sm text-slate-500">
                <span className="font-medium">Ordenar por:</span>
                <button 
                    onClick={() => toggleSort('worker_nome')}
                    className={`flex items-center hover:text-primary transition-colors ${sortColumn === 'worker_nome' ? 'text-primary font-semibold' : ''}`}
                >
                    Nome <SortIcon column="worker_nome" />
                </button>
                <button 
                    onClick={() => toggleSort('banco')}
                    className={`flex items-center hover:text-primary transition-colors ${sortColumn === 'banco' ? 'text-primary font-semibold' : ''}`}
                >
                    Banco <SortIcon column="banco" />
                </button>
                <div className="flex-1"></div>
                <div className="text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                    {sortedAccounts.length} {sortedAccounts.length === 1 ? 'conta' : 'contas'}
                </div>
            </div>

            {/* Gallery Section */}
            <div className="flex-1 overflow-y-auto pr-1 pb-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground w-full bg-white rounded-xl border border-slate-200/60 shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                        <p>Carregando contas bancárias...</p>
                    </div>
                ) : sortedAccounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedAccounts.map((account) => {
                            const isRevealed = revealedIbans.has(account.worker_id);
                            
                            return (
                                <Link 
                                    to={`/workers/${account.worker_id}`}
                                    key={account.worker_id} 
                                    className="group bg-white flex flex-col justify-between rounded-xl border border-slate-200 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-indigo-200/80 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative"
                                    title={`Acessar perfil de ${account.worker_nome}`}
                                >
                                    {/* Top status indicator line */}
                                    <div className={`h-[5px] w-full ${account.iban ? 'bg-emerald-500' : 'bg-slate-200/80'}`} />
                                    
                                    <div className="p-5 flex-1 flex flex-col">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {account.worker_nome}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                                    <User className="w-3.5 h-3.5 opacity-70" />
                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{account.worker_codigo}</span>
                                                </div>
                                            </div>
                                            
                                            <div className={`w-9 h-9 rounded-full ${account.iban ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'} flex items-center justify-center flex-shrink-0 transition-colors`}>
                                                <Landmark className="w-4.5 h-4.5" />
                                            </div>
                                        </div>

                                        {/* Bank details info */}
                                        <div className="mb-5 space-y-2.5">
                                            <div className="flex items-center text-sm">
                                                <Building className="w-4 h-4 mr-2 text-slate-400" />
                                                <span className="text-slate-600 font-medium truncate">
                                                    {account.banco || <span className="text-slate-400 italic font-normal text-xs">Banco não informado</span>}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 group-hover:border-indigo-50/80 group-hover:bg-indigo-50/30 transition-colors relative">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                    IBAN 
                                                </label>
                                                
                                                <div className="flex items-center justify-between">
                                                    {account.iban ? (
                                                        <span className={`font-mono text-[13px] font-medium tracking-tight ${isRevealed ? 'text-slate-800' : 'text-slate-500'}`}>
                                                            {isRevealed ? account.iban : maskIban(account.iban)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">Não disponível</span>
                                                    )}
                                                    
                                                    {account.iban && (
                                                        <button 
                                                            onClick={(e) => toggleIbanVisibility(account.worker_id, e)}
                                                            className="p-1.5 -m-1.5 ml-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                                            title={isRevealed ? "Ocultar IBAN" : "Revelar IBAN"}
                                                        >
                                                            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar (Footer style) */}
                                    <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100/80 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider flex items-center">
                                            Acessar Perfil
                                        </span>
                                        <ExternalLink className="w-4 h-4 text-indigo-500" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground w-full bg-white rounded-xl border border-slate-200/60 shadow-sm">
                        <Wallet className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Nenhuma conta bancária encontrada para os critérios dados.</p>
                        <p className="text-slate-400 text-sm mt-1">Limpe os filtros de cliente/empresa ou busca realizada.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
