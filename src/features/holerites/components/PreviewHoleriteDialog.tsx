import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import type { Worker } from '@/shared/types/corePersonal';
import type { HoleriteEvento } from '@/shared/types/holerites';
import { useTaxRules } from '@/features/taxes/hooks';

interface PreviewHoleriteDialogProps {
    worker: Worker;
    mesReferencia: string;
    eventosMensais: HoleriteEvento[];
    trigger: React.ReactNode;
}

export function PreviewHoleriteDialog({ worker, mesReferencia, eventosMensais, trigger }: PreviewHoleriteDialogProps) {
    const [open, setOpen] = useState(false);

    // Fetch Global Tax Rules to apply to the payslip
    const { data: taxRules } = useTaxRules();

    // TypeScript workaround since the join relation is dynamically loaded
    const extendedWorker = worker as any;

    // 1. Calculate Base Salary & Hours
    const tarifaHora = extendedWorker['worker_beneficios_settings']?.tarifa_hora || 0;
    const totalHorasEvento = eventosMensais.find(e => e.categoria === 'total_horas');
    const horasTrabalhadas = totalHorasEvento?.valor || 0;

    // Base Gross Salary = Hours * Rate (assuming hourly worker)
    // If there is no "total_horas" event but there are provisions, the base is 0 and we just sum provisions.
    const vencimentoBase = Number(horasTrabalhadas) * Number(tarifaHora);

    // 2. Add extra Proventos (Bonus, Binds)
    const proventosAvulsos = eventosMensais
        .filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const grossIncome = vencimentoBase + proventosAvulsos;

    // 3. Tax Calculations
    // Get valid Tax Rules for current month
    const currentDate = new Date(mesReferencia + '-01');
    const applicableTaxes = (taxRules || []).filter(rule => {
        const from = new Date(rule.valid_from);
        const to = rule.valid_to ? new Date(rule.valid_to) : new Date('2099-12-31');
        return currentDate >= from && currentDate <= to && rule.is_active !== false;
    });

    // Subsidio Alimentaçao (If worker has it)
    const vrDiario = extendedWorker['worker_beneficios_settings']?.valor_mensal_vr || 0;
    const diasTrabalhados = 22; // Hardcoded default for MVP, usually comes from Time Tracking
    const subsidioAlimentacaoValor = Number(vrDiario) * diasTrabalhados;

    // Subsidio Taxable Logic
    const vrLimiteDinheiro = applicableTaxes.find(t => t.tax_type === 'SUBSIDIO_ALIMENTACAO_LIMITE_DINHEIRO')?.fixed_amount || 6.00;
    const vrLimiteCartao = applicableTaxes.find(t => t.tax_type === 'SUBSIDIO_ALIMENTACAO_LIMITE_CARTAO')?.fixed_amount || 9.60;
    const vrStatus = extendedWorker['worker_beneficios_settings']?.status_vr || 'Não recebe';

    let vrTributavel = 0;
    if (vrStatus === 'Em dinheiro' && Number(vrDiario) > vrLimiteDinheiro) {
        vrTributavel = (Number(vrDiario) - vrLimiteDinheiro) * diasTrabalhados;
    } else if (vrStatus === 'Em cartão' && Number(vrDiario) > vrLimiteCartao) {
        vrTributavel = (Number(vrDiario) - vrLimiteCartao) * diasTrabalhados;
    }

    // SS Trabalhador (11% usually)
    const ssTrabalhadorRule = applicableTaxes.find(t => t.tax_type === 'SS_TRABALHADOR');
    const ssTrabalhadorRate = ssTrabalhadorRule?.rate_percentage ? Number(ssTrabalhadorRule.rate_percentage) / 100 : 0.11;

    // SS is calculated over Gross Income + Taxable Food Allowance
    const baseIncidenciaSS = grossIncome + vrTributavel;
    const descontoSS = baseIncidenciaSS * ssTrabalhadorRate;

    // IRS (If the worker doesn't have an individual override, use 0% or a Default Rule)
    // In a real Portuguese scenario, IRS depends on tables (Civil status, Dependents). 
    // Here we use the global IRS_DEFAULT if exists, or 0.
    const irsRule = applicableTaxes.find(t => t.tax_type === 'IRS_DEFAULT');
    const irsRate = irsRule?.rate_percentage ? Number(irsRule.rate_percentage) / 100 : 0.0;
    const descontoIRS = grossIncome * irsRate;

    // 4. Avulso Discounts (Adiantamentos, Multas, etc.)
    const descontosAvulsos = eventosMensais
        .filter(e => e.tipo === 'desconto')
        .reduce((acc, curr) => acc + Number(curr.valor), 0);

    // 5. Net Salary Calculation
    const totalOutrosDescontos = descontoSS + descontoIRS + descontosAvulsos;
    const totalAbonos = grossIncome + subsidioAlimentacaoValor; // Subsidio is paid to the worker, so it increases Net
    const netSalary = totalAbonos - totalOutrosDescontos;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[85vh] overflow-y-auto">
                <DialogHeader className="items-center mb-4">
                    <DialogTitle className="text-2xl font-bold flex items-center">
                        <FileText className="mr-2 h-6 w-6 text-indigo-600" />
                        Recibo de Vencimento
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-white border rounded-xl p-8 text-sm space-y-8 print:border-none print:shadow-none font-mono">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{worker.contratante || 'EMPRESA KOTRIK'}</h2>
                            <p className="text-slate-500">Recibo de Vencimento - {format(new Date(mesReferencia + '-02'), 'MMMM yyyy', { locale: pt }).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-slate-700">{worker.nome}</p>
                            <p className="text-slate-500">NISS: {worker.niss || 'N/A'}</p>
                            <p className="text-slate-500">NIF: {worker.nif || 'N/A'}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Proventos / Abonos Table */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2 uppercase tracking-wide text-xs">Abonos / Proventos</h4>
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr className="text-left text-slate-500">
                                    <th className="py-2.5 px-2 font-medium">Descrição</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-24">Qtd. / H</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-32">Valor Unit. (€)</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-32">Total (€)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="py-2 px-2">Vencimento Base (Horas)</td>
                                    <td className="py-2 px-2 text-right">{horasTrabalhadas}</td>
                                    <td className="py-2 px-2 text-right">{Number(tarifaHora).toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right">{vencimentoBase.toFixed(2)}</td>
                                </tr>
                                {Number(subsidioAlimentacaoValor) > 0 && (
                                    <tr>
                                        <td className="py-2 px-2">Subsídio de Alimentação ({vrStatus})</td>
                                        <td className="py-2 px-2 text-right">{diasTrabalhados}</td>
                                        <td className="py-2 px-2 text-right">{Number(vrDiario).toFixed(2)}</td>
                                        <td className="py-2 px-2 text-right">{subsidioAlimentacaoValor.toFixed(2)}</td>
                                    </tr>
                                )}
                                {eventosMensais.filter(e => e.tipo === 'provento' && e.categoria !== 'total_horas').map(ev => (
                                    <tr key={ev.id}>
                                        <td className="py-2 px-2">{ev.categoria.replace('_', ' ').toUpperCase()} {ev.descricao ? `- ${ev.descricao}` : ''}</td>
                                        <td className="py-2 px-2 text-right">-</td>
                                        <td className="py-2 px-2 text-right">-</td>
                                        <td className="py-2 px-2 text-right">{Number(ev.valor).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold text-slate-800 bg-slate-50">
                                    <td colSpan={3} className="py-3 px-2 text-right">Total Bruto Corrente:</td>
                                    <td className="py-3 px-2 text-right">€ {grossIncome.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Descontos / Deduções Table */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-2 uppercase tracking-wide text-xs">Deduções / Impostos (Configuração Global)</h4>
                        <table className="w-full">
                            <thead className="border-b border-slate-200">
                                <tr className="text-left text-slate-500">
                                    <th className="py-2.5 px-2 font-medium">Descrição</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-32">Base de Incidência</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-24">Taxa (%)</th>
                                    <th className="py-2.5 px-2 font-medium text-right w-32">Valor Retido (€)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td className="py-2 px-2 text-red-600">Segurança Social (Trabalhador)</td>
                                    <td className="py-2 px-2 text-right text-red-600">€ {baseIncidenciaSS.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right text-red-600">{(ssTrabalhadorRate * 100).toFixed(2)}%</td>
                                    <td className="py-2 px-2 text-right text-red-600 font-medium">€ {descontoSS.toFixed(2)}</td>
                                </tr>
                                {descontoIRS > 0 && (
                                    <tr>
                                        <td className="py-2 px-2 text-red-600">Retenção IRS</td>
                                        <td className="py-2 px-2 text-right text-red-600">€ {grossIncome.toFixed(2)}</td>
                                        <td className="py-2 px-2 text-right text-red-600">{(irsRate * 100).toFixed(2)}%</td>
                                        <td className="py-2 px-2 text-right text-red-600 font-medium">€ {descontoIRS.toFixed(2)}</td>
                                    </tr>
                                )}
                                {eventosMensais.filter(e => e.tipo === 'desconto').map(ev => (
                                    <tr key={ev.id}>
                                        <td className="py-2 px-2 text-red-600">{ev.categoria.replace('_', ' ').toUpperCase()} {ev.descricao ? `- ${ev.descricao}` : ''}</td>
                                        <td className="py-2 px-2 text-right">-</td>
                                        <td className="py-2 px-2 text-right">-</td>
                                        <td className="py-2 px-2 text-right text-red-600 font-medium">€ {Number(ev.valor).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold text-slate-800 bg-red-50/50">
                                    <td colSpan={3} className="py-3 px-2 text-right">Total de Descontos:</td>
                                    <td className="py-3 px-2 text-right text-red-700">€ {totalOutrosDescontos.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Resumo e Líquido a Receber */}
                    <div className="bg-slate-800 text-white rounded-lg p-6 flex justify-between items-center print:bg-slate-100 print:text-black">
                        <div>
                            <p className="text-slate-400 print:text-slate-500 font-medium tracking-widest text-xs uppercase mb-1">Líquido a Receber</p>
                            <p className="text-3xl font-bold">€ {netSalary.toFixed(2)}</p>
                        </div>
                        <Button variant="outline" className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white print:hidden" onClick={() => window.print()}>
                            <Download className="mr-2 h-4 w-4" />
                            Imprimir PDF
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
