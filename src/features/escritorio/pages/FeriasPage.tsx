import React, { useState, useEffect, useMemo } from 'react';
import { 
    Palmtree, 
    Calendar, 
    Plus, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertCircle, 
    Users, 
    Filter, 
    Search,
    RefreshCw
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
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
    listarColaboradoresEscritorio, 
    listarFerias, 
    solicitarFerias, 
    atualizarStatusFerias 
} from '../api/escritorioApi';
import type { ColaboradorEscritorio, RhFeriasSolicitacao } from '../types/escritorio';

export const FeriasPage: React.FC = () => {
    const anoAtual = new Date().getFullYear();
    const [ano, setAno] = useState(anoAtual);
    const [loading, setLoading] = useState(true);
    const [colaboradores, setColaboradores] = useState<ColaboradorEscritorio[]>([]);
    const [solicitacoes, setSolicitacoes] = useState<RhFeriasSolicitacao[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');

    // Modal Nova Solicitação
    const [modalOpen, setModalOpen] = useState(false);
    const [novaSolicitacao, setNovaSolicitacao] = useState({
        member_id: '',
        data_inicio: '',
        data_fim: '',
        observacoes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [cols, feriasList] = await Promise.all([
                listarColaboradoresEscritorio(),
                listarFerias(ano),
            ]);
            setColaboradores(cols);
            setSolicitacoes(feriasList);
        } catch (error) {
            console.error('Erro ao carregar férias:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [ano]);

    const colabMap = useMemo(() => {
        const map = new Map<string, ColaboradorEscritorio>();
        colaboradores.forEach(c => map.set(c.id, c));
        return map;
    }, [colaboradores]);

    // Filtragem de solicitações
    const solicitacoesFiltradas = useMemo(() => {
        return solicitacoes.filter(s => {
            const colab = colabMap.get(s.member_id);
            const nome = colab?.nombrecompleto?.toLowerCase() || '';
            const matchesSearch = !searchTerm.trim() || nome.includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'todos' || s.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [solicitacoes, colabMap, searchTerm, statusFilter]);

    // Resumo Estatístico
    const stats = useMemo(() => {
        const pendentes = solicitacoes.filter(s => s.status === 'solicitado').length;
        const aprovadas = solicitacoes.filter(s => s.status === 'aprovado').length;
        const totalDiasGozados = solicitacoes
            .filter(s => s.status === 'aprovado' || s.status === 'gozado')
            .reduce((acc, s) => acc + (s.dias_solicitados || 0), 0);

        return { pendentes, aprovadas, totalDiasGozados };
    }, [solicitacoes]);

    // Dias calculados no formulário
    const diasCalculados = useMemo(() => {
        if (!novaSolicitacao.data_inicio || !novaSolicitacao.data_fim) return 0;
        const d1 = new Date(novaSolicitacao.data_inicio);
        const d2 = new Date(novaSolicitacao.data_fim);
        if (d2 < d1) return 0;
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, [novaSolicitacao.data_inicio, novaSolicitacao.data_fim]);

    const handleCriarSolicitacao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novaSolicitacao.member_id || diasCalculados <= 0) {
            alert('Preencha o colaborador e as datas válidas.');
            return;
        }

        try {
            setSubmitting(true);
            await solicitarFerias({
                member_id: novaSolicitacao.member_id,
                ano_exercicio: ano,
                data_inicio: novaSolicitacao.data_inicio,
                data_fim: novaSolicitacao.data_fim,
                dias_solicitados: diasCalculados,
                tipo_dias: 'naturais',
                status: 'aprovado', // RH corporativo já pode aprovar diretamente
                observacoes: novaSolicitacao.observacoes || null,
            });

            setModalOpen(false);
            setNovaSolicitacao({ member_id: '', data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert(`Férias de ${diasCalculados} dias registradas com sucesso!`);
        } catch (error) {
            console.error('Erro ao registrar férias:', error);
            alert('Falha ao registrar período de férias.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAlterarStatus = async (id: string, novoStatus: 'aprovado' | 'rejeitado' | 'cancelado') => {
        try {
            await atualizarStatusFerias(id, novoStatus, 'RH Escritório');
            await carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar status de férias:', error);
            alert('Erro ao atualizar solicitação.');
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Estatuto de los Trabajadores (Espanha)
                        </span>
                        <span className="text-xs text-slate-500">
                            30 Dias Naturais / Fracionamento Autorizado
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Gestão de Férias & Calendário
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Controle anual de direito, gozo fracionado, aprovação e saldo de férias da equipe de escritório e oficina.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={carregarDados}
                        disabled={loading}
                        className="gap-2 text-xs font-semibold"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button 
                        onClick={() => setModalOpen(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Lançar Período de Férias
                    </Button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Solicitações Pendentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {stats.pendentes}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Aguardando aprovação</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Períodos Aprovados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {stats.aprovadas}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Exercício de {ano}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Dias Marcados / Gozados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {stats.totalDiasGozados} dias
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Somatório de toda a equipe</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Buscar colaborador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Status: Todos</SelectItem>
                                    <SelectItem value="aprovado">Aprovado</SelectItem>
                                    <SelectItem value="solicitado">Solicitado / Pendente</SelectItem>
                                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end">
                            <Badge variant="outline" className="text-xs py-1.5 px-3 border-slate-300 dark:border-slate-700">
                                {solicitacoesFiltradas.length} Férias Cadastradas
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Férias */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Colaborador</TableHead>
                                <TableHead className="font-bold text-xs">Departamento</TableHead>
                                <TableHead className="font-bold text-xs">Período de Férias</TableHead>
                                <TableHead className="font-bold text-xs text-center">Dias Fracionados</TableHead>
                                <TableHead className="font-bold text-xs">Status</TableHead>
                                <TableHead className="font-bold text-xs">Observações</TableHead>
                                <TableHead className="font-bold text-xs text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                        Carregando solicitações de férias...
                                    </TableCell>
                                </TableRow>
                            ) : solicitacoesFiltradas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                        Nenhuma solicitação de férias cadastrada para o ano {ano}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                solicitacoesFiltradas.map((sol) => {
                                    const colab = colabMap.get(sol.member_id);

                                    return (
                                        <TableRow key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {colab?.nombrecompleto || 'Colaborador'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {colab?.empresa_nome || 'KR Industrial'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {colab?.department_name || 'Geral'}
                                            </TableCell>
                                            <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                                {sol.data_inicio} até {sol.data_fim}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-xs text-emerald-600">
                                                {sol.dias_solicitados} dias
                                            </TableCell>
                                            <TableCell>
                                                {sol.status === 'aprovado' && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Aprovado</Badge>
                                                )}
                                                {sol.status === 'solicitado' && (
                                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pendente</Badge>
                                                )}
                                                {sol.status === 'rejeitado' && (
                                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Rejeitado</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                                                {sol.observacoes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {sol.status === 'solicitado' && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleAlterarStatus(sol.id, 'aprovado')}
                                                                className="h-7 text-[11px] text-emerald-600 border-emerald-300 hover:bg-emerald-50 px-2"
                                                            >
                                                                Aprovar
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleAlterarStatus(sol.id, 'rejeitado')}
                                                                className="h-7 text-[11px] text-rose-600 border-rose-300 hover:bg-rose-50 px-2"
                                                            >
                                                                Rejeitar
                                                            </Button>
                                                        </>
                                                    )}
                                                    {sol.status === 'aprovado' && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={() => handleAlterarStatus(sol.id, 'cancelado')}
                                                            className="h-7 text-[11px] text-slate-400 hover:text-rose-600 px-2"
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    )}
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

            {/* Modal Novo Lançamento de Férias */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                Espanha • 30 Dias Naturais
                            </span>
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            Lançar Período de Férias
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Informe o colaborador e o período desejado. O Estatuto espanhol permite fracionamento de dias.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCriarSolicitacao} className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs font-semibold">Colaborador *</Label>
                            <Select 
                                value={novaSolicitacao.member_id} 
                                onValueChange={(val) => setNovaSolicitacao({ ...novaSolicitacao, member_id: val })}
                            >
                                <SelectTrigger className="text-xs mt-1">
                                    <SelectValue placeholder="Selecione o colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colaboradores.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.nombrecompleto} ({c.department_name || 'Geral'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Data Início *</Label>
                                <Input 
                                    type="date"
                                    required
                                    value={novaSolicitacao.data_inicio}
                                    onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, data_inicio: e.target.value })}
                                    className="text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Data Fim *</Label>
                                <Input 
                                    type="date"
                                    required
                                    value={novaSolicitacao.data_fim}
                                    onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, data_fim: e.target.value })}
                                    className="text-xs mt-1"
                                />
                            </div>
                        </div>

                        {diasCalculados > 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                                    Total de dias naturais computados:
                                </span>
                                <Badge className="bg-emerald-600 text-white font-bold">
                                    {diasCalculados} dias
                                </Badge>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-semibold">Observações / Detalhes</Label>
                            <Input 
                                placeholder="Ex: Primeiro período de verão, aprovado com a gerência..."
                                value={novaSolicitacao.observacoes}
                                onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, observacoes: e.target.value })}
                                className="text-xs mt-1"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={submitting || diasCalculados <= 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                            >
                                {submitting ? 'Gravando...' : 'Confirmar Férias'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
