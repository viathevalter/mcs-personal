import React, { useState } from 'react';
import { FileText, Download, Printer, Eye, Building2, ShieldCheck, FileSpreadsheet, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import type { Worker } from '@/shared/types/corePersonal';
import type { HoleriteEvento } from '@/shared/types/holerites';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useTaxRules } from '@/features/taxes/hooks';
import {
    calculateHoleriteAlta,
    calculateHoleriteRegularizacao,
    type HoleriteAltaCalculado,
    type HoleriteRegularizacaoCalculado
} from '../utils/holeriteEngine';
import {
    generateHoleriteAltaPdf,
    generateHoleriteRegularizacaoPdf
} from '../utils/pdfGenerator';
import { toast } from 'sonner';

interface PreviewHoleriteDialogProps {
    worker: Worker & { worker_beneficios_settings?: any };
    mesReferencia: string;
    eventosMensais?: HoleriteEvento[];
    fallbackHours?: number;
    workerMonthlyActivity?: { contratante?: string; cliente_nombre?: string };
    housingBenefitAmount?: number;
    extraDiscounts?: any[];
    trigger?: React.ReactNode;
}

export function PreviewHoleriteDialog({
    worker,
    mesReferencia,
    eventosMensais = [],
    fallbackHours = 0,
    workerMonthlyActivity,
    housingBenefitAmount = 0,
    extraDiscounts = [],
    trigger
}: PreviewHoleriteDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'recibo' | 'detalhes'>('recibo');
    const { empresas } = useEmpresa();
    const { data: taxRules } = useTaxRules();

    const ssTrabalhadorRule = taxRules?.find(r => r.tax_type === 'SS_TRABALHADOR' && r.is_active);
    const customParams = React.useMemo(() => {
        if (ssTrabalhadorRule && ssTrabalhadorRule.rate_percentage !== null && ssTrabalhadorRule.rate_percentage !== undefined) {
            return { ssTaxaTrabalhador: Number(ssTrabalhadorRule.rate_percentage) / 100 };
        }
        return {};
    }, [ssTrabalhadorRule]);

    // Determina se o trabalhador é de ALTA ou EM REGULARIZAÇÃO
    const statusSeguridad = (worker.status_seguridad || '').toLowerCase();
    const isAlta = statusSeguridad.includes('alta') || (!statusSeguridad.includes('regulariz') && !statusSeguridad.includes('baja') && !statusSeguridad.includes('inativ'));

    // 1. Extração das Horas
    const totalHorasEvento = eventosMensais.find(e => e.categoria === 'total_horas');
    const horasTrabalhadas = Number(
        totalHorasEvento?.horas_referencia ||
        totalHorasEvento?.referencia_dias_horas ||
        fallbackHours ||
        0
    );

    // 2. Tarifa Hora
    const tarifaHora = Number(worker.worker_beneficios_settings?.tarifa_hora || 0);

    // 3. Proventos avulsos
    const proventosAvulsos = eventosMensais
        .filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas')
        .reduce((acc, curr) => acc + Number(curr.valor || 0), 0);

    // 4. Descontos (combina lançamentos de eventos e descontos cadastrados no mês)
    const descontosList = [
        ...(eventosMensais.filter(e => e.tipo === 'desconto') || []),
        ...(extraDiscounts || [])
    ];

    // Executa os motores de cálculo
    const altaData: HoleriteAltaCalculado | null = isAlta ? calculateHoleriteAlta({
        worker,
        horasTrabalhadas,
        tarifaHora,
        proventosAdicionais: proventosAvulsos,
        housingBenefitAmount,
        eventosDescontos: descontosList,
        mesReferencia,
        empresas,
        workerMonthlyActivity,
        customParams
    }) : null;

    const regularizacaoData: HoleriteRegularizacaoCalculado | null = !isAlta ? calculateHoleriteRegularizacao({
        worker,
        horasTrabalhadas,
        tarifaHora,
        housingBenefitAmount,
        eventosDescontos: descontosList,
        mesReferencia,
        empresas,
        workerMonthlyActivity
    }) : null;

    const handleDownloadPdf = () => {
        try {
            if (isAlta && altaData) {
                const doc = generateHoleriteAltaPdf(altaData, { includeDetails: true });
                const cod = worker.cod_colab || worker.id.substring(0, 5);
                const safeName = (worker.nome || 'trabalhador').replace(/[^a-zA-Z0-9]/g, '_');
                doc.save(`Recibo_Vencimento_${cod}_${safeName}_${mesReferencia}.pdf`);
                toast.success('Recibo de Vencimento baixado com sucesso!');
            } else if (regularizacaoData) {
                const doc = generateHoleriteRegularizacaoPdf(regularizacaoData);
                const cod = worker.cod_colab || worker.id.substring(0, 5);
                const safeName = (worker.nome || 'trabalhador').replace(/[^a-zA-Z0-9]/g, '_');
                doc.save(`Demonstrativo_Servicos_${cod}_${safeName}_${mesReferencia}.pdf`);
                toast.success('Demonstrativo de Serviços baixado com sucesso!');
            }
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            toast.error('Erro ao gerar o arquivo PDF.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 h-8 text-xs font-semibold">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Nóminas
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
                {/* Top Action Bar */}
                <div className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {isAlta ? 'Recibo de Vencimento Oficial' : 'Demonstrativo de Serviços Prestados'}
                                </DialogTitle>
                                <Badge variant={isAlta ? 'default' : 'secondary'} className={isAlta ? 'bg-emerald-600 text-white text-[10px]' : 'bg-amber-100 text-amber-900 text-[10px]'}>
                                    {isAlta ? 'Destacado / Alta' : 'Em Regularização'}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                                {worker.nome} • {worker.cod_colab || 'Sem código'} • {mesReferencia}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isAlta && (
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mr-2">
                                <TabsList className="h-8">
                                    <TabsTrigger value="recibo" className="text-xs px-3">Recibo Oficial</TabsTrigger>
                                    <TabsTrigger value="detalhes" className="text-xs px-3">Demonstrativo Detalhado</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                        <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Imprimir
                        </Button>
                        <Button size="sm" onClick={handleDownloadPdf} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Baixar PDF
                        </Button>
                    </div>
                </div>

                {/* Document Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
                    {/* CONTAINER A4 PREVIEWS */}
                    <div className="w-full max-w-[210mm] min-h-[280mm] bg-white text-slate-900 shadow-xl rounded-sm p-8 sm:p-12 font-sans border border-slate-200">
                        
                        {/* ========================================================================= */}
                        {/* 1. VISUALIZAÇÃO: RECIBO DE VENCIMENTO OFICIAL DE PORTUGAL (ALTA)           */}
                        {/* ========================================================================= */}
                        {isAlta && altaData && activeTab === 'recibo' && (
                            <div className="space-y-6 text-xs">
                                {/* Header */}
                                <div className="flex justify-between items-start border-b pb-6">
                                    <div className="border border-slate-700 rounded p-3.5 max-w-sm">
                                        <h3 className="font-bold text-sm text-slate-900 tracking-tight">{altaData.empresa.nome}</h3>
                                        <p className="text-slate-600 mt-0.5">NIF: <span className="font-mono">{altaData.empresa.nif}</span></p>
                                        <p className="text-slate-600">{altaData.empresa.endereco}</p>
                                        <p className="text-slate-600">{altaData.empresa.codigoPostal} {altaData.empresa.cidade}</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-base font-black text-slate-900 tracking-wider">RECIBO DE VENCIMENTO</h2>
                                        <p className="text-slate-600 mt-1">Normal</p>
                                        <p className="text-slate-600 font-semibold">ORIGINAL</p>
                                        <p className="text-slate-600 mt-1">De {altaData.periodo.dataInicio}</p>
                                        <p className="text-slate-600">até {altaData.periodo.dataFim}</p>
                                    </div>
                                </div>

                                {/* Worker Information Grid */}
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 py-2 text-slate-800">
                                    <div className="flex"><span className="font-bold w-36">Nome:</span> <span className="font-semibold uppercase">{worker.nome}</span></div>
                                    <div className="flex justify-between"><span className="font-bold">Nº Mecanográfico:</span> <span className="font-mono">{altaData.dadosProfissionais.numMecanografico}</span></div>
                                    <div className="flex"><span className="font-bold w-36">Nº Contribuinte:</span> <span className="font-mono">{altaData.dadosProfissionais.nif}</span></div>
                                    <div className="flex justify-between"><span className="font-bold">Vencimento:</span> <span className="font-semibold">{Number(altaData.dadosProfissionais.vencimentoBaseConfig || 0).toFixed(2)}€</span></div>
                                    <div className="flex"><span className="font-bold w-36">Nº Beneficiário:</span> <span className="font-mono">{altaData.dadosProfissionais.niss}</span></div>
                                    <div className="flex justify-between"><span className="font-bold">Salário Hora:</span> <span>{Number(altaData.dadosProfissionais.salarioHoraCalculado || 0).toFixed(2)}€</span></div>
                                    <div className="flex"><span className="font-bold w-36">Categoria/Profissão:</span> <span>{altaData.dadosProfissionais.categoria}</span></div>
                                    <div className="flex justify-between"><span className="font-bold">Horas Semana:</span> <span>{altaData.dadosProfissionais.horasSemana}</span></div>
                                    <div className="flex"><span className="font-bold w-36">Tipo de Processamento:</span> <span>{altaData.dadosProfissionais.tipoProcessamento}</span></div>
                                    <div className="flex justify-between"><span className="font-bold">Dias do Mês:</span> <span>{altaData.dadosProfissionais.diasMes}</span></div>
                                    <div className="flex"><span className="font-bold w-36">Base do Processamento:</span> <span>{altaData.dadosProfissionais.baseProcessamento}</span></div>
                                    <div className="flex"><span className="font-bold w-36">Companhia de Seguros:</span> <span>{altaData.empresa.seguros}</span></div>
                                </div>

                                {/* Official Items Table */}
                                <div className="border border-slate-300 rounded overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                                                <th className="py-2 px-3">DESCRIÇÃO</th>
                                                <th className="py-2 px-2 text-center w-16">QTD</th>
                                                <th className="py-2 px-2 text-right w-24">V.UNIT.</th>
                                                <th className="py-2 px-3 text-right w-28">ABONOS</th>
                                                <th className="py-2 px-3 text-right w-28">DESCONTOS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {altaData.linhasOficiais.map((linha, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-1.5 px-3 font-medium">{linha.descricao}</td>
                                                    <td className="py-1.5 px-2 text-center text-slate-600">{linha.qtd || ''}</td>
                                                    <td className="py-1.5 px-2 text-right text-slate-600">{linha.valorUnit ? `${Number(linha.valorUnit).toFixed(2)}€` : ''}</td>
                                                    <td className="py-1.5 px-3 text-right font-medium">{linha.abonos !== undefined ? `${Number(linha.abonos).toFixed(2)}€` : ''}</td>
                                                    <td className="py-1.5 px-3 text-right font-medium text-slate-700">{linha.descontos !== undefined ? `${Number(linha.descontos).toFixed(2)}€` : ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50 border-t border-slate-300 font-bold">
                                                <td colSpan={3} className="py-2 px-3 text-right">Total</td>
                                                <td className="py-2 px-3 text-right">{Number(altaData.totais.totalAbonos || 0).toFixed(2)}€</td>
                                                <td className="py-2 px-3 text-right">{Number(altaData.totais.totalDescontos || 0).toFixed(2)}€</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Summary Box */}
                                <div className="flex justify-end pt-4">
                                    <div className="border border-slate-300 rounded overflow-hidden grid grid-cols-3 text-center w-auto min-w-[380px]">
                                        <div className="p-2.5 border-r border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap px-1">Total Abonos</p>
                                            <p className="font-bold text-sm mt-0.5">{Number(altaData.totais.totalAbonos || 0).toFixed(2)}€</p>
                                        </div>
                                        <div className="p-2.5 border-r border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap px-1">Total Descontos</p>
                                            <p className="font-bold text-sm mt-0.5 text-slate-700">{Number(altaData.totais.totalDescontos || 0).toFixed(2)}€</p>
                                        </div>
                                        <div className="p-2.5 bg-slate-50">
                                            <p className="text-[10px] font-bold text-slate-900 uppercase whitespace-nowrap px-1">Total a Receber</p>
                                            <p className="font-black text-sm mt-0.5 text-indigo-700">{Number(altaData.totais.totalAReceber || 0).toFixed(2)}€</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Declaration Text */}
                                <div className="pt-4 space-y-2 text-slate-700 text-xs leading-relaxed border-t border-slate-200">
                                    <p>O Valor de <span className="font-bold">{Number(altaData.totais.totalAReceber || 0).toFixed(2)}€</span> foi pago por Transferência Bancária.</p>
                                    <p>Declaro que recebi a quantia constante neste recibo no valor de: <span className="font-semibold italic">{altaData.totais.valorPorExtenso}</span>.</p>
                                </div>

                                {/* Signature Line */}
                                <div className="pt-8">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-xs">Assinatura:</span>
                                        <div className="flex-1 border-b border-slate-400"></div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="pt-8 flex justify-between text-[10px] text-slate-400">
                                    <span>Página 1 / 2</span>
                                    <span>Emitido por MCS System • {altaData.empresa.nome}</span>
                                </div>
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* 2. VISUALIZAÇÃO: DEMONSTRATIVO DETALHADO (ALTA ANEXO)                      */}
                        {/* ========================================================================= */}
                        {isAlta && altaData && activeTab === 'detalhes' && (
                            <div className="space-y-6 text-xs">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">DEMONSTRATIVO DETALHADO DE REMUNERAÇÃO E DESCONTOS</h2>
                                    <p className="text-slate-500 mt-1">Abaixo está o descritivo de remuneração e descontos de forma detalhada para melhor compreensão.</p>
                                </div>

                                <div className="p-4 bg-slate-50 border rounded-lg grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-slate-500 font-medium">Colaborador</p>
                                        <p className="font-bold text-sm text-slate-900">{worker.nome}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 font-medium">Período de Apuração</p>
                                        <p className="font-bold text-sm text-slate-900">{altaData.periodo.mesAnoTexto}</p>
                                    </div>
                                </div>

                                {/* Side-by-side Tables */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {/* Table 1: Remunerações */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-slate-900 text-white font-bold px-3 py-2 flex justify-between text-xs">
                                            <span>Remunerações</span>
                                            <div className="flex gap-4">
                                                <span>V. Hora</span>
                                                <span>Qte</span>
                                                <span>Valor</span>
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-100 text-xs">
                                            <div className="px-3 py-2 flex justify-between items-center">
                                                <span className="font-medium">Horas Trabalhadas</span>
                                                <div className="flex gap-4 font-mono">
                                                    <span className="w-12 text-right">{Number(altaData.detalhamento.tarifaHora || 0).toFixed(2)}€</span>
                                                    <span className="w-12 text-right">{Number(altaData.detalhamento.horasTrabalhadas || 0).toFixed(2)}</span>
                                                    <span className="w-16 text-right font-semibold">{Number(altaData.detalhamento.valorHoras || 0).toFixed(2)}€</span>
                                                </div>
                                            </div>
                                            {altaData.detalhamento.clientHoursBreakdown && altaData.detalhamento.clientHoursBreakdown.length > 1 && (
                                                <div className="bg-indigo-50/40 px-3 py-2 space-y-1 border-t border-b border-indigo-100">
                                                    <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Por Cliente / Obra:</span>
                                                    {altaData.detalhamento.clientHoursBreakdown.map((cb, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-[11px] pl-2 border-l-2 border-indigo-300">
                                                            <span className="font-medium text-slate-700">{cb.clientName}</span>
                                                            <div className="flex gap-4 font-mono text-slate-600">
                                                                <span className="w-12 text-right"></span>
                                                                <span className="w-12 text-right">{Number(cb.hours || 0).toFixed(2)}h</span>
                                                                <span className="w-16 text-right font-medium">{Number((cb.hours || 0) * (altaData.detalhamento.tarifaHora || 0)).toFixed(2)}€</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="px-3 py-2 flex justify-between items-center">
                                                <span>Alojamento / Moradia</span>
                                                <span className="font-mono">{Number(altaData.detalhamento.alojamento || 0) > 0 ? `${Number(altaData.detalhamento.alojamento).toFixed(2)}€` : '-'}</span>
                                            </div>
                                            <div className="px-3 py-2 flex justify-between items-center">
                                                <span>Ajustes de Valor / Bônus</span>
                                                <span className="font-mono">{Number(altaData.detalhamento.ajustesPositivos || 0) > 0 ? `${Number(altaData.detalhamento.ajustesPositivos).toFixed(2)}€` : '-'}</span>
                                            </div>
                                            <div className="px-3 py-2.5 bg-slate-50 flex justify-between items-center font-bold">
                                                <span>Total Remunerações</span>
                                                <span className="font-mono text-emerald-700">{Number(altaData.detalhamento.totalRemuneracoes || 0).toFixed(2)}€</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table 2: Descontos */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-slate-900 text-white font-bold px-3 py-2 flex justify-between text-xs">
                                            <span>Descontos Detalhados</span>
                                            <span>Valor</span>
                                        </div>
                                        <div className="divide-y divide-slate-100 text-xs">
                                            {altaData.detalhamento.descontos?.itemizedList && altaData.detalhamento.descontos.itemizedList.length > 0 ? (
                                                altaData.detalhamento.descontos.itemizedList.map((item, idx) => (
                                                    <div key={idx} className="px-3 py-2 flex justify-between items-center">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-800">{item.label}</span>
                                                            {item.descricao && (
                                                                <span className="text-[10px] text-slate-500 font-normal">↳ {item.descricao}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-mono text-slate-900 font-semibold">{Number(item.valor || 0).toFixed(2)}€</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-3 text-slate-400 text-center italic">
                                                    Nenhum desconto no período
                                                </div>
                                            )}
                                            <div className="px-3 py-2.5 bg-rose-50 flex justify-between items-center font-bold text-rose-700">
                                                <span>Total Descontos</span>
                                                <span className="font-mono">{Number(altaData.detalhamento.descontos?.totalDescontosDetalhados ?? altaData.detalhamento.descontos?.totalDescontos ?? 0).toFixed(2)}€</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Highlight Card */}
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Líquido Efetivo Apurado</p>
                                        <p className="text-xs text-emerald-600">Creditado ao colaborador após compensação de todos os descontos e horas</p>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-700 font-mono">
                                        {Number(altaData.detalhamento.liquidoReal || 0).toFixed(2)}€
                                    </div>
                                </div>

                                <div className="pt-6 border-t text-[11px] italic text-slate-400">
                                    Este documento não faz parte do holerite oficial, e serve exclusivamente como demonstrativo detalhado de prestação/apuramento.
                                </div>
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* 3. VISUALIZAÇÃO: DEMONSTRATIVO DE SERVIÇOS (REGULARIZAÇÃO)                 */}
                        {/* ========================================================================= */}
                        {!isAlta && regularizacaoData && (
                            <div className="space-y-6 text-xs">
                                {/* Header */}
                                <div className="text-center pb-4 border-b border-slate-200">
                                    <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">{regularizacaoData.empresa.nome}</h2>
                                    <p className="text-slate-500 mt-0.5">{regularizacaoData.empresa.endereco}, {regularizacaoData.empresa.codigoPostal} {regularizacaoData.empresa.cidade} • NIF: {regularizacaoData.empresa.nif}</p>
                                    
                                    <h3 className="text-sm font-bold text-slate-800 mt-4 tracking-tight">Demonstrativo de Serviços Prestados</h3>
                                    <p className="text-slate-500">Período: <span className="font-semibold">{regularizacaoData.periodo.mesAnoTexto}</span> • Data: <span className="font-semibold">{regularizacaoData.periodo.dataEmissao}</span></p>
                                </div>

                                {/* Worker / Service Header */}
                                <div className="p-4 bg-slate-50 border rounded-lg space-y-1.5">
                                    <div className="flex"><span className="font-bold w-36">Nome:</span> <span className="font-semibold uppercase">{worker.nome}</span></div>
                                    <div className="flex"><span className="font-bold w-36">Serviço Prestado:</span> <span>{regularizacaoData.servicoPrestado}</span></div>
                                </div>

                                {/* Detalhamento de Horas */}
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-xs">Detalhamento de Horas</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100 border-b text-slate-700 font-bold text-xs">
                                                    <th className="py-2 px-3">Descrição</th>
                                                    <th className="py-2 px-3 text-right w-28">Qte (Horas)</th>
                                                    <th className="py-2 px-3 text-right w-32">Valor Total (€)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="py-2 px-3 font-medium">Serviços Prestados (V. Hora: {Number(regularizacaoData.horas.tarifaHora || 0).toFixed(2)}€)</td>
                                                    <td className="py-2 px-3 text-right font-mono">{Number(regularizacaoData.horas.quantidadeHoras || 0).toFixed(2)}</td>
                                                    <td className="py-2 px-3 text-right font-mono font-semibold">{Number(regularizacaoData.horas.valorTotalHoras || 0).toFixed(2)}€</td>
                                                </tr>
                                                {regularizacaoData.horas.clientHoursBreakdown && regularizacaoData.horas.clientHoursBreakdown.length > 1 && (
                                                    regularizacaoData.horas.clientHoursBreakdown.map((cb, i) => (
                                                        <tr key={`cl-${i}`} className="bg-indigo-50/30 text-[11px]">
                                                            <td className="py-1 px-3 pl-6 font-normal text-slate-600">↳ {cb.clientName}</td>
                                                            <td className="py-1 px-3 text-right font-mono text-slate-600">{Number(cb.hours || 0).toFixed(2)}</td>
                                                            <td className="py-1 px-3 text-right font-mono text-slate-600">{Number((cb.hours || 0) * (regularizacaoData.horas.tarifaHora || 0)).toFixed(2)}€</td>
                                                        </tr>
                                                    ))
                                                )}
                                                {regularizacaoData.horas.ajudaAlojamento > 0 && (
                                                    <tr>
                                                        <td className="py-2 px-3">Ajuda Alojamento</td>
                                                        <td className="py-2 px-3 text-right font-mono">-</td>
                                                        <td className="py-2 px-3 text-right font-mono font-semibold">{Number(regularizacaoData.horas.ajudaAlojamento || 0).toFixed(2)}€</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-50 border-t font-bold">
                                                    <td colSpan={2} className="py-2 px-3 text-right">Total Bruto:</td>
                                                    <td className="py-2 px-3 text-right font-mono text-indigo-700">{Number(regularizacaoData.horas.totalBruto || 0).toFixed(2)}€</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Detalhamento de Descontos e Gastos */}
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wide text-xs">Detalhamento de Descontos e Gastos</h4>
                                    <div className="border rounded-lg overflow-hidden max-w-md">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-900 text-white font-bold text-xs">
                                                    <th className="py-2 px-3">Descontos Detalhados</th>
                                                    <th className="py-2 px-3 text-right w-28">Valor (€)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                {regularizacaoData.descontos?.itemizedList && regularizacaoData.descontos.itemizedList.length > 0 ? (
                                                    regularizacaoData.descontos.itemizedList.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="py-1.5 px-3">
                                                                <span className="font-medium text-slate-800 block">{item.label}</span>
                                                                {item.descricao && (
                                                                    <span className="text-[10px] text-slate-500 font-normal block">↳ {item.descricao}</span>
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">{Number(item.valor || 0).toFixed(2)}€</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={2} className="py-3 px-3 text-slate-400 text-center italic">Nenhum desconto no período</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-rose-50 border-t font-bold text-rose-700">
                                                    <td className="py-2 px-3">Total Descontos:</td>
                                                    <td className="py-2 px-3 text-right font-mono">{Number(regularizacaoData.descontos?.totalDescontos ?? regularizacaoData.descontos?.totalDescontosDetalhados ?? 0).toFixed(2)}€</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Total Líquido Pago Card */}
                                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Líquido Pago</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Forma de Pagamento: {regularizacaoData.formaPagamento} • Moeda: {regularizacaoData.moeda}</p>
                                    </div>
                                    <div className="text-3xl font-black text-emerald-700 font-mono">
                                        {Number(regularizacaoData.totalLiquido ?? regularizacaoData.liquidoFinal ?? 0).toFixed(2)}€
                                    </div>
                                </div>

                                {/* Disclaimer Footer */}
                                <div className="pt-6 border-t text-[11px] italic text-slate-400">
                                    Este documento é um comprovante de pagamento por serviços prestados e não constitui vínculo empregatício ou comprovação de renda.
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
