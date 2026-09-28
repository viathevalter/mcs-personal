import React, { useState, useEffect, useMemo } from 'react';
import { 
    Stethoscope, 
    Plus, 
    Calendar, 
    FileText, 
    Search, 
    Filter, 
    CheckCircle2, 
    AlertTriangle,
    Download,
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
    listarAusencias, 
    registrarAusencia 
} from '../api/escritorioApi';
import type { ColaboradorEscritorio, RhAusencia } from '../types/escritorio';
import { TIPOS_AUSENCIA } from '../types/escritorio';

export const AusenciasPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [colaboradores, setColaboradores] = useState<ColaboradorEscritorio[]>([]);
    const [ausencias, setAusencias] = useState<RhAusencia[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('todos');

    // Modal Nova Ausência
    const [modalOpen, setModalOpen] = useState(false);
    const [novaAusencia, setNovaAusencia] = useState({
        member_id: '',
        tipo: 'baixa_medica',
        data_inicio: '',
        data_fim: '',
        remunerada: true,
        observacoes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [cols, ausList] = await Promise.all([
                listarColaboradoresEscritorio(),
                listarAusencias(),
            ]);
            setColaboradores(cols);
            setAusencias(ausList);
        } catch (error) {
            console.error('Error al cargar ausencias:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    const colabMap = useMemo(() => {
        const map = new Map<string, ColaboradorEscritorio>();
        colaboradores.forEach(c => map.set(c.id, c));
        return map;
    }, [colaboradores]);

    // Filtrado
    const ausenciasFiltradas = useMemo(() => {
        return ausencias.filter(a => {
            const colab = colabMap.get(a.member_id);
            const nome = colab?.nombrecompleto?.toLowerCase() || '';
            const matchesSearch = !searchTerm.trim() || nome.includes(searchTerm.toLowerCase());
            const matchesTipo = tipoFilter === 'todos' || a.tipo === tipoFilter;
            return matchesSearch && matchesTipo;
        });
    }, [ausencias, colabMap, searchTerm, tipoFilter]);

    // Estadísticas
    const stats = useMemo(() => {
        const baixasMedicas = ausencias.filter(a => a.tipo === 'baixa_medica').length;
        const totalDias = ausencias.reduce((acc, a) => acc + (a.dias_total || 0), 0);
        const injustificadas = ausencias.filter(a => a.tipo === 'falta_injustificada').length;

        return { baixasMedicas, totalDias, injustificadas };
    }, [ausencias]);

    const diasCalculados = useMemo(() => {
        if (!novaAusencia.data_inicio || !novaAusencia.data_fim) return 0;
        const d1 = new Date(novaAusencia.data_inicio);
        const d2 = new Date(novaAusencia.data_fim);
        if (d2 < d1) return 0;
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, [novaAusencia.data_inicio, novaAusencia.data_fim]);

    const handleSalvarAusencia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novaAusencia.member_id || diasCalculados <= 0) {
            alert('Seleccione el empleado y el período correctamente.');
            return;
        }

        try {
            setSubmitting(true);
            await registrarAusencia({
                member_id: novaAusencia.member_id,
                tipo: novaAusencia.tipo as any,
                data_inicio: novaAusencia.data_inicio,
                data_fim: novaAusencia.data_fim,
                dias_total: diasCalculados,
                remunerada: novaAusencia.tipo !== 'falta_injustificada',
                status: 'registrado',
                observacoes: novaAusencia.observacoes || null,
            });

            setModalOpen(false);
            setNovaAusencia({ member_id: '', tipo: 'baixa_medica', data_inicio: '', data_fim: '', remunerada: true, observacoes: '' });
            await carregarDados();
            alert('¡Ausencia / Permiso registrado con éxito!');
        } catch (error) {
            console.error('Error al registrar ausencia:', error);
            alert('Error al guardar el registro de ausencia.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                            Seguridad Social y Estatuto
                        </span>
                        <span className="text-xs text-slate-500">
                            Bajas Médicas (IT) y Permisos Retribuidos
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Ausencias, Licencias y Bajas
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Control de incapacidad temporal (IT), justificantes médicos, permisos retribuidos e impacto en nómina.
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
                        className="gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar Nueva Ausencia
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Bajas Médicas (IT)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {stats.baixasMedicas}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Comunicación Seguridad Social</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Días Acumulados de Ausencia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {stats.totalDias} días
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Total general registrado</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Faltas Injustificadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            {stats.injustificadas}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Impacto con descuento en nómina</p>
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
                            <Select value={tipoFilter} onValueChange={setTipoFilter}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Tipo de Ausencia" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Tipo: Todos</SelectItem>
                                    {TIPOS_AUSENCIA.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end">
                            <Badge variant="outline" className="text-xs py-1.5 px-3 border-slate-300 dark:border-slate-700">
                                {ausenciasFiltradas.length} Registros
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Ausencias */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Empleado</TableHead>
                                <TableHead className="font-bold text-xs">Tipo de Permiso / Motivo</TableHead>
                                <TableHead className="font-bold text-xs">Período</TableHead>
                                <TableHead className="font-bold text-xs text-center">Días Totales</TableHead>
                                <TableHead className="font-bold text-xs">Retribuida</TableHead>
                                <TableHead className="font-bold text-xs">Observaciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-500">
                                        Cargando ausencias...
                                    </TableCell>
                                </TableRow>
                            ) : ausenciasFiltradas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-500">
                                        No se han encontrado ausencias con los filtros seleccionados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ausenciasFiltradas.map((aus) => {
                                    const colab = colabMap.get(aus.member_id);
                                    const tipoConfig = TIPOS_AUSENCIA.find(t => t.id === aus.tipo);

                                    return (
                                        <TableRow key={aus.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell>
                                                <div className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {colab?.nombrecompleto || 'Empleado'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {colab?.department_name || 'General'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${tipoConfig?.color || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                                                    {tipoConfig?.label || aus.tipo}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                {aus.data_inicio} hasta {aus.data_fim}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-xs">
                                                {aus.dias_total} días
                                            </TableCell>
                                            <TableCell>
                                                {aus.remunerada ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Sí</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-rose-600 border-rose-300 text-[10px]">Descuento</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-[220px] truncate">
                                                {aus.observacoes || '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal Nuevo Registro */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Registrar Ausencia / Baja Médica
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Indique el empleado, la modalidad legal de ausencia y las fechas de inicio y fin.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSalvarAusencia} className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs font-semibold">Empleado *</Label>
                            <Select 
                                value={novaAusencia.member_id} 
                                onValueChange={(val) => setNovaAusencia({ ...novaAusencia, member_id: val })}
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

                        <div>
                            <Label className="text-xs font-semibold">Tipo de Ausencia / Motivo Legal *</Label>
                            <Select 
                                value={novaAusencia.tipo} 
                                onValueChange={(val) => setNovaAusencia({ ...novaAusencia, tipo: val })}
                            >
                                <SelectTrigger className="text-xs mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPOS_AUSENCIA.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
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
                                    value={novaAusencia.data_inicio}
                                    onChange={(e) => setNovaAusencia({ ...novaAusencia, data_inicio: e.target.value })}
                                    className="text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Fecha de Fin *</Label>
                                <Input 
                                    type="date"
                                    required
                                    value={novaAusencia.data_fim}
                                    onChange={(e) => setNovaAusencia({ ...novaAusencia, data_fim: e.target.value })}
                                    className="text-xs mt-1"
                                />
                            </div>
                        </div>

                        {diasCalculados > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between">
                                <span className="font-semibold text-amber-800 dark:text-amber-300">
                                    Duración de la ausencia:
                                </span>
                                <Badge className="bg-amber-600 text-white font-bold">
                                    {diasCalculados} días
                                </Badge>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs font-semibold">Observaciones / N.º de Justificante</Label>
                            <Input 
                                placeholder="Ej: Baja médica por IT emitida por el médico de cabecera..."
                                value={novaAusencia.observacoes}
                                onChange={(e) => setNovaAusencia({ ...novaAusencia, observacoes: e.target.value })}
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
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                            >
                                {submitting ? 'Guardando...' : 'Guardar Ausencia'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
