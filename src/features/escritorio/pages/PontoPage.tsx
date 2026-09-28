import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, 
    Upload, 
    Filter, 
    Calendar, 
    Users, 
    CheckCircle2, 
    AlertTriangle, 
    FileSpreadsheet, 
    Edit3,
    ArrowUpDown,
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
    listarPontoMes, 
    ajustarPonto 
} from '../api/escritorioApi';
import type { ColaboradorEscritorio, RhPontoRegistro } from '../types/escritorio';
import { ImportarPontoModal } from '../components/ImportarPontoModal';

export const PontoPage: React.FC = () => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const [mesAno, setMesAno] = useState(hojeStr.slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [colaboradores, setColaboradores] = useState<ColaboradorEscritorio[]>([]);
    const [pontos, setPontos] = useState<RhPontoRegistro[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('todos');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Modal Ajuste Manual
    const [pontoParaAjustar, setPontoParaAjustar] = useState<RhPontoRegistro | null>(null);
    const [ajusteForm, setAjusteForm] = useState({
        entrada_1: '',
        saida_1: '',
        entrada_2: '',
        saida_2: '',
        motivo: '',
    });
    const [savingAjuste, setSavingAjuste] = useState(false);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [cols, regPontos] = await Promise.all([
                listarColaboradoresEscritorio(),
                listarPontoMes(mesAno, selectedMemberId),
            ]);
            setColaboradores(cols);
            setPontos(regPontos);
        } catch (error) {
            console.error('Error al cargar datos de control horario:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [mesAno, selectedMemberId]);

    // Mapa de colaboradores
    const colabMap = useMemo(() => {
        const map = new Map<string, ColaboradorEscritorio>();
        colaboradores.forEach(c => map.set(c.id, c));
        return map;
    }, [colaboradores]);

    // Filtragem por status
    const pontosFiltrados = useMemo(() => {
        return pontos.filter(p => {
            if (statusFilter === 'todos') return true;
            return p.status === statusFilter;
        });
    }, [pontos, statusFilter]);

    // Estatísticas
    const stats = useMemo(() => {
        let totalHoras = 0;
        let totalExtrasMin = 0;
        let incompletos = 0;
        pontos.forEach(p => {
            totalHoras += p.horas_trabalhadas || 0;
            totalExtrasMin += p.minutos_extras || 0;
            if (p.status === 'incompleto') incompletos++;
        });

        return {
            totalHoras: Math.round(totalHoras * 10) / 10,
            totalExtrasHoras: Math.round((totalExtrasMin / 60) * 10) / 10,
            incompletos,
            totalRegistros: pontos.length,
        };
    }, [pontos]);

    const abrirAjusteModal = (ponto: RhPontoRegistro) => {
        setPontoParaAjustar(ponto);
        setAjusteForm({
            entrada_1: ponto.entrada_1 || '',
            saida_1: ponto.saida_1 || '',
            entrada_2: ponto.entrada_2 || '',
            saida_2: ponto.saida_2 || '',
            motivo: '',
        });
    };

    const handleSalvarAjuste = async () => {
        if (!pontoParaAjustar || !ajusteForm.motivo.trim()) {
            alert('Por favor, indique la justificación de la rectificación por motivos de auditoría laboral.');
            return;
        }

        try {
            setSavingAjuste(true);
            await ajustarPonto(
                pontoParaAjustar.id,
                pontoParaAjustar.member_id,
                'batidas',
                pontoParaAjustar.batidas?.join(', ') || '',
                `${ajusteForm.entrada_1}-${ajusteForm.saida_1};${ajusteForm.entrada_2}-${ajusteForm.saida_2}`,
                ajusteForm.motivo,
                'RRHH',
                {
                    entrada_1: ajusteForm.entrada_1 || null,
                    saida_1: ajusteForm.saida_1 || null,
                    entrada_2: ajusteForm.entrada_2 || null,
                    saida_2: ajusteForm.saida_2 || null,
                    batidas: [ajusteForm.entrada_1, ajusteForm.saida_1, ajusteForm.entrada_2, ajusteForm.saida_2].filter(Boolean),
                    status: 'ok',
                }
            );

            setPontoParaAjustar(null);
            await carregarDados();
            alert('¡Rectificación guardada con éxito!');
        } catch (error) {
            console.error('Error al guardar rectificación:', error);
            alert('Fallo al guardar la rectificación.');
        } finally {
            setSavingAjuste(false);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                            Control Horario
                        </span>
                        <span className="text-xs text-slate-500">
                            Oficinas Centrales y Talleres
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Control Horario y Fichajes
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Visualización mensual de marcajes, importación de fichajes biométricos y auditoría de rectificaciones.
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
                        onClick={() => setImportModalOpen(true)}
                        className="gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Importar Plantilla de Fichajes
                    </Button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Total Fichajes del Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stats.totalRegistros}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Período: {mesAno}</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Horas Computadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {stats.totalHoras}h
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Horas ordinarias netas</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Horas Extras Acumuladas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            +{stats.totalExtrasHoras}h
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Excedentes de jornada</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Marcajes Incompletos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {stats.incompletos}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Requieren rectificación</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
                        <div>
                            <Input 
                                type="month"
                                value={mesAno}
                                onChange={(e) => setMesAno(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div>
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Todos los Empleados" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos los Empleados</SelectItem>
                                    {colaboradores.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.nombrecompleto} {c.timeclock_code ? `(#${c.timeclock_code})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Filtrar por Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Estado: Todos</SelectItem>
                                    <SelectItem value="ok">Solo Correctos</SelectItem>
                                    <SelectItem value="incompleto">Solo Incompletos</SelectItem>
                                    <SelectItem value="atraso">Solo Retrasos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-end">
                            <Badge variant="outline" className="text-xs py-1.5 px-3 border-slate-300 dark:border-slate-700">
                                {pontosFiltrados.length} Fichajes Mostrados
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla de Fichajes */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Fecha</TableHead>
                                <TableHead className="font-bold text-xs">Empleado</TableHead>
                                <TableHead className="font-bold text-xs">Entrada 1</TableHead>
                                <TableHead className="font-bold text-xs">Salida 1</TableHead>
                                <TableHead className="font-bold text-xs">Entrada 2</TableHead>
                                <TableHead className="font-bold text-xs">Salida 2</TableHead>
                                <TableHead className="font-bold text-xs">Horas Trab.</TableHead>
                                <TableHead className="font-bold text-xs">Saldo / Extras</TableHead>
                                <TableHead className="font-bold text-xs">Origen</TableHead>
                                <TableHead className="font-bold text-xs">Estado</TableHead>
                                <TableHead className="font-bold text-xs text-right">Ajuste</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-32 text-center text-xs text-slate-500">
                                        Cargando informe de control horario...
                                    </TableCell>
                                </TableRow>
                            ) : pontosFiltrados.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-32 text-center text-xs text-slate-500">
                                        No se han encontrado registros con los filtros seleccionados. Haga clic en "Importar Plantilla de Fichajes" para cargar marcajes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pontosFiltrados.map((ponto) => {
                                    const colab = colabMap.get(ponto.member_id);

                                    return (
                                        <TableRow key={ponto.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <TableCell className="font-semibold text-xs text-slate-900 dark:text-white">
                                                {ponto.data}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                                                    {colab?.nombrecompleto || 'Empleado'}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {colab?.department_name || 'General'} {ponto.timeclock_code ? `• ID #${ponto.timeclock_code}` : ''}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{ponto.entrada_1 || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{ponto.saida_1 || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{ponto.entrada_2 || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{ponto.saida_2 || '-'}</TableCell>
                                            <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                                                {ponto.horas_trabalhadas}h
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold">
                                                {ponto.minutos_extras > 0 ? (
                                                    <span className="text-emerald-600">+{ponto.minutos_extras}m</span>
                                                ) : ponto.minutos_saldo < 0 ? (
                                                    <span className="text-rose-600">{ponto.minutos_saldo}m</span>
                                                ) : (
                                                    <span className="text-slate-500">0m</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[10px] capitalize text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {ponto.origem || 'biometrico'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {ponto.status === 'ok' ? (
                                                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">OK</Badge>
                                                ) : (
                                                    <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Incompleto</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => abrirAjusteModal(ponto)}
                                                    className="h-7 w-7 p-0 text-slate-500 hover:text-sky-600"
                                                    title="Rectificar marcaje manualmente"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal Importar Planilha */}
            <ImportarPontoModal 
                open={importModalOpen}
                onOpenChange={setImportModalOpen}
                colaboradores={colaboradores}
                onSuccess={carregarDados}
            />

            {/* Modal Rectificación Manual con Auditoría */}
            <Dialog open={!!pontoParaAjustar} onOpenChange={(open) => !open && setPontoParaAjustar(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Rectificar Marcaje de Control Horario
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Corrija los horarios y registre la justificación obligatoria por motivos de conformidad y auditoría.
                        </DialogDescription>
                    </DialogHeader>

                    {pontoParaAjustar && (
                        <div className="space-y-4 py-2">
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-xs space-y-1">
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                    Empleado: {colabMap.get(pontoParaAjustar.member_id)?.nombrecompleto}
                                </p>
                                <p className="text-slate-500">Fecha: {pontoParaAjustar.data}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold">Entrada 1</Label>
                                    <Input 
                                        placeholder="08:00" 
                                        value={ajusteForm.entrada_1}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, entrada_1: e.target.value })}
                                        className="text-xs mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Salida 1 (Comida)</Label>
                                    <Input 
                                        placeholder="13:00" 
                                        value={ajusteForm.saida_1}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, saida_1: e.target.value })}
                                        className="text-xs mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Entrada 2 (Regreso)</Label>
                                    <Input 
                                        placeholder="14:00" 
                                        value={ajusteForm.entrada_2}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, entrada_2: e.target.value })}
                                        className="text-xs mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Salida 2 (Fin)</Label>
                                    <Input 
                                        placeholder="17:00" 
                                        value={ajusteForm.saida_2}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, saida_2: e.target.value })}
                                        className="text-xs mt-1 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-rose-600">
                                    Justificación de la Rectificación (Obligatoria) *
                                </Label>
                                <Input 
                                    placeholder="Ej: Olvido de fichaje a la salida / Incidencia técnica biométrica" 
                                    value={ajusteForm.motivo}
                                    onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                                    className="text-xs mt-1"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setPontoParaAjustar(null)} className="text-xs">
                            Cancelar
                        </Button>
                        <Button 
                            size="sm" 
                            disabled={savingAjuste}
                            onClick={handleSalvarAjuste}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
                        >
                            {savingAjuste ? 'Guardando...' : 'Guardar Rectificación'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
