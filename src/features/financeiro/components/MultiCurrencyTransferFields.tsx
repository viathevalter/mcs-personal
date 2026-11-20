import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrencyByCode, getMoedaInfo } from '../services/caixaService';
import { ArrowRightLeft } from 'lucide-react';

export interface MultiCurrencyTransferValue {
    valorEur: string;        // Valor efetivamente transferido/convertido em EUR (ex: 200.00)
    taxaBancariaEur: string; // Taxa bancária acrescida ao desembolso (ex: 5.20) -> Total desembolsado = 205.20
    valorLocal: string;      // Valor recebido na moeda local (ex: 891.40 PLN)
    taxaCambio: string;      // Cotação (1 EUR = X moeda local)
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
    const totalDesembolsoEur = eurNum + feeNum;
    const effectiveRate = totalDesembolsoEur > 0 && localNum > 0 ? localNum / totalDesembolsoEur : 0;

    const handleEurChange = (raw: string) => {
        const nextEur = parseFloat(raw) || 0;
        const next: MultiCurrencyTransferValue = { ...value, valorEur: raw };

        if (lastEdited === 'local' && localNum > 0 && nextEur > 0) {
            next.taxaCambio = (localNum / nextEur).toFixed(4);
        } else if (lastEdited === 'rate' && rateNum > 0) {
            next.valorLocal = (nextEur * rateNum).toFixed(2);
        }
        onChange(next);
    };

    const handleFeeChange = (raw: string) => {
        // A taxa bancária soma ao desembolso total (despesa bancária), sem alterar o valor transferido nem o valor recebido em moeda local
        onChange({ ...value, taxaBancariaEur: raw });
    };

    const handleLocalChange = (raw: string) => {
        setLastEdited('local');
        const nextLocal = parseFloat(raw) || 0;
        const next: MultiCurrencyTransferValue = { ...value, valorLocal: raw };
        if (nextLocal > 0 && eurNum > 0) {
            next.taxaCambio = (nextLocal / eurNum).toFixed(4);
        } else if (!raw) {
            next.taxaCambio = '';
        }
        onChange(next);
    };

    const handleRateChange = (raw: string) => {
        setLastEdited('rate');
        const nextRate = parseFloat(raw) || 0;
        const next: MultiCurrencyTransferValue = { ...value, taxaCambio: raw };
        if (nextRate > 0 && eurNum > 0) {
            next.valorLocal = (eurNum * nextRate).toFixed(2);
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
                        Valor Transferido (€) {required ? '*' : ''}
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
                        + Taxa Bancária (€) <span className="font-normal text-slate-400">(opcional)</span>
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

            {(eurNum > 0 || localNum > 0) && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Desembolso total no banco:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrencyByCode(totalDesembolsoEur, 'EUR')}
                            {feeNum > 0 && (
                                <span className="text-[10px] font-normal text-slate-400 ml-1">
                                    ({formatCurrencyByCode(eurNum, 'EUR')} + {formatCurrencyByCode(feeNum, 'EUR')} taxa)
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
                            <span>Cotação: 1 EUR = {rateNum.toFixed(4)} {moeda}</span>
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
