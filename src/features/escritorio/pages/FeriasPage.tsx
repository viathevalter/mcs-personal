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
            console.error('Error al cargar vacaciones:', error);
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

    // Resumen Estadístico
    const stats = useMemo(() => {
        const pendentes = solicitacoes.filter(s => s.status === 'solicitado').length;
        const aprovadas = solicitacoes.filter(s => s.status === 'aprovado').length;
        const totalDiasGozados = solicitacoes
            .filter(s => s.status === 'aprovado' || s.status === 'gozado')
            .reduce((acc, s) => acc + (s.dias_solicitados || 0), 0);

        return { pendentes, aprovadas, totalDiasGozados };
    }, [solicitacoes]);

    // Días calculados en formulario
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
            alert('Seleccione el empleado y las fechas válidas.');
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
                status: 'aprovado',
                observacoes: novaSolicitacao.observacoes || null,
            });

            setModalOpen(false);
            setNovaSolicitacao({ member_id: '', data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert(`¡Vacaciones de ${diasCalculados} días registradas con éxito!`);
        } catch (error) {
            console.error('Error al registrar vacaciones:', error);
            alert('Fallo al registrar período de vacaciones.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAlterarStatus = async (id: string, novoStatus: 'aprovado' | 'rejeitado' | 'cancelado') => {
        try {
            await atualizarStatusFerias(id, novoStatus, 'RRHH');
            await carregarDados();
        } catch (error) {
            console.error('Error al actualizar estado de vacaciones:', error);
            alert('Error al actualizar solicitud.');
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Estatuto de los Trabajadores (España)
                        </span>
                        <span className="text-xs text-slate-500">
                            30 Días Naturales / Fraccionamiento Autorizado
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Gestión de Vacaciones y Calendario
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Control anual de derecho, disfrute fraccionado, aprobación y saldo de vacaciones del equipo de oficina y taller.
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
                        Actualizar
                    </Button>
                    <Button 
                        onClick={() => setModalOpen(true)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar Período de Vacaciones
                    </Button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Solicitudes Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {stats.pendentes}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Pendientes de aprobación</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Períodos Aprobados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {stats.aprovadas}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Ejercicio de {ano}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Días Registrados / Disfrutados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {stats.totalDiasGozados} días
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Sumatorio de todo el equipo</p>
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
                                placeholder="Buscar empleado..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>

                        <div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Estado: Todos</SelectItem>
                                    <SelectItem value="aprovado">Aprobado</SelectItem>
                                    <SelectItem value="solicitado">Pendiente</SelectItem>
                                    <SelectItem value="rejeitado">Rechazado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end">
                            <Badge variant="outline" className="text-xs py-1.5 px-3 border-slate-300 dark:border-slate-700">
                                {solicitacoesFiltradas.length} Períodos Registrados
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Vacaciones */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Empleado</TableHead>
                                <TableHead className="font-bold text-xs">Departamento</TableHead>
                                <TableHead className="font-bold text-xs">Período de Vacaciones</TableHead>
                                <TableHead className="font-bold text-xs text-center">Días Fraccionados</TableHead>
                                <TableHead className="font-bold text-xs">Estado</TableHead>
                                <TableHead className="font-bold text-xs">Observaciones</TableHead>
                                <TableHead className="font-bold text-xs text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                        Cargando solicitudes de vacaciones...
                                    </TableCell>
                                </TableRow>
                            ) : solicitacoesFiltradas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                                        No hay períodos de vacaciones registrados para el año {ano}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                solicitacoesFiltradas.map((sol) => {
                                    const colab = colabMap.get(sol.member_id);

                                    return (
                                        <TableRow key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {colab?.nombrecompleto || 'Empleado'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {colab?.empresa_nome || 'KR Industrial'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                {colab?.department_name || 'General'}
                                            </TableCell>
                                            <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                                {sol.data_inicio} hasta {sol.data_fim}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-xs text-emerald-600">
                                                {sol.dias_solicitados} días
                                            </TableCell>
                                            <TableCell>
                                                {sol.status === 'aprovado' && (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Aprobado</Badge>
                                                )}
                                                {sol.status === 'solicitado' && (
                                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pendiente</Badge>
                                                )}
                                                {sol.status === 'rejeitado' && (
                                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Rechazado</Badge>
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
                                                                Aprobar
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleAlterarStatus(sol.id, 'rejeitado')}
                                                                className="h-7 text-[11px] text-rose-600 border-rose-300 hover:bg-rose-50 px-2"
                                                            >
                                                                Rechazar
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

            {/* Modal Registro de Vacaciones */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                España • 30 Días Naturales
                            </span>
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            Registrar Período de Vacaciones
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Indique el empleado y el período deseado. La legislación española permite el fraccionamiento de las vacaciones.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCriarSolicitacao} className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs font-semibold">Empleado *</Label>
                            <Select 
                                value={novaSolicitacao.member_id} 
                                onValueChange={(val) => setNovaSolicitacao({ ...novaSolicitacao, member_id: val })}
                            >
                                <SelectTrigger className="text-xs mt-1">
                                    <SelectValue placeholder="Seleccione el empleado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {colaboradores.filter(c => c.active).map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.nombrecompleto} ({c.department_name || 'General'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Fecha de Inicio *</Label>
                                <Input 
                                    type="date"
                                    required
                                    value={novaSolicitacao.data_inicio}
                                    onChange={(e) => setNovaSolicitacao({ ...novaSolicitacao, data_inicio: e.target.value })}
                                    className="text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Fecha de Fin *</Label>
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
                                    Total de días naturales computados:
                                </span>
                                <Badge className="bg-emerald-600 text-white font-bold">
                                    {diasCalculados} días
                                </Badge>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-semibold">Observaciones / Detalles</Label>
                            <Input 
                                placeholder="Ej: Primer período estival acordado..."
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
                                {submitting ? 'Guardando...' : 'Confirmar Vacaciones'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
