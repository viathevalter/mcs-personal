import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    Clock, 
    Palmtree, 
    Stethoscope, 
    ShieldCheck, 
    FileSpreadsheet, 
    Upload, 
    Calendar,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    Building2,
    RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listarColaboradoresEscritorio, listarFerias, listarAusencias, listarPontoMes } from '../api/escritorioApi';
import type { ColaboradorEscritorio, RhFeriasSolicitacao, RhAusencia, RhPontoRegistro } from '../types/escritorio';

export const EscritorioDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [colaboradores, setColaboradores] = useState<ColaboradorEscritorio[]>([]);
    const [ferias, setFerias] = useState<RhFeriasSolicitacao[]>([]);
    const [ausencias, setAusencias] = useState<RhAusencia[]>([]);
    const [pontosHoje, setPontosHoje] = useState<RhPontoRegistro[]>([]);

    const hojeStr = new Date().toISOString().slice(0, 10);
    const mesAtualStr = hojeStr.slice(0, 7);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [cols, feriasList, ausenciasList, pontosList] = await Promise.all([
                listarColaboradoresEscritorio(),
                listarFerias(new Date().getFullYear()),
                listarAusencias(),
                listarPontoMes(mesAtualStr),
            ]);

            setColaboradores(cols);
            setFerias(feriasList);
            setAusencias(ausenciasList);
            setPontosHoje(pontosList.filter(p => p.data === hojeStr));
        } catch (err) {
            console.error('Error al cargar dashboard corporativo:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, []);

    // Estadísticas calculadas
    const totalAtivos = colaboradores.filter(c => c.active).length;
    const totalComRelogio = colaboradores.filter(c => c.active && c.timeclock_code).length;
    const totalPatrimonios = colaboradores.reduce((acc, c) => acc + (c.ativos_patrimonio_count || 0), 0);
    const feriasAtivas = ferias.filter(f => f.status === 'aprovado' || f.status === 'solicitado').length;
    const baixasMedicas = ausencias.filter(a => a.tipo === 'baixa_medica').length;

    // Departamentos agrupados (empleados activos)
    const departamentosMap: Record<string, number> = {};
    colaboradores.filter(c => c.active).forEach(c => {
        const dep = c.department_name || 'Sin Departamento';
        departamentosMap[dep] = (departamentosMap[dep] || 0) + 1;
    });

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                            Gestión Corporativa
                        </span>
                        <span className="text-xs text-slate-500">
                            España y Portugal
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        RRHH Oficinas, Talleres y Patrimonio
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Panel central de empleados internos, control horario biométrico, vacaciones y gestión de activos.
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
                        onClick={() => navigate('/escritorio/ponto')}
                        className="gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Importar Fichajes
                    </Button>
                    <Button 
                        variant="default"
                        onClick={() => navigate('/escritorio/ferias')}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Palmtree className="h-3.5 w-3.5" />
                        Gestionar Vacaciones
                    </Button>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card 
                    className="hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer shadow-sm"
                    onClick={() => navigate('/escritorio/colaboradores')}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Empleados Activos
                        </CardTitle>
                        <Users className="h-4 w-4 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totalAtivos}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <span className="text-sky-600 font-semibold">{totalComRelogio}</span> vinculados al control horario
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className="hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer shadow-sm"
                    onClick={() => navigate('/escritorio/ponto')}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Fichajes de Hoy
                        </CardTitle>
                        <Clock className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {pontosHoje.length}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Fecha: {new Date().toLocaleDateString('es-ES')}
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className="hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer shadow-sm"
                    onClick={() => navigate('/escritorio/ferias')}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Vacaciones / Solicitudes
                        </CardTitle>
                        <Palmtree className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {feriasAtivas}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Estatuto Trabajadores (30 días)
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className="hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer shadow-sm"
                    onClick={() => navigate('/escritorio/ausencias')}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Bajas Médicas (IT)
                        </CardTitle>
                        <Stethoscope className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {baixasMedicas}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Total general: {ausencias.length} registros
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className="hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer shadow-sm"
                    onClick={() => navigate('/escritorio/patrimonio')}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Activos en Uso
                        </CardTitle>
                        <ShieldCheck className="h-4 w-4 text-cyan-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totalPatrimonios}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Equipos asignados a empleados
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Dos Columnas: Empleados por Departamento y Acciones Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Empleados por Departamento */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                Equipo Interno por Departamento
                            </CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {totalAtivos} profesionales activos en oficinas centrales y talleres
                            </p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/escritorio/colaboradores')}
                            className="text-xs text-sky-600 hover:text-sky-700 font-semibold gap-1"
                        >
                            Ver Todos
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(departamentosMap).map(([dep, count]) => (
                                <div 
                                    key={dep}
                                    onClick={() => navigate(`/escritorio/colaboradores?departamento=${encodeURIComponent(dep)}`)}
                                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                                {dep}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Empleados asignados
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700">
                                        {count}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Pre-Nómina y Accesos Rápidos */}
                <div className="space-y-6">
                    {/* Pre-Nómina Card */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <Badge className="bg-sky-500 text-white text-[10px] font-bold border-0">
                                    Asesoría Laboral
                                </Badge>
                                <FileSpreadsheet className="h-5 w-5 text-sky-400" />
                            </div>
                            <CardTitle className="text-base font-bold text-white mt-2">
                                Pre-Nómina Mensual
                            </CardTitle>
                            <p className="text-xs text-slate-300">
                                Período: {mesAtualStr}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-300">
                                Cierre consolidado de horas ordinarias, extras, días de vacaciones y bajas médicas para envío directo a la asesoría laboral.
                            </p>
                            <Button 
                                onClick={() => navigate('/escritorio/pre-folha')}
                                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow"
                                size="sm"
                            >
                                Abrir Pre-Nómina del Mes
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Accesos Rápidos */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                                Accesos Rápidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <button
                                onClick={() => navigate('/escritorio/ponto')}
                                className="w-full text-left p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                                <span className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-sky-600" />
                                    Control Horario e Importación
                                </span>
                                <ArrowUpRight className="h-3 w-3 text-slate-400" />
                            </button>

                            <button
                                onClick={() => navigate('/escritorio/ferias')}
                                className="w-full text-left p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                                <span className="flex items-center gap-2">
                                    <Palmtree className="h-4 w-4 text-emerald-600" />
                                    Calendario Anual de Vacaciones
                                </span>
                                <ArrowUpRight className="h-3 w-3 text-slate-400" />
                            </button>

                            <button
                                onClick={() => navigate('/escritorio/patrimonio')}
                                className="w-full text-left p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-cyan-600" />
                                    Gestión de Activos y Patrimonio
                                </span>
                                <ArrowUpRight className="h-3 w-3 text-slate-400" />
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
