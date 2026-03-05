import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useEmpresa } from '../../app/providers/EmpresaProvider';
import { useClientHoursSummary } from './hooks/useClientHoursSummary';
import { Loader2, FileText, ChevronRight, Search, Users, Clock, Upload, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { useUniqueContratantes } from '../workers/hooks/useUniqueContratantes';
import { Combobox } from '../../components/ui/combobox';

export function HoursControlPage() {
    const navigate = useNavigate();
    const { selectedEmpresaId } = useEmpresa();

    // Default to previous month
    const currentDate = new Date();
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    const [periodYear, setPeriodYear] = useState(prevMonthDate.getFullYear());
    const [periodMonth, setPeriodMonth] = useState(prevMonthDate.getMonth() + 1); // 1-12
    const [clientFilter, setClientFilter] = useState('');
    const [contratanteFilter, setContratanteFilter] = useState<string | null>(null);
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalNode(document.getElementById('topbar-title-portal'));
    }, []);

    const { data: contratantes } = useUniqueContratantes();
    const { data: clients, isLoading, isError, error } = useClientHoursSummary(periodYear, periodMonth, contratanteFilter);

    // Filter controls
    const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()
    }));

    const filteredClients = (clients || []).filter(c =>
        c.cliente_nombre?.toLowerCase().includes(clientFilter.toLowerCase())
    );

    const kpis = {
        ativos: filteredClients.reduce((acc, c) => acc + (c.total_workers || 0), 0),
        pendentes: filteredClients.reduce((acc, c) => acc + (c.pending_hours || 0), 0),
        enviadas: filteredClients.reduce((acc, c) => acc + (c.submitted_hours || 0), 0),
        validadas: filteredClients.reduce((acc, c) => acc + (c.validated_hours || 0), 0),
    };

    const calculateStatus = (summary: any) => {
        if (summary.pending_hours === 0 && summary.submitted_hours === 0 && summary.validated_hours === 0) {
            // Implicit "no missing" if there are workers? Actually all active workers are initially marked as pending 
            // by our logic if they don't have a record or if it's explicitly 'pendente'
            // Oh right, in useClientHoursSummary, missing record = pendente
            // So total_workers = pending + submitted + validated usually.
        }

        if (summary.pending_hours > 0) return 'processing'; // Still waiting for some workers
        if (summary.submitted_hours > 0) return 'review'; // Waiting for admin validation
        return 'completed'; // All validated
    };

    return (
        <div className="h-[calc(100vh-115px)] w-full flex flex-col space-y-3">
            {portalNode && createPortal(
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight">Controle de Horas</h1>
                    <span className="text-sm font-medium text-muted-foreground">Gestão de folhas de pagamento dos trabalhadores</span>
                </div>,
                portalNode
            )}

            {/* Fila superior com Seletores */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0 bg-card p-4 rounded-md border shadow-sm">
                <div className="flex gap-4 items-center flex-wrap">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Mês Referência</label>
                        <Select value={periodMonth.toString()} onValueChange={(v) => setPeriodMonth(parseInt(v))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Ano</label>
                        <Select value={periodYear.toString()} onValueChange={(v) => setPeriodYear(parseInt(v))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-4 w-full sm:w-auto mt-2 sm:mt-0 items-center">
                    <div className="w-full sm:w-48">
                        <Combobox
                            options={contratantes?.filter(c => c && c.trim() !== '').map(c => ({ value: c, label: c })) || []}
                            value={contratanteFilter}
                            onChange={(val) => setContratanteFilter(val)}
                            placeholder="Filtrar por empresa..."
                            emptyText="Nenhuma empresa"
                        />
                    </div>

                    <div className="w-full sm:w-64 relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por cliente..."
                            className="pl-8"
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* KPIs */}
            {selectedEmpresaId && !isError && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    <Card className="p-4 flex flex-col justify-center border-l-4 border-l-slate-400 border-t border-r border-b">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Ativos no Mês</span>
                            <Users className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="text-2xl font-bold">{kpis.ativos}</span>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center border-l-4 border-l-amber-400 border-t border-r border-b">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Faltam Enviar</span>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="text-2xl font-bold text-amber-600">{kpis.pendentes}</span>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center border-l-4 border-l-blue-400 border-t border-r border-b">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Para Validar</span>
                            <Upload className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{kpis.enviadas}</span>
                    </Card>
                    <Card className="p-4 flex flex-col justify-center border-l-4 border-l-green-400 border-t border-r border-b">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Validadas</span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="text-2xl font-bold text-green-600">{kpis.validadas}</span>
                    </Card>
                </div>
            )}

            {/* Listagem de Clientes */}
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden border">
                <div className="flex-1 relative [&>div]:absolute [&>div]:inset-0 [&>div]:overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-md">
                            <TableRow className="border-b-0">
                                <TableHead className="font-semibold text-foreground">Cliente</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Trabalhadores Ativos</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Horas Pendentes</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Enviadas (A Validar)</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Validadas</TableHead>
                                <TableHead className="font-semibold text-foreground text-center">Status Geral</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!selectedEmpresaId && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        Selecione uma empresa para visualizar os dados.
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && isLoading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span>Carregando dados...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && isError && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-destructive">
                                        Falha ao carregar os dados. {error?.message}
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && filteredClients.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        Nenhum cliente com trabalhadores ativos encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {selectedEmpresaId && !isLoading && !isError && filteredClients.map((client) => {
                                const status = calculateStatus(client);
                                return (
                                    <TableRow
                                        key={client.cliente_nombre}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => navigate(`/hours-control/client/${encodeURIComponent(client.cliente_nombre)}?year=${periodYear}&month=${periodMonth}`)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-100 rounded-md">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                </div>
                                                {client.cliente_nombre}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{client.total_workers}</TableCell>
                                        <TableCell className="text-center">
                                            {client.pending_hours > 0 ? (
                                                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                    {client.pending_hours} faltam
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.submitted_hours > 0 ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                    {client.submitted_hours} p/ validar
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.validated_hours > 0 ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    {client.validated_hours} prontas
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {status === 'processing' && <Badge variant="secondary" className="bg-slate-100">Coletando</Badge>}
                                            {status === 'review' && <Badge variant="default" className="bg-blue-500">Revisar</Badge>}
                                            {status === 'completed' && <Badge variant="outline" className="border-green-500 text-green-600">Completo</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
