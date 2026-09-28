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
                listarColaboradoresEscritorio(),
                listarPontoMes(competencia),
                listarFerias(parseInt(competencia.slice(0, 4), 10)),
                listarAusencias(),
                obterOuCriarPreFolha(competencia),
            ]);

            setPreFolha(pfData.preFolha);

            // Consolidação dos dados por colaborador
            const dadosConsolidados: LinhaPreFolhaConsolidada[] = cols.map(c => {
                // Horas e extras do ponto no mês
                const pontosDoColab = pontos.filter(p => p.member_id === c.id);
                const horasTrabalhadas = pontosDoColab.reduce((acc, p) => acc + (p.horas_trabalhadas || 0), 0);
                const minutosExtras = pontosDoColab.reduce((acc, p) => acc + (p.minutos_extras || 0), 0);
                const horasExtras = Math.round((minutosExtras / 60) * 10) / 10;

                // Férias no mês
                const feriasDoColab = ferias.filter(f => f.member_id === c.id && f.data_inicio.startsWith(competencia));
                const diasFerias = feriasDoColab.reduce((acc, f) => acc + (f.dias_solicitados || 0), 0);

                // Ausências e Baixas no mês
                const ausDoColab = ausencias.filter(a => a.member_id === c.id && a.data_inicio.startsWith(competencia));
                const diasBaixa = ausDoColab.filter(a => a.tipo === 'baixa_medica').reduce((acc, a) => acc + (a.dias_total || 0), 0);
                const diasFalta = ausDoColab.filter(a => a.tipo === 'falta_injustificada').reduce((acc, a) => acc + (a.dias_total || 0), 0);

                return {
                    memberId: c.id,
                    nome: c.nombrecompleto,
                    departamento: c.department_name || 'Geral',
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
            console.error('Erro ao carregar pré-folha:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarDados();
    }, [competencia]);

    // Totais gerais
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

    // Exportação Excel para Contabilidade
    const exportarExcelContabilidade = () => {
        const dadosExport = linhas.map((l, idx) => ({
            'Item': idx + 1,
            'Colaborador': l.nome,
            'Departamento': l.departamento,
            'Empresa Contratante': l.empresa,
            'Salário Base Mensal (€)': l.salarioBase,
            'Horas Trabalhadas (Ponto)': l.horasTrabalhadas,
            'Horas Extras (50%)': l.horasExtras,
            'Dias de Férias': l.diasFerias,
            'Dias Baixa Médica (IT)': l.diasBaixa,
            'Dias Faltas Injustificadas': l.diasFalta,
            'Prêmios / Bônus (€)': l.premios,
            'Ajuda Custo / Deslocamento (€)': l.ajudaCusto,
        }));

        const ws = XLSX.utils.json_to_sheet(dadosExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `PreFolha_${competencia}`);

        XLSX.writeFile(wb, `MCS_PreFolha_Contabilidade_${competencia}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                            Fechamento Mensal
                        </span>
                        <span className="text-xs text-slate-500">
                            Assessoria Laboral & Contabilidade
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                        Pré-Folha de Pagamento
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Consolidação de horas de relógio ponto, extras, dias de férias e baixas médicas para envio mensal.
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
                        Atualizar
                    </Button>
                    <Button 
                        onClick={exportarExcelContabilidade}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                        size="sm"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exportar Planilha Contabilidade
                    </Button>
                </div>
            </div>

            {/* KPIs Consolidados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Colaboradores na Folha</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totais.totalFuncionarios}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Escritórios & Oficinas</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Total Horas Trabalhadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">
                            {totais.totalHoras}h
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Horas regulares registradas</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Horas Extras Totais</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            +{totais.totalExtras}h
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Para remuneração variável</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Dias de Férias no Mês</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {totais.totalFerias} dias
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Gozados no período</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-500">Dias Baixa Médica (IT)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600">
                            {totais.totalBaixas} dias
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Comunicação contábil</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Consolidação */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Itens Consolidados da Competência ({competencia})
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                            Resumo individualizado por colaborador pronto para transmissão contábil.
                        </p>
                    </div>
                    <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs">
                        Status: Em Preparação
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-900/50">
                                <TableHead className="font-bold text-xs">Colaborador</TableHead>
                                <TableHead className="font-bold text-xs">Departamento</TableHead>
                                <TableHead className="font-bold text-xs">Empresa</TableHead>
                                <TableHead className="font-bold text-xs text-right">Salário Base</TableHead>
                                <TableHead className="font-bold text-xs text-center">Horas Reg.</TableHead>
                                <TableHead className="font-bold text-xs text-center">Horas Extras</TableHead>
                                <TableHead className="font-bold text-xs text-center">Férias (dias)</TableHead>
                                <TableHead className="font-bold text-xs text-center">Baixas (IT)</TableHead>
                                <TableHead className="font-bold text-xs text-center">Faltas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                        Consolidando pré-folha...
                                    </TableCell>
                                </TableRow>
                            ) : linhas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                        Nenhum registro para esta competência.
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
                                                ? `€ ${linha.salarioBase.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` 
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
