import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Search, 
    Filter, 
    Clock, 
    Palmtree, 
    ShieldCheck, 
    Building2, 
    Mail, 
    Phone, 
    ChevronRight, 
    UserCheck, 
    UserX,
    AlertCircle, 
    Download,
    ExternalLink,
    Briefcase,
    Power
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { listarColaboradoresEscritorio, alternarStatusColaborador } from '../api/escritorioApi';
import type { ColaboradorEscritorio } from '../types/escritorio';

export const ColaboradoresPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [colaboradores, setColaboradores] = useState<ColaboradorEscritorio[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('todos');
    const [filterRelogio, setFilterRelogio] = useState('todos');
    const [filterStatus, setFilterStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

    const carregarColaboradores = async () => {
        try {
            setLoading(true);
            const data = await listarColaboradoresEscritorio();
            setColaboradores(data);
        } catch (error) {
            console.error('Erro ao carregar colaboradores de escritório:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarColaboradores();
    }, []);

    // Estatísticas de Ativos e Inativos
    const totalAtivos = useMemo(() => colaboradores.filter(c => c.active).length, [colaboradores]);
    const totalInativos = useMemo(() => colaboradores.filter(c => !c.active).length, [colaboradores]);

    // Lista única de departamentos
    const departamentos = useMemo(() => {
        const set = new Set<string>();
        colaboradores.forEach(c => {
            if (c.department_name) set.add(c.department_name);
        });
        return Array.from(set).sort();
    }, [colaboradores]);

    // Filtragem combinada
    const colaboradoresFiltrados = useMemo(() => {
        return colaboradores.filter(c => {
            const matchesSearch = 
                !searchTerm.trim() ||
                c.nombrecompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.correoempresarial && c.correoempresarial.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.timeclock_code && c.timeclock_code.includes(searchTerm));

            const matchesDept = 
                selectedDepartment === 'todos' || 
                c.department_name === selectedDepartment;

            const matchesRelogio = 
                filterRelogio === 'todos' ||
                (filterRelogio === 'com_codigo' && !!c.timeclock_code) ||
                (filterRelogio === 'sem_codigo' && !c.timeclock_code);

            const matchesStatus = 
                filterStatus === 'todos' ||
                (filterStatus === 'ativos' && c.active) ||
                (filterStatus === 'inativos' && !c.active);

            return matchesSearch && matchesDept && matchesRelogio && matchesStatus;
        });
    }, [colaboradores, searchTerm, selectedDepartment, filterRelogio, filterStatus]);

    const handleAlternarStatus = async (colaborador: ColaboradorEscritorio, e: React.MouseEvent) => {
        e.stopPropagation();
        const novoStatus = !colaborador.active;
        const confirmMsg = novoStatus
            ? `Deseja reativar o colaborador ${colaborador.nombrecompleto}?`
            : `Deseja inativar o colaborador ${colaborador.nombrecompleto}? Ele não aparecerá na lista de ativos padrão nem no ponto diário.`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await alternarStatusColaborador(colaborador.id, novoStatus);
            await carregarColaboradores();
        } catch (error) {
            console.error('Erro ao alternar status do colaborador:', error);
            alert('Falha ao alterar status do colaborador.');
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                            Equipe Interna
                        </span>
                        <span className="text-xs text-slate-500">
                            Central do Colaborador
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Colaboradores de Escritório & Oficina
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Gestão de fichas laborais, vínculos ao relógio ponto, saldos de férias e patrimônio entregue.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 px-3 py-1.5 font-semibold text-xs gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        {totalAtivos} Ativos
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5 font-semibold text-xs border-slate-300 dark:border-slate-700 text-slate-500">
                        {totalInativos} Inativos
                    </Badge>
                </div>
            </div>

            {/* Filtros e Busca */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Buscar por nome, email ou ID ponto..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <div>
                            <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                                <SelectTrigger className="text-xs font-semibold">
                                    <SelectValue placeholder="Status: Ativos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ativos">Status: Apenas Ativos ({totalAtivos})</SelectItem>
                                    <SelectItem value="inativos">Status: Apenas Inativos ({totalInativos})</SelectItem>
                                    <SelectItem value="todos">Status: Todos ({colaboradores.length})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Todos os Departamentos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Departamentos</SelectItem>
                                    {departamentos.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Select value={filterRelogio} onValueChange={setFilterRelogio}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Vínculo de Relógio Ponto" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Relógio: Todos</SelectItem>
                                    <SelectItem value="com_codigo">Com ID Relógio Ponto</SelectItem>
                                    <SelectItem value="sem_codigo">Sem ID Relógio Ponto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                        <span>
                            Exibindo <strong className="text-slate-900 dark:text-white">{colaboradoresFiltrados.length}</strong> de {colaboradores.length} colaboradores
                        </span>
                        {(searchTerm || selectedDepartment !== 'todos' || filterRelogio !== 'todos' || filterStatus !== 'ativos') && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedDepartment('todos');
                                    setFilterRelogio('todos');
                                    setFilterStatus('ativos');
                                }}
                                className="text-xs font-semibold h-7 text-sky-600 hover:text-sky-700"
                            >
                                Restaurar Padrão (Apenas Ativos)
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Colaboradores */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/70 dark:bg-slate-900/50 hover:bg-transparent">
                                    <TableHead className="font-bold text-xs">Colaborador / Contato</TableHead>
                                    <TableHead className="font-bold text-xs">Departamento</TableHead>
                                    <TableHead className="font-bold text-xs">Empresa Contratante</TableHead>
                                    <TableHead className="font-bold text-xs">Status</TableHead>
                                    <TableHead className="font-bold text-xs">ID Relógio Ponto</TableHead>
                                    <TableHead className="font-bold text-xs">Saldo Férias {new Date().getFullYear()}</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Ativos Alocados</TableHead>
                                    <TableHead className="font-bold text-xs text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-500">
                                            Carregando colaboradores...
                                        </TableCell>
                                    </TableRow>
                                ) : colaboradoresFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-xs text-slate-500">
                                            Nenhum colaborador encontrado com os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    colaboradoresFiltrados.map((colaborador) => {
                                        return (
                                            <TableRow 
                                                key={colaborador.id}
                                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${!colaborador.active ? 'opacity-60 bg-slate-50/30' : ''}`}
                                                onClick={() => navigate(`/escritorio/colaboradores/${colaborador.id}`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-full ${colaborador.active ? 'bg-gradient-to-br from-sky-500 to-indigo-600' : 'bg-slate-400'} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                                                            {colaborador.nombrecompleto?.slice(0, 2).toUpperCase() || 'MC'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900 dark:text-white hover:text-sky-600 transition-colors">
                                                                {colaborador.nombrecompleto}
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                                {colaborador.correoempresarial && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Mail className="h-3 w-3 text-slate-400" />
                                                                        {colaborador.correoempresarial}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {colaborador.department_name || 'Geral'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {colaborador.laboral?.cargo || 'Colaborador Interno'}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                        {colaborador.empresa_nome || 'KR Industrial'}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {colaborador.active ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] font-semibold gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            Ativo
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 text-[10px] font-semibold">
                                                            Inativo
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {colaborador.timeclock_code ? (
                                                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-mono text-[11px] gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            ID: {colaborador.timeclock_code}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Não vinculado
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                        <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                                                        <span>{colaborador.ferias_saldo?.dias_saldo ?? 30} dias</span>
                                                        <span className="text-[10px] text-slate-400">/ 30 anuais</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {(colaborador.ativos_patrimonio_count || 0) > 0 ? (
                                                        <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[11px] font-bold">
                                                            {colaborador.ativos_patrimonio_count} item(s)
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">0</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={(e) => handleAlternarStatus(colaborador, e)}
                                                            className={`h-7 px-2 text-[11px] font-medium ${colaborador.active ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'}`}
                                                            title={colaborador.active ? 'Inativar colaborador' : 'Reativar colaborador'}
                                                        >
                                                            {colaborador.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/escritorio/colaboradores/${colaborador.id}`);
                                                            }}
                                                            className="h-8 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 gap-1"
                                                        >
                                                            Abrir Ficha
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
