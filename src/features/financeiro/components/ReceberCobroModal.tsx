import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Calendar, Save, X } from 'lucide-react';
import { fetchBancos, saveRecebimento, updateContaReceber, saveObservacao } from '../data/loader';
import type { EnrichedTitulo, Banco } from '../types';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTranslation } from 'react-i18next';

interface ReceberCobroModalProps {
    titulo: EnrichedTitulo;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ReceberCobroModal: React.FC<ReceberCobroModalProps> = ({ titulo, isOpen, onClose, onSuccess }) => {
    const { t } = useTranslation();
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [isLoadingBancos, setIsLoadingBancos] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useAuth();

    const [formaPagamento, setFormaPagamento] = useState('Transferencia');
    const [tipoRecebimento, setTipoRecebimento] = useState('Integral');
    const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
    const [bancoId, setBancoId] = useState('');
    const [valorRecebido, setValorRecebido] = useState(titulo.Saldo_a_pagar.toString());

    useEffect(() => {
        if (isOpen) {
            loadBancos();
            setValorRecebido(titulo.Saldo_a_pagar.toString());
            setTipoRecebimento('Integral');
            setFormaPagamento('Transferencia');
            setDataRecebimento(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, titulo]);

    const loadBancos = async () => {
        setIsLoadingBancos(true);
        try {
            const data = await fetchBancos();
            // Filter active banks for this company if we had the company ID, 
            // for now just show active banks
            const activeBancos = data.filter(b => b.ativo);
            setBancos(activeBancos);
            if (activeBancos.length > 0) {
                setBancoId(activeBancos[0].id);
            }
        } catch (error) {
            console.error('Error fetching bancos:', error);
            toast.error(t('financeiro.modals.err_bank_fetch', 'Erro ao carregar bancos.'));
        } finally {
            setIsLoadingBancos(false);
        }
    };

    const handleSave = async () => {
        const valor = parseFloat(valorRecebido);
        if (isNaN(valor) || valor <= 0) {
            toast.error(t('financeiro.modals.err_val_zero', 'O valor recebido deve ser maior que zero.'));
            return;
        }

        if (valor > titulo.Saldo_a_pagar) {
            toast.error(t('financeiro.modals.err_val_balance', 'O valor não pode ser maior que o Saldo a Pagar.'));
            return;
        }

        if (!bancoId && bancos.length > 0) {
            toast.error(t('financeiro.modals.err_select_bank', 'Por favor, selecione um banco de destino.'));
            return;
        }

        setIsSaving(true);
        try {
            // 1. Salvar o Recebimento
            const novoRecebimento = {
                conta_receber_id: titulo.id,
                valor: valor,
                data_recebimento: dataRecebimento,
                forma_pagamento: formaPagamento,
                tipo_recebimento: tipoRecebimento,
                banco_id: bancoId || undefined
            };

            const recRes = await saveRecebimento(novoRecebimento);
            if (!recRes.success) throw recRes.error;

            // 2. Atualizar o Saldo e Status da Conta a Receber
            const novoSaldo = titulo.Saldo_a_pagar - valor;
            const novoStatus = novoSaldo <= 0 ? 'Pago' : 'Parcial';

            const updateRes = await updateContaReceber(titulo.id, {
                Saldo_a_pagar: novoSaldo,
                Status: novoStatus,
                Integral_parcial: tipoRecebimento
            });

            if (!updateRes.success) throw updateRes.error;

            // 3. Salvar Observação Automática
            const bancoDestino = bancos.find(b => b.id === bancoId);
            const nomeBanco = bancoDestino ? bancoDestino.nome_banco : 'Não especificado';
            const autoObs = {
                conta_receber_id: titulo.id,
                usuario: user?.email || 'Sistema',
                descricao: `Recebimento ${tipoRecebimento} registrado: € ${valor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (Banco: ${nomeBanco}, Forma: ${formaPagamento})`,
                tipo: 'Recebimento',
                data: new Date().toISOString()
            };
            await saveObservacao(autoObs);

            toast.success(t('financeiro.modals.msg_receipt_saved', 'Recebimento salvo com sucesso!'));
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error in handleSave:', error);
            toast.error(t('financeiro.modals.err_receipt_process', 'Ocorreu um erro ao processar o recebimento.'));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center bg-brand-primary p-4 rounded-t-xl text-white">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-2 rounded-full">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight">{t('financeiro.modals.receber_title_plural', 'Receber Cobros')}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{t('financeiro.modals.client', 'Cliente')}</p>
                            <p className="text-lg font-semibold text-gray-900">{titulo.clienteInfo?.NombreComercial || titulo.Cliente || t('financeiro.modals.unknown_client', 'Cliente Desconhecido')}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 font-medium">{t('financeiro.modals.current_balance', 'Saldo a Pagar Atual')}</p>
                            <p className="text-xl font-bold text-brand-primary">€ {titulo.Saldo_a_pagar.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="forma_pagamento">{t('financeiro.modals.payment_method', 'Forma de Pago')}</Label>
                            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                                    <SelectItem value="Confirme">Confirme</SelectItem>
                                    <SelectItem value="Efetivo">Efetivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('financeiro.modals.payment_type', 'Integral / Parcial')}</Label>
                            <div className="flex space-x-4 pt-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="tipo_recebimento" 
                                        value="Integral" 
                                        checked={tipoRecebimento === 'Integral'} 
                                        onChange={() => {
                                            setTipoRecebimento('Integral');
                                            setValorRecebido(titulo.Saldo_a_pagar.toString());
                                        }}
                                        className="w-4 h-4 text-brand-primary"
                                    />
                                    <span>{t('financeiro.modals.payment_type_integral', 'Integral')}</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="tipo_recebimento" 
                                        value="Parcial" 
                                        checked={tipoRecebimento === 'Parcial'} 
                                        onChange={() => setTipoRecebimento('Parcial')}
                                        className="w-4 h-4 text-brand-primary"
                                    />
                                    <span>{t('financeiro.modals.payment_type_partial', 'Parcial')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="data_recebimento">{t('financeiro.modals.payment_date', 'Fecha de Recepción')}</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                </div>
                                <Input 
                                    id="data_recebimento" 
                                    type="date" 
                                    className="pl-10"
                                    value={dataRecebimento} 
                                    onChange={(e) => setDataRecebimento(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="banco">{t('financeiro.modals.destination_bank', 'Banco de Destino')}</Label>
                            <Select value={bancoId} onValueChange={setBancoId} disabled={isLoadingBancos}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingBancos ? t('financeiro.table.loading_data', 'Carregando...') : t('financeiro.modals.select_bank_placeholder', 'Selecione o Banco')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {bancos.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.nome_banco}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="valor_total">{t('financeiro.modals.received_value', 'Valor do Recebimento')}</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 font-medium">€</span>
                                </div>
                                <Input 
                                    id="valor_total" 
                                    type="number" 
                                    step="0.01"
                                    min="0.01"
                                    className="pl-8 text-right font-semibold"
                                    value={valorRecebido} 
                                    onChange={(e) => setValorRecebido(e.target.value)} 
                                    disabled={tipoRecebimento === 'Integral'}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t p-4 rounded-b-xl flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        {t('financeiro.modals.btn_cancel', 'Cancelar')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || !valorRecebido || parseFloat(valorRecebido) <= 0}
                        className="bg-brand-primary hover:bg-brand-primary/90 text-white min-w-[140px]"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {t('financeiro.modals.btn_save_receipt', 'Guardar recibo')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
