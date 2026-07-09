import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Scale, CheckCircle2, AlertCircle, Phone, Calendar, Landmark, Percent, FileText, Handshake } from 'lucide-react';
import { updateContaReceber, createContaReceber, saveObservacao } from '../data/loader';
import { formatCurrency, formatDate } from '../lib/utils';
import type { EnrichedTitulo } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    titulo: EnrichedTitulo;
    allTitles: EnrichedTitulo[];
    currentUser: string;
    onRefresh: () => void;
    onOpenEmail: (titulo: EnrichedTitulo, customSubject: string, customBody: string) => void;
}

export const NegotiationModal = ({
    isOpen,
    onClose,
    titulo,
    allTitles,
    currentUser,
    onRefresh,
    onOpenEmail
}: NegotiationModalProps) => {
    const { t } = useTranslation();

    // Find all titles of this client
    const clientTitles = allTitles.filter(t => 
        (t.CodCliente && t.CodCliente === titulo.CodCliente) || 
        (t.Cliente && t.Cliente.trim().toLowerCase() === (titulo.Cliente || '').trim().toLowerCase())
    );

    const isOverdue = (item: EnrichedTitulo) => {
        if (item.Status === 'Pago' || item.Status === 'Judicial' || item.Status === 'Negociado') return false;
        return item.Dt_venc && new Date(item.Dt_venc) < new Date(new Date().setHours(0,0,0,0));
    };

    const paidTitles = clientTitles.filter(t => t.Status === 'Pago');
    const overdueTitles = clientTitles.filter(t => isOverdue(t));
    const dueSoonTitles = clientTitles.filter(t => t.Status !== 'Pago' && t.Status !== 'Negociado' && !isOverdue(t));

    const totalPaidSum = paidTitles.reduce((acc, curr) => acc + (curr.Valot_total || 0), 0);
    const totalOverdueSum = overdueTitles.reduce((acc, curr) => acc + (curr.Saldo_a_pagar || 0), 0);
    const totalDueSoonSum = dueSoonTitles.reduce((acc, curr) => acc + (curr.Saldo_a_pagar || 0), 0);

    const [activeTab, setActiveTab] = useState<'overdue' | 'due_soon' | 'paid'>('overdue');

    // Checked titles for negotiation (default to the clicked title if not paid)
    const [checkedIds, setCheckedIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && titulo) {
            const initialIds = titulo.Status !== 'Pago' && titulo.Status !== 'Negociado' ? [titulo.id] : [];
            setCheckedIds(initialIds);
            
            // Set active tab based on selected title status
            if (titulo.Status === 'Pago') {
                setActiveTab('paid');
            } else if (isOverdue(titulo)) {
                setActiveTab('overdue');
            } else {
                setActiveTab('due_soon');
            }
        }
    }, [isOpen, titulo]);

    // Negotiation options states
    const [classification, setClassification] = useState<'friendly' | 'legal'>('friendly');
    const [discount, setDiscount] = useState<number>(0);
    const [paymentType, setPaymentType] = useState<'single' | 'installments'>('single');
    
    // Date formats (yyyy-MM-dd)
    const getTomorrowStr = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };
    
    const getNextMonthStr = () => {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        return nextMonth.toISOString().split('T')[0];
    };

    const [dueDate, setDueDate] = useState<string>(getTomorrowStr());
    const [installmentsCount, setInstallmentsCount] = useState<number>(3);
    const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>(getNextMonthStr());
    const [isSaving, setIsSaving] = useState(false);

    // Calculations
    const selectedTitles = clientTitles.filter(t => checkedIds.includes(t.id));
    const originalTotal = selectedTitles.reduce((acc, curr) => acc + (curr.Saldo_a_pagar || 0), 0);
    const discountAmount = originalTotal * (discount / 100);
    const discountedTotal = Math.max(0, originalTotal - discountAmount);

    // Installments preview generator
    const getInstallmentPreview = () => {
        const previewList: { index: number; value: number; dueDate: string }[] = [];
        if (paymentType === 'single') {
            previewList.push({
                index: 1,
                value: discountedTotal,
                dueDate: dueDate
            });
        } else {
            const installmentValue = Number((discountedTotal / installmentsCount).toFixed(2));
            for (let i = 0; i < installmentsCount; i++) {
                const date = new Date(firstInstallmentDate);
                date.setMonth(date.getMonth() + i);
                
                // Adjust if last installment has rounding discrepancy
                const isLast = i === installmentsCount - 1;
                const value = isLast 
                    ? Number((discountedTotal - (installmentValue * (installmentsCount - 1))).toFixed(2))
                    : installmentValue;

                previewList.push({
                    index: i + 1,
                    value,
                    dueDate: date.toISOString().split('T')[0]
                });
            }
        }
        return previewList;
    };

    const installmentPreview = getInstallmentPreview();



    // Prepare warning email
    const handlePrepareEmail = () => {
        if (selectedTitles.length === 0) {
            toast.error(t('financeiro.negotiation.err_no_titles_selected', 'Por favor, selecione ao menos um título para cobrança.'));
            return;
        }

        const clientName = titulo.Cliente || 'Cliente';
        const docListText = selectedTitles.map(t => 
            `- Doc: ${t.Num_doc} | Vencido em: ${t.Dt_venc ? new Date(t.Dt_venc).toLocaleDateString('pt-PT') : 'N/A'} | Valor: ${formatCurrency(t.Saldo_a_pagar)}`
        ).join('\n');

        const subject = t('financeiro.negotiation.email_subject', 'Proposta de Acordo e Relação de Títulos Pendentes - {{clientName}}', { clientName });
        
        let body = t('financeiro.negotiation.email_body_header', 'Prezada equipe financeira da {{clientName}},\n\nSeguindo nossa política de monitoramento de créditos, listamos abaixo os títulos pendentes em aberto:\n\n', { clientName }) +
            docListText + '\n\n' +
            t('financeiro.negotiation.email_body_total', 'Valor total original em atraso: {{originalTotal}}', { originalTotal: formatCurrency(originalTotal) }) + '\n';

        if (discount > 0) {
            body += t('financeiro.negotiation.email_body_discount', 'Com a nossa proposta de negociação ativa de {{discount}}% de desconto, o valor líquido total será de {{discountedTotal}}.', { discount, discountedTotal: formatCurrency(discountedTotal) }) + '\n';
        }

        if (paymentType === 'single') {
            body += t('financeiro.negotiation.email_body_single', 'Proposta para pagamento integral em parcela única com vencimento em: {{dueDate}}.', { dueDate: new Date(dueDate).toLocaleDateString('pt-PT') }) + '\n\n';
        } else {
            body += t('financeiro.negotiation.email_body_installments', 'Proposta para parcelamento do saldo em {{installmentsCount}} parcelas de {{value}} cada, iniciando em {{firstDate}}.', {
                installmentsCount,
                value: formatCurrency(discountedTotal / installmentsCount),
                firstDate: new Date(firstInstallmentDate).toLocaleDateString('pt-PT')
            }) + '\n\n';
        }

        body += t('financeiro.negotiation.email_body_footer', 'Ficamos no aguardo da vossa confirmação por este canal para formalizarmos o plano de pagamentos.\n\nAtenciosamente,\nAssessoria de Cobrança');

        // Convert newlines to html paragraphs for editor compatibility
        const bodyHtml = body.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');

        onOpenEmail(titulo, subject, bodyHtml);
    };

    // Save Negotiation Agreement
    const handleSaveAgreement = async () => {
        if (selectedTitles.length === 0) {
            toast.error(t('financeiro.negotiation.err_no_titles_selected', 'Por favor, selecione os títulos que estão incluídos neste acordo.'));
            return;
        }

        setIsSaving(true);
        try {
            const docsList = selectedTitles.map(t => t.Num_doc).join(', ');
            
            // 1. Process selected original titles
            for (const tItem of selectedTitles) {
                const newStatus = classification === 'legal' ? 'Judicial' : 'Negociado';
                const resUpdate = await updateContaReceber(tItem.id, { Status: newStatus });
                if (!resUpdate.success) throw resUpdate.error;

                // Log history on each original title
                const obsDesc = classification === 'legal'
                    ? `Título encaminhado para cobrança jurídica/judicial via assessoria de advocacia.`
                    : `Título quitado/retirado por acordo de negociação amigável. Integrado no parcelamento global de títulos.`;

                await saveObservacao({
                    conta_receber_id: tItem.id,
                    usuario: currentUser,
                    tipo: classification === 'legal' ? 'Acordo Judicial' : 'Acordo Amigável',
                    descricao: obsDesc,
                    data: new Date().toISOString()
                });
            }

            // 2. Generate new installment titles if amigavel (not legal forwarding)
            if (classification === 'friendly') {
                for (const inst of installmentPreview) {
                    const firstDoc = selectedTitles[0];
                    const numDoc = `NEG-${firstDoc.Num_doc.replace(/NEG-/g, '')}-P${inst.index}/${installmentPreview.length}`;

                    const newTitle = {
                        Empresa: firstDoc.Empresa,
                        CodCliente: firstDoc.CodCliente,
                        Cliente: firstDoc.Cliente,
                        Obra: firstDoc.Obra,
                        Num_doc: numDoc,
                        Data_emissao: new Date(),
                        Dt_venc: new Date(inst.dueDate),
                        Valot_total: inst.value,
                        Saldo_a_pagar: inst.value,
                        Status: 'A vencer',
                        categoria_id: firstDoc.categoria_id || null,
                        departamento_id: firstDoc.departamento_id || null,
                        obra_id: firstDoc.obra_id || null,
                        obs: `Acordo de negociação. Títulos de origem: ${docsList}`
                    };

                    const resCreate = await createContaReceber(newTitle);
                    if (!resCreate.success) throw resCreate.error;
                }
            }

            toast.success(t('financeiro.negotiation.success_saved', 'Acordo de negociação concluído e registrado com sucesso!'));
            onRefresh();
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(t('financeiro.negotiation.err_save', 'Erro ao salvar negociação: ') + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const clientName = titulo.Cliente || 'Cliente';
    const displayedTitles = activeTab === 'overdue' 
        ? overdueTitles 
        : activeTab === 'due_soon' 
            ? dueSoonTitles 
            : paidTitles;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-6 dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader className="flex-none">
                    <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                        <Handshake size={24} />
                        <DialogTitle className="text-xl font-bold">{t('financeiro.negotiation.modal_title', 'Central de Negociação de Inadimplência')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        {t('financeiro.negotiation.modal_desc', 'Gerencie acordos, conceda descontos, fragmente débitos e envie avisos de cobrança para o cliente.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 my-3">
                    {/* Left Column: Títulos & Histórico */}
                    <div className="lg:col-span-7 flex flex-col min-h-0 border dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                        <div className="p-4 border-b dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex justify-between items-center flex-none">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">{t('financeiro.negotiation.history_title', 'Histórico de Faturas do Cliente')}</h3>
                            <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-650 bg-indigo-50 font-bold dark:bg-indigo-950/30 dark:text-indigo-350 dark:border-indigo-850">
                                {clientName}
                            </Badge>
                        </div>

                        {/* Contacts Summary */}
                        <div className="p-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs flex-none">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Phone size={14} className="text-indigo-500" />
                                <span className="font-bold">{t('financeiro.negotiation.phone', 'Telefone:')}</span>
                                <span>{titulo.clienteInfo?.TelefonoCobros || 'Não cadastrado'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Mail size={14} className="text-indigo-500" />
                                <span className="font-bold">{t('financeiro.negotiation.email', 'E-mail:')}</span>
                                <span className="truncate" title={titulo.clienteInfo?.EmailCobros}>{titulo.clienteInfo?.EmailCobros || 'Não cadastrado'}</span>
                            </div>
                        </div>

                        {/* Status KPIs Row */}
                        <div className="grid grid-cols-3 gap-3 p-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex-none">
                            {/* Overdue KPI */}
                            <div 
                                onClick={() => setActiveTab('overdue')}
                                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                                    activeTab === 'overdue' 
                                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 shadow-sm' 
                                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <div className="text-[9px] uppercase font-bold tracking-wider text-red-650 dark:text-red-400">{t('financeiro.status.overdue', 'Vencidos')}</div>
                                <div className="text-sm font-black text-red-700 dark:text-red-450 mt-0.5">{formatCurrency(totalOverdueSum)}</div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{overdueTitles.length} {t('financeiro.negotiation.faturas', 'faturas')}</div>
                            </div>

                            {/* Due Soon KPI */}
                            <div 
                                onClick={() => setActiveTab('due_soon')}
                                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                                    activeTab === 'due_soon' 
                                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm' 
                                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <div className="text-[9px] uppercase font-bold tracking-wider text-blue-650 dark:text-blue-400">{t('financeiro.status.due_soon', 'A vencer')}</div>
                                <div className="text-sm font-black text-blue-700 dark:text-blue-450 mt-0.5">{formatCurrency(totalDueSoonSum)}</div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{dueSoonTitles.length} {t('financeiro.negotiation.faturas', 'faturas')}</div>
                            </div>

                            {/* Paid KPI */}
                            <div 
                                onClick={() => setActiveTab('paid')}
                                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                                    activeTab === 'paid' 
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm' 
                                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <div className="text-[9px] uppercase font-bold tracking-wider text-emerald-650 dark:text-emerald-450">{t('financeiro.status.paid', 'Pagos')}</div>
                                <div className="text-sm font-black text-emerald-700 dark:text-emerald-500 mt-0.5">{formatCurrency(totalPaidSum)}</div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">{paidTitles.length} {t('financeiro.negotiation.faturas', 'faturas')}</div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {displayedTitles.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 dark:text-slate-650 flex flex-col items-center justify-center gap-2">
                                    <AlertCircle size={24} className="text-slate-350 dark:text-slate-700" />
                                    <p className="text-xs font-semibold">{t('financeiro.negotiation.no_titles_in_category', 'Nenhuma fatura encontrada nesta categoria.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {displayedTitles.map((cTitle) => {
                                        const delay = cTitle.Dt_venc ? Math.floor((new Date().getTime() - new Date(cTitle.Dt_venc).getTime()) / (1000 * 3600 * 24)) : 0;
                                        const isPaid = cTitle.Status === 'Pago';
                                        const isNeg = cTitle.Status === 'Negociado';
                                        const isJud = cTitle.Status === 'Judicial';
                                        const selectDisabled = isPaid || isNeg;

                                        return (
                                            <div 
                                                key={cTitle.id} 
                                                className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-all ${
                                                    checkedIds.includes(cTitle.id)
                                                        ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-900 dark:bg-indigo-950/20'
                                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                                                    {!selectDisabled && (
                                                        <Checkbox 
                                                            checked={checkedIds.includes(cTitle.id)} 
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setCheckedIds([...checkedIds, cTitle.id]);
                                                                } else {
                                                                    setCheckedIds(checkedIds.filter(id => id !== cTitle.id));
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            <span className="truncate max-w-[140px]">{cTitle.Num_doc}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">({cTitle.Empresa})</span>
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                            <Calendar size={10} />
                                                            <span>Venc: {cTitle.Dt_venc ? new Date(cTitle.Dt_venc).toLocaleDateString('pt-PT') : 'N/A'}</span>
                                                            {delay > 0 && !isPaid && !isNeg && (
                                                                <span className="text-destructive font-semibold">({delay}d atraso)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-900 dark:text-slate-100">
                                                            {formatCurrency(isPaid ? cTitle.Valot_total : cTitle.Saldo_a_pagar)}
                                                        </div>
                                                        {!isPaid && cTitle.Valot_total !== cTitle.Saldo_a_pagar && (
                                                            <div className="text-[9px] text-muted-foreground line-through">{formatCurrency(cTitle.Valot_total)}</div>
                                                        )}
                                                    </div>
                                                    <div className="w-20 text-center">
                                                        {isPaid ? (
                                                            <Badge variant="default" className="text-[9px] py-0">{t('financeiro.status.paid', 'Pago')}</Badge>
                                                        ) : isJud ? (
                                                            <Badge variant="outline" className="border-red-650 text-red-650 bg-red-50 text-[9px] py-0">{t('financeiro.status.judicial', 'Jurídico')}</Badge>
                                                        ) : isNeg ? (
                                                            <Badge variant="outline" className="border-indigo-650 text-indigo-650 bg-indigo-50 text-[9px] py-0">{t('financeiro.status.negotiated', 'Negociado')}</Badge>
                                                        ) : isOverdue(cTitle) ? (
                                                            <Badge variant="destructive" className="text-[9px] py-0">{t('financeiro.status.overdue', 'Vencido')}</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[9px] py-0">{t('financeiro.status.due_soon', 'A vencer')}</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right Column: Acordo / Parametrização */}
                    <div className="lg:col-span-5 flex flex-col border dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-4 overflow-y-auto">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b pb-2 dark:border-slate-800">{t('financeiro.negotiation.proposal_title', 'Configurar Proposta de Acordo')}</h3>

                        {/* Classification Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('financeiro.negotiation.classification', 'Classificação do Acordo')}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    type="button"
                                    variant={classification === 'friendly' ? 'default' : 'outline'}
                                    onClick={() => setClassification('friendly')}
                                    className="text-xs h-9 gap-1 font-bold"
                                >
                                    <CheckCircle2 size={14} /> {t('financeiro.negotiation.friendly', 'Amigável')}
                                </Button>
                                <Button 
                                    type="button"
                                    variant={classification === 'legal' ? 'default' : 'outline'}
                                    onClick={() => setClassification('legal')}
                                    className={`text-xs h-9 gap-1 font-bold ${classification === 'legal' ? 'bg-red-700 hover:bg-red-800 text-white' : ''}`}
                                >
                                    <Scale size={14} /> {t('financeiro.negotiation.legal', 'Enviar ao Jurídico')}
                                </Button>
                            </div>
                        </div>

                        {classification === 'friendly' ? (
                            <>
                                {/* Discount Input */}
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                                        <span>{t('financeiro.negotiation.discount_label', 'Conceder Desconto (%)')}</span>
                                        {discount > 0 && <span className="text-green-600 font-bold">-{formatCurrency(discountAmount)}</span>}
                                    </Label>
                                    <div className="relative">
                                        <Percent size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                                        <Input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={discount === 0 ? '' : discount}
                                            onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                            placeholder="Ex: 10%"
                                            className="pl-8 text-xs font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Plan Type selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">{t('financeiro.negotiation.payment_plan', 'Plano de Pagamento')}</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            type="button"
                                            variant={paymentType === 'single' ? 'secondary' : 'outline'}
                                            onClick={() => setPaymentType('single')}
                                            className="text-xs h-8 font-semibold"
                                        >
                                            {t('financeiro.negotiation.single_payment', 'Cota Única')}
                                        </Button>
                                        <Button 
                                            type="button"
                                            variant={paymentType === 'installments' ? 'secondary' : 'outline'}
                                            onClick={() => setPaymentType('installments')}
                                            className="text-xs h-8 font-semibold"
                                        >
                                            {t('financeiro.negotiation.installments', 'Parcelar')}
                                        </Button>
                                    </div>
                                </div>

                                {/* Dynamic Plan Settings */}
                                {paymentType === 'single' ? (
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">{t('financeiro.negotiation.due_date', 'Data de Vencimento')}</Label>
                                        <Input 
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="text-xs font-semibold"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('financeiro.negotiation.installments_count', 'Nº de Parcelas')}</Label>
                                            <Input 
                                                type="number"
                                                min="2"
                                                max="60"
                                                value={installmentsCount}
                                                onChange={(e) => setInstallmentsCount(Math.max(2, Number(e.target.value)))}
                                                className="text-xs font-semibold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase">{t('financeiro.negotiation.first_installment', '1º Vencimento')}</Label>
                                            <Input 
                                                type="date"
                                                value={firstInstallmentDate}
                                                onChange={(e) => setFirstInstallmentDate(e.target.value)}
                                                className="text-xs font-semibold"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Installments Live Preview */}
                                <div className="border dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/30 space-y-2">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                        <span>{t('financeiro.negotiation.preview_title', 'Simulação das Parcelas')}</span>
                                        <span>{installmentPreview.length} {installmentPreview.length === 1 ? 'título' : 'títulos'}</span>
                                    </h4>
                                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                        {installmentPreview.map((item) => (
                                            <div key={item.index} className="flex justify-between items-center text-[11px] font-semibold py-1 border-b dark:border-slate-850 last:border-0">
                                                <span className="text-slate-600 dark:text-slate-350">Parcela {item.index}/{installmentPreview.length}</span>
                                                <span className="text-muted-foreground">Venc: {new Date(item.dueDate).toLocaleDateString('pt-PT')}</span>
                                                <span className="text-slate-900 dark:text-slate-100 font-bold">{formatCurrency(item.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="border border-red-200 bg-red-50/50 dark:border-red-950/20 dark:bg-red-950/10 p-3.5 rounded-lg flex gap-3 text-xs text-red-800 dark:text-red-300">
                                <AlertCircle className="shrink-0 mt-0.5 text-red-650" size={16} />
                                <div>
                                    <p className="font-bold">{t('financeiro.negotiation.legal_warning_title', 'Aviso de Encaminhamento Judicial')}</p>
                                    <p className="mt-1 leading-relaxed text-muted-foreground text-[11px]">
                                        {t('financeiro.negotiation.legal_warning_desc', 'Ao confirmar, todos os títulos vencidos selecionados serão catalogados com o status "Judicial". Isso suspende ações amigáveis e move a cobrança para a tab do departamento Jurídico.')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Summary Deck */}
                        <div className="bg-indigo-50/30 border border-indigo-100 dark:border-indigo-950/30 dark:bg-indigo-950/10 p-3 rounded-lg flex flex-col gap-1 text-xs mt-auto">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>{t('financeiro.negotiation.selected_count', 'Títulos Selecionados:')}</span>
                                <span className="font-bold">{selectedTitles.length} faturas</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>{t('financeiro.negotiation.original_debt', 'Dívida Original:')}</span>
                                <span className="font-semibold">{formatCurrency(originalTotal)}</span>
                            </div>
                            {discount > 0 && classification === 'friendly' && (
                                <div className="flex justify-between text-green-600">
                                    <span>{t('financeiro.negotiation.discount_applied', 'Desconto Concedido:')}</span>
                                    <span className="font-bold">-{formatCurrency(discountAmount)} ({discount}%)</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-800 dark:text-slate-200 border-t dark:border-indigo-950/40 pt-1.5 mt-1 font-bold text-sm">
                                <span>{classification === 'friendly' ? t('financeiro.negotiation.negotiated_debt', 'Dívida Acordada:') : t('financeiro.negotiation.legal_total', 'Total em Atraso:')}</span>
                                <span className="text-indigo-650 dark:text-indigo-400">{formatCurrency(classification === 'friendly' ? discountedTotal : originalTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-none gap-2 sm:gap-0 mt-3 pt-3 border-t dark:border-slate-800">
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        className="text-xs"
                    >
                        {t('financeiro.negotiation.btn_cancel', 'Cancelar')}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handlePrepareEmail}
                        disabled={selectedTitles.length === 0}
                        className="text-xs text-blue-650 hover:text-blue-700 hover:bg-blue-50 border-blue-200 gap-1.5"
                    >
                        <Mail size={14} /> {t('financeiro.negotiation.btn_prepare_email', 'Preparar E-mail')}
                    </Button>
                    <Button 
                        onClick={handleSaveAgreement} 
                        disabled={isSaving || selectedTitles.length === 0}
                        className={`text-xs gap-1.5 font-bold ${classification === 'legal' ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-primary text-white hover:bg-primary/95'}`}
                    >
                        {isSaving ? (
                            t('financeiro.negotiation.btn_saving', 'Processando...')
                        ) : classification === 'legal' ? (
                            <>
                                <Scale size={14} /> {t('financeiro.negotiation.btn_confirm_legal', 'Confirmar Judicial')}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} /> {t('financeiro.negotiation.btn_confirm_agreement', 'Confirmar Acordo')}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
