import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrencyByCode, getMoedaInfo } from '../services/caixaService';
import { ArrowRightLeft, AlertTriangle } from 'lucide-react';

export interface MultiCurrencyTransferValue {
    valorEur: string;
    taxaBancariaEur: string;
    valorLocal: string;
    taxaCambio: string;
}

interface MultiCurrencyTransferFieldsProps {
    moeda: string;
    value: MultiCurrencyTransferValue;
    onChange: (next: MultiCurrencyTransferValue) => void;
    required?: boolean;
    autoFocusEur?: boolean;
}

export const MultiCurrencyTransferFields: React.FC<MultiCurrencyTransferFieldsProps> = ({
    moeda,
    value,
    onChange,
    required = false,
    autoFocusEur = false,
}) => {
    const [lastEdited, setLastEdited] = useState<'local' | 'rate'>('local');
    const moedaInfo = getMoedaInfo(moeda);

    const eurNum = parseFloat(value.valorEur) || 0;
    const feeNum = parseFloat(value.taxaBancariaEur) || 0;
    const localNum = parseFloat(value.valorLocal) || 0;
    const rateNum = parseFloat(value.taxaCambio) || 0;
    const netEur = Math.max(0, eurNum - feeNum);
    const effectiveRate = eurNum > 0 && localNum > 0 ? localNum / eurNum : 0;
    const feeInvalid = eurNum > 0 && feeNum >= eurNum;

    const handleEurChange = (raw: string) => {
        const nextEur = parseFloat(raw) || 0;
        const nextNet = Math.max(0, nextEur - feeNum);
        const next: MultiCurrencyTransferValue = { ...value, valorEur: raw };

        if (lastEdited === 'local' && localNum > 0 && nextNet > 0) {
            next.taxaCambio = (localNum / nextNet).toFixed(4);
        } else if (lastEdited === 'rate' && rateNum > 0) {
            next.valorLocal = (nextNet * rateNum).toFixed(2);
        }
        onChange(next);
    };

    const handleFeeChange = (raw: string) => {
        const nextFee = parseFloat(raw) || 0;
        const nextNet = Math.max(0, eurNum - nextFee);
        const next: MultiCurrencyTransferValue = { ...value, taxaBancariaEur: raw };

        if (lastEdited === 'local' && localNum > 0 && nextNet > 0) {
            next.taxaCambio = (localNum / nextNet).toFixed(4);
        } else if (lastEdited === 'rate' && rateNum > 0) {
            next.valorLocal = (nextNet * rateNum).toFixed(2);
        }
        onChange(next);
    };

    const handleLocalChange = (raw: string) => {
        setLastEdited('local');
        const nextLocal = parseFloat(raw) || 0;
        const next: MultiCurrencyTransferValue = { ...value, valorLocal: raw };
        if (nextLocal > 0 && netEur > 0) {
            next.taxaCambio = (nextLocal / netEur).toFixed(4);
        } else if (!raw) {
            next.taxaCambio = '';
        }
        onChange(next);
    };

    const handleRateChange = (raw: string) => {
        setLastEdited('rate');
        const nextRate = parseFloat(raw) || 0;
        const next: MultiCurrencyTransferValue = { ...value, taxaCambio: raw };
        if (nextRate > 0 && netEur > 0) {
            next.valorLocal = (netEur * nextRate).toFixed(2);
        } else if (!raw) {
            next.valorLocal = '';
        }
        onChange(next);
    };

    return (
        <div className="space-y-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Conversão Bancária (EUR → {moedaInfo.flag} {moeda})
                </span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400">
                    Digite o valor em {moeda} ou a cotação
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Total Transferido (€) {required ? '*' : ''}
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 200.00"
                        value={value.valorEur}
                        onChange={e => handleEurChange(e.target.value)}
                        required={required}
                        autoFocus={autoFocusEur}
                        className="h-9 text-sm bg-white dark:bg-slate-900"
                    />
                </div>

                <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Taxa Bancária (€) <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={value.taxaBancariaEur}
                        onChange={e => handleFeeChange(e.target.value)}
                        className="h-9 text-sm bg-white dark:bg-slate-900"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Recebido em {moeda} {required ? '*' : ''}
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 891.40"
                        value={value.valorLocal}
                        onChange={e => handleLocalChange(e.target.value)}
                        required={required}
                        className="h-9 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
                    />
                </div>

                <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Cotação (1 EUR = {moeda})
                    </label>
                    <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="Ex: 4.4570"
                        value={value.taxaCambio}
                        onChange={e => handleRateChange(e.target.value)}
                        className="h-9 text-sm font-mono bg-white dark:bg-slate-900"
                    />
                </div>
            </div>

            {feeInvalid && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    A taxa bancária deve ser menor que o valor transferido.
                </div>
            )}

            {(eurNum > 0 || localNum > 0) && !feeInvalid && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Débito no banco:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrencyByCode(eurNum, 'EUR')}
                            {feeNum > 0 && (
                                <span className="text-[10px] font-normal text-slate-400 ml-1">
                                    ({formatCurrencyByCode(netEur, 'EUR')} líq. + {formatCurrencyByCode(feeNum, 'EUR')} taxa)
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Saldo disponível p/ colaborador:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyByCode(localNum, moeda)}
                        </span>
                    </div>
                    {rateNum > 0 && (
                        <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>Câmbio líquido: 1 EUR = {rateNum.toFixed(4)} {moeda}</span>
                            {feeNum > 0 && effectiveRate > 0 && (
                                <span>Efetivo c/ taxa: {effectiveRate.toFixed(4)}</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
