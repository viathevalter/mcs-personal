import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, 
    ArrowLeft, 
    Clock, 
    Palmtree, 
    Stethoscope, 
    ShieldCheck, 
    Building2, 
    Mail, 
    Phone, 
    DollarSign, 
    Briefcase, 
    Calendar, 
    FileText, 
    Save, 
    Plus, 
    AlertCircle, 
    CheckCircle2,
    ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    obterColaboradorEscritorio, 
    salvarDadosLaborais, 
    adicionarHistoricoSalarial,
    solicitarFerias,
    registrarAusencia,
    listarPontoMes,
    alternarStatusColaborador
} from '../api/escritorioApi';
import type { 
    ColaboradorEscritorio, 
    RhDadosLaborais, 
    RhHistoricoSalarial, 
    RhFeriasSolicitacao, 
    RhAusencia, 
    RhPontoRegistro 
} from '../types/escritorio';
import { CLASSIFICACOES_COLABORADOR, TIPOS_AUSENCIA } from '../types/escritorio';

export const ColaboradorDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [colaborador, setColaborador] = useState<(ColaboradorEscritorio & {
        historicoSalarial: RhHistoricoSalarial[];
        solicitacoesFerias: RhFeriasSolicitacao[];
        ausencias: RhAusencia[];
        ativosPatrimonio: any[];
    }) | null>(null);

    // Form state dados laborais
    const [formData, setFormData] = useState<Partial<RhDadosLaborais>>({});
    const [timeclockCode, setTimeclockCode] = useState('');
    const [pontos, setPontos] = useState<RhPontoRegistro[]>([]);
    const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));

    // Modal / Mini Forms state
    const [novoSalario, setNovoSalario] = useState({ salario_base: '', motivo: 'Revisión inicial' });
    const [novaAusencia, setNovaAusencia] = useState({ tipo: 'baixa_medica', data_inicio: '', data_fim: '', observacoes: '' });
    const [novaFerias, setNovaFerias] = useState({ data_inicio: '', data_fim: '', observacoes: '' });

    const carregarDados = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await obterColaboradorEscritorio(id);
            setColaborador(data);
            setFormData(data.laboral || {});
            setTimeclockCode(data.timeclock_code || '');

            const pontosMes = await listarPontoMes(mesSelecionado, id);
            setPontos(pontosMes);
        } catch (error) {
            console.error('Error al cargar expediente del empleado:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [id, mesSelecionado]);

    const handleSalvarLaboral = async () => {
        if (!id) return;
        try {
            setSaving(true);
            await salvarDadosLaborais(id, {
                ...formData,
                timeclock_code: timeclockCode || null,
            });
            await carregarDados();
            alert('¡Datos laborales actualizados correctamente!');
        } catch (error) {
            console.error('Error al guardar datos laborales:', error);
            alert('Error al guardar los datos laborales.');
        } finally {
            setSaving(false);
        }
    };

    const handleAdicionarSalario = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novoSalario.salario_base) return;
        try {
            await adicionarHistoricoSalarial({
                member_id: id,
                salario_base: parseFloat(novoSalario.salario_base),
                moeda: 'EUR',
                complementos: 0,
                ajuda_custo: 0,
                transporte: 0,
                alimentacao: 0,
                premio_fixo: 0,
                comissao_fixa: 0,
                outros_valores: 0,
                data_vigencia: new Date().toISOString().slice(0, 10),
                motivo: novoSalario.motivo || 'Actualización salarial',
            });
            setNovoSalario({ salario_base: '', motivo: 'Revisión periódica' });
            await carregarDados();
            alert('¡Nuevo salario registrado correctamente!');
        } catch (error) {
            console.error('Error al guardar salario:', error);
            alert('Error al registrar el historial salarial.');
        }
    };

    const handleSolicitarFerias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novaFerias.data_inicio || !novaFerias.data_fim) return;
        try {
            const dtInicio = new Date(novaFerias.data_inicio);
            const dtFim = new Date(novaFerias.data_fim);
            const diffTime = Math.abs(dtFim.getTime() - dtInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            await solicitarFerias({
                member_id: id,
                ano_exercicio: dtInicio.getFullYear(),
                data_inicio: novaFerias.data_inicio,
                data_fim: novaFerias.data_fim,
                dias_solicitados: diffDays,
                tipo_dias: 'naturais',
                status: 'aprovado',
                observacoes: novaFerias.observacoes || null,
            });

            setNovaFerias({ data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert(`¡Período de vacaciones de ${diffDays} días registrado!`);
        } catch (error) {
            console.error('Error al solicitar vacaciones:', error);
            alert('Error al registrar la solicitud de vacaciones.');
        }
    };

    const handleRegistrarAusencia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !novaAusencia.data_inicio || !novaAusencia.data_fim) return;
        try {
            const dtInicio = new Date(novaAusencia.data_inicio);
            const dtFim = new Date(novaAusencia.data_fim);
            const diffTime = Math.abs(dtFim.getTime() - dtInicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            await registrarAusencia({
                member_id: id,
                tipo: novaAusencia.tipo as any,
                data_inicio: novaAusencia.data_inicio,
                data_fim: novaAusencia.data_fim,
                dias_total: diffDays,
                remunerada: novaAusencia.tipo !== 'falta_injustificada',
                status: 'registrado',
                observacoes: novaAusencia.observacoes || null,
            });

            setNovaAusencia({ tipo: 'baixa_medica', data_inicio: '', data_fim: '', observacoes: '' });
            await carregarDados();
            alert('¡Ausencia / Baja médica registrada con éxito!');
        } catch (error) {
            console.error('Error al registrar ausencia:', error);
            alert('Error al guardar la ausencia.');
        }
    };

    const handleToggleStatus = async () => {
        if (!colaborador) return;
        const novoStatus = !colaborador.active;
        const confirmMsg = novoStatus
            ? `¿Desea reactivar al empleado ${colaborador.nombrecompleto}?`
            : `¿Desea dar de baja / inactivar al empleado ${colaborador.nombrecompleto}?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await alternarStatusColaborador(colaborador.id, novoStatus);
            await carregarDados();
        } catch (error) {
            console.error('Error al alternar estado del empleado:', error);
            alert('Error al actualizar el estado.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-sm font-semibold text-slate-500">
                    Cargando expediente del empleado...
                </div>
            </div>
        );
    }

    if (!colaborador) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-slate-600">Empleado no encontrado.</p>
                <Button onClick={() => navigate('/escritorio/colaboradores')}>
                    Volver al listado
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-16">
            {/* Botón Volver */}
            <div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/escritorio/colaboradores')}
                    className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al Listado de Empleados
                </Button>
            </div>

            {/* Encabezado Perfil 360° */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`h-16 w-16 rounded-2xl ${colaborador.active ? 'bg-gradient-to-br from-sky-600 to-indigo-700' : 'bg-slate-400'} text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0`}>
                            {colaborador.nombrecompleto?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                    {colaborador.nombrecompleto}
                                </h1>
                                <Badge 
                                    onClick={handleToggleStatus}
                                    className={`cursor-pointer transition-colors text-xs font-semibold ${colaborador.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-300'}`}
                                    title="Haga clic para alternar entre Activo e Inactivo"
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${colaborador.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {colaborador.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                                {colaborador.timeclock_code ? (
                                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 font-mono text-xs gap-1">
                                        <Clock className="h-3 w-3" />
                                        ID Control Horario: {colaborador.timeclock_code}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                                        Sin ID de Fichaje
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                    {colaborador.department_name} • {colaborador.empresa_nome}
                                </span>
                                {colaborador.correoempresarial && (
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                        {colaborador.correoempresarial}
                                    </span>
                                )}
                                {colaborador.telefonodirecto && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                                        {colaborador.telefonodirecto}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resumen Rápido Lateral y Botón de Estado */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleToggleStatus}
                            className={`h-9 text-xs font-semibold ${colaborador.active ? 'text-slate-600 hover:text-rose-600 border-slate-200 hover:bg-rose-50' : 'text-emerald-600 hover:text-emerald-700 border-emerald-300 bg-emerald-50/50'}`}
                        >
                            {colaborador.active ? 'Dar de Baja / Inactivar' : 'Reactivar Empleado'}
                        </Button>
                        <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-800 hidden sm:block">
                            <p className="text-[11px] text-slate-400 font-medium">Saldo Vacaciones Anual</p>
                            <p className="text-lg font-bold text-emerald-600">
                                {colaborador.ferias_saldo?.dias_saldo ?? 30} días
                            </p>
                        </div>
                        <div className="text-right border-l pl-4 border-slate-200 dark:border-slate-800 hidden sm:block">
                            <p className="text-[11px] text-slate-400 font-medium">Activos Asignados</p>
                            <p className="text-lg font-bold text-sky-600">
                                {colaborador.ativosPatrimonio.length} equipos
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pestañas del Expediente 360° */}
            <Tabs defaultValue="laboral" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl w-full justify-start overflow-x-auto h-auto">
                    <TabsTrigger value="laboral" className="text-xs font-semibold gap-1.5 py-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Expediente Laboral y Contrato
                    </TabsTrigger>
                    <TabsTrigger value="ponto" className="text-xs font-semibold gap-1.5 py-2">
                        <Clock className="h-3.5 w-3.5" />
                        Control Horario y Fichajes
                    </TabsTrigger>
                    <TabsTrigger value="ferias" className="text-xs font-semibold gap-1.5 py-2">
                        <Palmtree className="h-3.5 w-3.5" />
                        Vacaciones (España)
                    </TabsTrigger>
                    <TabsTrigger value="ausencias" className="text-xs font-semibold gap-1.5 py-2">
                        <Stethoscope className="h-3.5 w-3.5" />
                        Ausencias y Bajas
                    </TabsTrigger>
                    <TabsTrigger value="remuneracao" className="text-xs font-semibold gap-1.5 py-2">
                        <DollarSign className="h-3.5 w-3.5" />
                        Retribución y Salario
                    </TabsTrigger>
                    <TabsTrigger value="patrimonio" className="text-xs font-semibold gap-1.5 py-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Activos Asignados ({colaborador.ativosPatrimonio.length})
                    </TabsTrigger>
                </TabsList>

                {/* PESTAÑA 1: EXPEDIENTE LABORAL */}
                <TabsContent value="laboral" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Datos Contractuales y Laborales
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Información de encuadramiento, jornada y código de integración con el reloj de control horario.
                                </p>
                            </div>
                            <Button 
                                onClick={handleSalvarLaboral}
                                disabled={saving}
                                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold gap-2 shadow-sm"
                                size="sm"
                            >
                                <Save className="h-3.5 w-3.5" />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Código Control Horario (timeclock_code)</Label>
                                    <Input 
                                        placeholder="Ej: 1, 2, 3..." 
                                        value={timeclockCode}
                                        onChange={(e) => setTimeclockCode(e.target.value)}
                                        className="text-xs mt-1 font-mono font-bold"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Número de identificación en el dispositivo biométrico / plantilla.
                                    </p>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Puesto / Cargo</Label>
                                    <Input 
                                        placeholder="Ej: Asistente Administrativo/a" 
                                        value={formData.cargo || ''}
                                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Clasificación Profesional</Label>
                                    <Select 
                                        value={formData.classificacao || 'Administrativo / Oficina'} 
                                        onValueChange={(val) => setFormData({ ...formData, classificacao: val })}
                                    >
                                        <SelectTrigger className="text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLASSIFICACOES_COLABORADOR.map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Modalidad de Contrato</Label>
                                    <Select 
                                        value={formData.tipo_contrato || 'Indefinido'} 
                                        onValueChange={(val) => setFormData({ ...formData, tipo_contrato: val })}
                                    >
                                        <SelectTrigger className="text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Indefinido">Indefinido Ordinario</SelectItem>
                                            <SelectItem value="Temporal / Por Circunstancias">Temporal / Por Circunstancias</SelectItem>
                                            <SelectItem value="Prácticas / Formación">Prácticas / Formación</SelectItem>
                                            <SelectItem value="Fijo Discontinuo">Fijo Discontinuo</SelectItem>
                                            <SelectItem value="Obra o Servicio">Obra o Servicio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Fecha de Alta / Antigüedad</Label>
                                    <Input 
                                        type="date"
                                        value={formData.data_admissao || ''}
                                        onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Jornada Semanal (Horas)</Label>
                                    <Input 
                                        type="number"
                                        value={formData.jornada_semanal_horas || 40}
                                        onChange={(e) => setFormData({ ...formData, jornada_semanal_horas: parseInt(e.target.value, 10) })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Horario Habitual</Label>
                                    <Input 
                                        placeholder="Ej: 08:00 - 13:00 / 14:00 - 17:00" 
                                        value={formData.horario_trabalho || '08:00 - 17:00'}
                                        onChange={(e) => setFormData({ ...formData, horario_trabalho: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Centro de Trabajo</Label>
                                    <Input 
                                        placeholder="Ej: Oficina Central Madrid / Taller" 
                                        value={formData.local_trabalho || colaborador.ubicaciontrabajo || ''}
                                        onChange={(e) => setFormData({ ...formData, local_trabalho: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Convenio Colectivo de Aplicación</Label>
                                    <Input 
                                        placeholder="Ej: Metalurgia / Oficinas y Despachos" 
                                        value={formData.convencao_coletiva || 'Convenio Colectivo General'}
                                        onChange={(e) => setFormData({ ...formData, convencao_coletiva: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PESTAÑA 2: CONTROL HORARIO Y FICHAJES */}
                <TabsContent value="ponto" className="mt-4 space-y-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Informe Individual de Fichajes
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Marcajes de entrada/salida y horas computadas en el período seleccionado.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="month"
                                    value={mesSelecionado}
                                    onChange={(e) => setMesSelecionado(e.target.value)}
                                    className="w-40 text-xs"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Fecha</TableHead>
                                        <TableHead className="font-bold text-xs">Marcajes Registrados</TableHead>
                                        <TableHead className="font-bold text-xs">Entrada 1</TableHead>
                                        <TableHead className="font-bold text-xs">Salida 1</TableHead>
                                        <TableHead className="font-bold text-xs">Entrada 2</TableHead>
                                        <TableHead className="font-bold text-xs">Salida 2</TableHead>
                                        <TableHead className="font-bold text-xs">Horas Trabajadas</TableHead>
                                        <TableHead className="font-bold text-xs">Saldo / Extras</TableHead>
                                        <TableHead className="font-bold text-xs">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pontos.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-28 text-center text-xs text-slate-500">
                                                No se han encontrado registros de control horario para {mesSelecionado}.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pontos.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-semibold text-xs">{p.data}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap font-mono text-[11px]">
                                                        {p.batidas?.map((b, i) => (
                                                            <span key={i} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                {b}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{p.entrada_1 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.saida_1 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.entrada_2 || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.saida_2 || '-'}</TableCell>
                                                <TableCell className="font-bold text-xs">{p.horas_trabalhadas}h</TableCell>
                                                <TableCell className="text-xs font-semibold text-sky-600">
                                                    {p.minutos_extras > 0 ? `+${p.minutos_extras}m` : `${p.minutos_saldo}m`}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PESTAÑA 3: VACACIONES */}
                <TabsContent value="ferias" className="mt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Derecho Anual (España)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {colaborador.ferias_saldo?.dias_direito ?? 30} días
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Estatuto de los Trabajadores (30 naturales)</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Días Disfrutados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-sky-600">
                                    {colaborador.ferias_saldo?.dias_gozados ?? 0} días
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Utilizados en el año actual</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-slate-500">Saldo Disponible</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {colaborador.ferias_saldo?.dias_saldo ?? 30} días
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">Disponibles para solicitar</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Formulario Registro de Vacaciones */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Registrar Período de Vacaciones Fraccionadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSolicitarFerias} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Fecha de Inicio</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaFerias.data_inicio}
                                        onChange={(e) => setNovaFerias({ ...novaFerias, data_inicio: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fecha de Fin</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaFerias.data_fim}
                                        onChange={(e) => setNovaFerias({ ...novaFerias, data_fim: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                                        Registrar Vacaciones
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabla de Vacaciones */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Historial de Vacaciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Período</TableHead>
                                        <TableHead className="font-bold text-xs">Días</TableHead>
                                        <TableHead className="font-bold text-xs">Tipo</TableHead>
                                        <TableHead className="font-bold text-xs">Estado</TableHead>
                                        <TableHead className="font-bold text-xs">Observaciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.solicitacoesFerias.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                                                No hay períodos de vacaciones registrados.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.solicitacoesFerias.map(sol => (
                                            <TableRow key={sol.id}>
                                                <TableCell className="text-xs font-semibold">
                                                    {sol.data_inicio} hasta {sol.data_fim}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">{sol.dias_solicitados} días</TableCell>
                                                <TableCell className="text-xs capitalize">{sol.tipo_dias}</TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {sol.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{sol.observacoes || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PESTAÑA 4: AUSENCIAS Y BAJAS */}
                <TabsContent value="ausencias" className="mt-4 space-y-6">
                    {/* Formulario Registro de Ausencia */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Registrar Ausencia / Baja Médica (Estatuto Trabajadores)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRegistrarAusencia} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Tipo de Ausencia</Label>
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
                                <div>
                                    <Label className="text-xs font-semibold">Fecha de Inicio</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaAusencia.data_inicio}
                                        onChange={(e) => setNovaAusencia({ ...novaAusencia, data_inicio: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fecha de Fin</Label>
                                    <Input 
                                        type="date"
                                        required
                                        value={novaAusencia.data_fim}
                                        onChange={(e) => setNovaAusencia({ ...novaAusencia, data_fim: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold">
                                        Registrar Ausencia
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Tabla de Ausencias */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Historial de Ausencias y Bajas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Tipo</TableHead>
                                        <TableHead className="font-bold text-xs">Período</TableHead>
                                        <TableHead className="font-bold text-xs">Días</TableHead>
                                        <TableHead className="font-bold text-xs">Retribuida</TableHead>
                                        <TableHead className="font-bold text-xs">Observaciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.ausencias.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-20 text-center text-xs text-slate-500">
                                                No hay ausencias registradas para este empleado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.ausencias.map(aus => (
                                            <TableRow key={aus.id}>
                                                <TableCell className="text-xs font-semibold">
                                                    {TIPOS_AUSENCIA.find(t => t.id === aus.tipo)?.label || aus.tipo}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {aus.data_inicio} hasta {aus.data_fim}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">{aus.dias_total} días</TableCell>
                                                <TableCell>
                                                    {aus.remunerada ? (
                                                        <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Sí</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">Descuento</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{aus.observacoes || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PESTAÑA 5: RETRIBUCIÓN Y SALARIO */}
                <TabsContent value="remuneracao" className="mt-4 space-y-6">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Actualizar Salario Base
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdicionarSalario} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                    <Label className="text-xs font-semibold">Salario Base Mensual (€)</Label>
                                    <Input 
                                        type="number"
                                        step="0.01"
                                        placeholder="Ej: 2150.00"
                                        required
                                        value={novoSalario.salario_base}
                                        onChange={(e) => setNovoSalario({ ...novoSalario, salario_base: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Motivo de la Modificación</Label>
                                    <Input 
                                        placeholder="Ej: Revisión anual, ascenso..."
                                        value={novoSalario.motivo}
                                        onChange={(e) => setNovoSalario({ ...novoSalario, motivo: e.target.value })}
                                        className="text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold">
                                        Registrar Nuevo Salario
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Historial Salarial
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Vigencia</TableHead>
                                        <TableHead className="font-bold text-xs">Salario Base</TableHead>
                                        <TableHead className="font-bold text-xs">Motivo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.historicoSalarial.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-20 text-center text-xs text-slate-500">
                                                No hay historial salarial registrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.historicoSalarial.map(sal => (
                                            <TableRow key={sal.id}>
                                                <TableCell className="text-xs font-semibold">{sal.data_vigencia}</TableCell>
                                                <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                                                    € {sal.salario_base.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{sal.motivo}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PESTAÑA 6: ACTIVOS Y PATRIMONIO */}
                <TabsContent value="patrimonio" className="mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                    Equipos y Activos Asignados
                                </CardTitle>
                                <p className="text-xs text-slate-500">
                                    Portátiles, teléfonos móviles, monitores y herramientas asignados a este empleado.
                                </p>
                            </div>
                            <Button 
                                onClick={() => navigate('/escritorio/patrimonio')}
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold gap-1.5"
                            >
                                Gestionar en Módulo de Activos
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                        <TableHead className="font-bold text-xs">Código</TableHead>
                                        <TableHead className="font-bold text-xs">Descripción / Modelo</TableHead>
                                        <TableHead className="font-bold text-xs">Categoría</TableHead>
                                        <TableHead className="font-bold text-xs">N.º Serie</TableHead>
                                        <TableHead className="font-bold text-xs">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {colaborador.ativosPatrimonio.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-28 text-center text-xs text-slate-500">
                                                No hay activos asignados actualmente a este empleado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        colaborador.ativosPatrimonio.map((ativo: any) => (
                                            <TableRow 
                                                key={ativo.id}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                onClick={() => navigate(`/escritorio/patrimonio/${ativo.codigo_patrimonial}`)}
                                            >
                                                <TableCell className="font-mono font-bold text-xs text-sky-600">
                                                    {ativo.codigo_patrimonial}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-900 dark:text-white">
                                                    {ativo.nome} {ativo.modelo ? `- ${ativo.modelo}` : ''}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 capitalize">
                                                    {ativo.categoria}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-slate-400">
                                                    {ativo.numero_serie || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                                                        {ativo.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
