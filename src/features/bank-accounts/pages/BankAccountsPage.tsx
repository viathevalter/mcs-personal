import { useState } from 'react';
import { Loader2, Search, Wallet, Download, ChevronUp, ChevronDown } from 'lucide-react';
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

    const { data: bankAccounts, isLoading } = useAllBankAccounts(selectedEmpresaId || undefined);

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



            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 font-semibold border-b">
                            <tr>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSort('worker_nome')}
                                >
                                    <div className="flex items-center">Trabalhador <SortIcon column="worker_nome" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSort('worker_codigo')}
                                >
                                    <div className="flex items-center">Código <SortIcon column="worker_codigo" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSort('banco')}
                                >
                                    <div className="flex items-center">Banco <SortIcon column="banco" /></div>
                                </th>
                                <th
                                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleSort('iban')}
                                >
                                    <div className="flex items-center">IBAN <SortIcon column="iban" /></div>
                                </th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                                            <p>Carregando contas bancárias...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedAccounts.length > 0 ? (
                                sortedAccounts.map((account) => (
                                    <tr key={account.worker_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {account.worker_nome}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {account.worker_codigo}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {account.banco || <span className="text-slate-400 italic">Não div.</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-700">
                                            {account.iban || <span className="text-slate-400 italic font-sans">Não div.</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/10">
                                                <Link to={`/workers/${account.worker_id}`}>
                                                    Acessar Perfil
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="h-64 text-center text-muted-foreground">
                                        Nenhuma conta bancária encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
