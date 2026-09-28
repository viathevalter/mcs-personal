import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    FileSpreadsheet, 
    Download, 
    CheckCircle2, 
    Clock, 
    Palmtree, 
    Stethoscope, 
    DollarSign, 
    Send, 
    Building2,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { 
    listarColaboradoresEscritorio, 
    listarPontoMes, 
    listarFerias, 
    listarAusencias,
    obterOuCriarPreFolha 
} from '../api/escritorioApi';
import type { 
    ColaboradorEscritorio, 
    RhPontoRegistro, 
    RhFeriasSolicitacao, 
    RhAusencia, 
    RhPreFolha 
} from '../types/escritorio';

interface LinhaPreFolhaConsolidada {
    memberId: string;
    nome: string;
    departamento: string;
    empresa: string;
    salarioBase: number;
    horasTrabalhadas: number;
    horasExtras: number;
    diasFerias: number;
    diasBaixa: number;
    diasFalta: number;
    ajudaCusto: number;
    premios: number;
}

export const PreFolhaPage: React.FC = () => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const [competencia, setCompetencia] = useState(hojeStr.slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [preFolha, setPreFolha] = useState<RhPreFolha | null>(null);
    const [linhas, setLinhas] = useState<LinhaPreFolhaConsolidada[]>([]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [cols, pontos, ferias, ausencias, pfData] = await Promise.all([
                listarColaboradoresEscritorio({ apenasAtivos: true }),
                listarPontoMes(competencia),
                listarFerias(parseInt(competencia.slice(0, 4), 10)),
                listarAusencias(),
                obterOuCriarPreFolha(competencia),
            ]);

            setPreFolha(pfData.preFolha);

            // Consolidación de datos por empleado
            const dadosConsolidados: LinhaPreFolhaConsolidada[] = cols.map(c => {
                const pontosDoColab = pontos.filter(p => p.member_id === c.id);
                const horasTrabalhadas = pontosDoColab.reduce((acc, p) => acc + (p.horas_trabalhadas || 0), 0);
                const minutosExtras = pontosDoColab.reduce((acc, p) => acc + (p.minutos_extras || 0), 0);
                const horasExtras = Math.round((minutosExtras / 60) * 10) / 10;

                const feriasDoColab = ferias.filter(f => f.member_id === c.id && f.data_inicio.startsWith(competencia));
                const diasFerias = feriasDoColab.reduce((acc, f) => acc + (f.dias_solicitados || 0), 0);

                const ausDoColab = ausencias.filter(a => a.member_id === c.id && a.data_inicio.startsWith(competencia));
                const diasBaixa = ausDoColab.filter(a => a.tipo === 'baixa_medica').reduce((acc, a) => acc + (a.dias_total || 0), 0);
                const diasFalta = ausDoColab.filter(a => a.tipo === 'falta_injustificada').reduce((acc, a) => acc + (a.dias_total || 0), 0);

                return {
                    memberId: c.id,
                    nome: c.nombrecompleto,
                    departamento: c.department_name || 'General',
                    empresa: c.empresa_nome || 'KR Industrial',
                    salarioBase: c.salario_vigente || 0,
                    horasTrabalhadas: Math.round(horasTrabalhadas * 10) / 10,
                    horasExtras,
                    diasFerias,
                    diasBaixa,
                    diasFalta,
                    ajudaCusto: 0,
                    premios: 0,
                };
            });

            setLinhas(dadosConsolidados);
        } catch (error) {
            console.error('Error al cargar pre-nómina:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [competencia]);

    // Totales generales
    const totais = useMemo(() => {
        let salarios = 0;
        let horas = 0;
        let extras = 0;
        let ferias = 0;
        let baixas = 0;

        linhas.forEach(l => {
            salarios += l.salarioBase;
            horas += l.horasTrabalhadas;
            extras += l.horasExtras;
            ferias += l.diasFerias;
            baixas += l.diasBaixa;
        });

        return {
            totalFuncionarios: linhas.length,
            totalSalarios: salarios,
            totalHoras: Math.round(horas),
            totalExtras: Math.round(extras),
            totalFerias: ferias,
            totalBaixas: baixas,
        };
    }, [linhas]);

    // Exportación Excel para la Asesoría
    const exportarExcelContabilidade = () => {
        const dadosExport = linhas.map((l, idx) => ({
            'N.º': idx + 1,
            'Empleado': l.nome,
            'Departamento': l.departamento,
            'Empresa Contratante': l.empresa,
            'Salario Base Mensual (€)': l.salarioBase,
            'Horas Ordinarias (Fichajes)': l.horasTrabalhadas,
            'Horas Extras': l.horasExtras,
            'Días de Vacaciones': l.diasFerias,
            'Días Baja Médica (IT)': l.diasBaixa,
            'Días Faltas Injustificadas': l.diasFalta,
            'Primas / Bonificaciones (€)': l.premios,
            'Dietas / Desplazamientos (€)': l.ajudaCusto,
        }));

        const ws = XLSX.utils.json_to_sheet(dadosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `PreNomina_${competencia}`);

        XLSX.writeFile(wb, `MCS_PreNomina_Asesoria_${competencia}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                            Cierre Mensual
                        </span>
                        <span className="text-xs text-slate-500">
                            Asesoría Laboral y Contabilidad
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Pre-Nómina y Cierre Mensual
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Consolidación de horas de control horario, horas extras, días de vacaciones y bajas médicas para el envío a la asesoría.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <Input 
                        type="month"
                        value={competencia}
                        onChange={(e) => setCompetencia(e.target.value)}
                        className="w-40 text-xs"
                    />
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
                        onClick={exportarExcelContabilidade}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exportar Plantilla Asesoría
                    </Button>
                </div>
            </div>

            {/* KPIs Consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Empleados en Nómina</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totais.totalFuncionarios}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Oficinas y Talleres</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Horas Trabajadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {totais.totalHoras}h
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Horas ordinarias netas</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Horas Extras Totales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            +{totais.totalExtras}h
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Para retribución variable</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Días de Vacaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {totais.totalFerias} días
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Disfrutados en el período</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Días Baja Médica (IT)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            {totais.totalBaixas} días
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Comunicación asesoría</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de Consolidación */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Partidas Consolidadas del Período ({competencia})
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                            Resumen individualizado por empleado listo para transmisión a la asesoría laboral.
                        </p>
                    </div>
                    <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs">
                        Estado: En Preparación
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Empleado</TableHead>
                                <TableHead className="font-bold text-xs">Departamento</TableHead>
                                <TableHead className="font-bold text-xs">Empresa</TableHead>
                                <TableHead className="font-bold text-xs text-right">Salario Base</TableHead>
                                <TableHead className="font-bold text-xs text-center">Horas Ord.</TableHead>
                                <TableHead className="font-bold text-xs text-center">Horas Extras</TableHead>
                                <TableHead className="font-bold text-xs text-center">Vacaciones (días)</TableHead>
                                <TableHead className="font-bold text-xs text-center">Bajas (IT)</TableHead>
                                <TableHead className="font-bold text-xs text-center">Faltas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                        Consolidando pre-nómina...
                                    </TableCell>
                                </TableRow>
                            ) : linhas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                        No hay registros para este período.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                linhas.map((linha) => (
                                    <TableRow key={linha.memberId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                                            {linha.nome}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                            {linha.departamento}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {linha.empresa}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold">
                                            {linha.salarioBase > 0 
                                                ? `€ ${linha.salarioBase.toLocaleString('es-ES', { minimumFractionDigits: 2 })}` 
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xs text-sky-600">
                                            {linha.horasTrabalhadas}h
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xs text-emerald-600">
                                            {linha.horasExtras > 0 ? `+${linha.horasExtras}h` : '0h'}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-semibold">
                                            {linha.diasFerias > 0 ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                                    {linha.diasFerias}d
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-semibold">
                                            {linha.diasBaixa > 0 ? (
                                                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                                    {linha.diasBaixa}d
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center text-xs font-semibold">
                                            {linha.diasFalta > 0 ? (
                                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                                    {linha.diasFalta}d
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
