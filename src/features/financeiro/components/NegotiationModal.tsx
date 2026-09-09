import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Scale, CheckCircle2, AlertCircle, Phone, Calendar, Landmark, Percent, FileText, Handshake, X, Clock, Maximize2, Minimize2, Edit3, Sparkles, Send, MessageSquare, RefreshCw, ChevronDown, MessageCircle, PhoneCall } from 'lucide-react';
import { updateContaReceber, createContaReceber, saveObservacao, fetchObservacoesForTitles } from '../data/loader';
import { formatCurrency, formatDate } from '../lib/utils';
import type { EnrichedTitulo } from '../types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { BurofaxPreviewModal } from './BurofaxPreviewModal';
import { RichTextEditor } from './RichTextEditor';

export interface NegotiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    titulo: EnrichedTitulo;
    allTitles: EnrichedTitulo[];
    currentUser: string;
    onRefresh: () => void;
    onOpenEmail: (titulo: EnrichedTitulo, templateKey: 'friendly' | 'overdue' | 'legal' | 'negotiation', params?: any) => void;
}

const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
};

const getTypeBadge = (tipo: string) => {
    const lower = (tipo || '').toLowerCase();
    if (lower.includes('liga') || lower.includes('tel')) {
        return {
            label: 'Ligação Telefônica',
            icon: <PhoneCall size={12} className="shrink-0" />,
            badgeColor: 'bg-blue-100 text-blue-850 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
            dotColor: 'bg-blue-500 ring-blue-100 dark:ring-blue-900/50'
        };
    }
    if (lower.includes('enviado') || lower.includes('envio')) {
        return {
            label: 'E-mail Enviado',
            icon: <Send size={12} className="shrink-0" />,
            badgeColor: 'bg-indigo-100 text-indigo-850 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300',
            dotColor: 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-900/50'
        };
    }
    if (lower.includes('recebido') || lower.includes('recebeu')) {
        return {
            label: 'E-mail Recebido',
            icon: <Mail size={12} className="shrink-0" />,
            badgeColor: 'bg-cyan-100 text-cyan-850 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300',
            dotColor: 'bg-cyan-500 ring-cyan-100 dark:ring-cyan-900/50'
        };
    }
    if (lower.includes('whats') || lower.includes('zap')) {
        return {
            label: 'WhatsApp',
            icon: <MessageCircle size={12} className="shrink-0" />,
            badgeColor: 'bg-emerald-100 text-emerald-850 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
            dotColor: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50'
        };
    }
    if (lower.includes('simula')) {
        return {
            label: 'Simulação de Acordo',
            icon: <Clock size={12} className="shrink-0" />,
            badgeColor: 'bg-amber-100 text-amber-850 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
            dotColor: 'bg-amber-500 ring-amber-100 dark:ring-amber-900/50'
        };
    }
    if (lower.includes('amig') || lower.includes('acordo')) {
        return {
            label: 'Acordo Amigável',
            icon: <Handshake size={12} className="shrink-0" />,
            badgeColor: 'bg-purple-100 text-purple-850 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300',
            dotColor: 'bg-purple-500 ring-purple-100 dark:ring-purple-900/50'
        };
    }
    if (lower.includes('jurídico') || lower.includes('juridico') || lower.includes('masc') || lower.includes('burofax')) {
        return {
            label: 'Acordo Judicial / Burofax',
            icon: <Scale size={12} className="shrink-0" />,
            badgeColor: 'bg-red-100 text-red-850 border-red-300 dark:bg-red-950/60 dark:text-red-300',
            dotColor: 'bg-red-500 ring-red-100 dark:ring-red-900/50'
        };
    }
    return {
        label: tipo || 'Interação',
        icon: <MessageSquare size={12} className="shrink-0" />,
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
        dotColor: 'bg-slate-400 ring-slate-100 dark:ring-slate-800'
    };
};

interface ClientTimelineViewProps {
    clientHistory: any[];
    isLoadingHistory: boolean;
    quickObsType: string;
    setQuickObsType: (val: string) => void;
    quickObsText: string;
    setQuickObsText: (val: string) => void;
    quickObsTitleId: string;
    setQuickObsTitleId: (val: string) => void;
    isSavingQuickObs: boolean;
    handleSaveQuickObs: () => Promise<void>;
    loadClientHistory: () => Promise<void>;
    clientTitles: EnrichedTitulo[];
    setSelectedHistoryImage: (val: string | null) => void;
    isHtml: (str: string) => boolean;
}

const ClientTimelineView = ({
    clientHistory,
    isLoadingHistory,
    quickObsType,
    setQuickObsType,
    quickObsText,
    setQuickObsText,
    quickObsTitleId,
    setQuickObsTitleId,
    isSavingQuickObs,
    handleSaveQuickObs,
    loadClientHistory,
    clientTitles,
    setSelectedHistoryImage,
    isHtml
}: ClientTimelineViewProps) => {
    return (
        <div className="space-y-4">
            {/* Quick Contact Form */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border dark:border-slate-800 rounded-xl p-3 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                        <Edit3 size={13} className="text-purple-600 dark:text-purple-400" />
                        <span>Registrar Novo Contato / Ocorrência</span>
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={loadClientHistory}
                        className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1"
                        title="Atualizar linha do tempo"
                    >
                        <RefreshCw size={11} className={isLoadingHistory ? 'animate-spin' : ''} />
                        <span>Atualizar</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">Tipo de Interação</label>
                        <select
                            value={quickObsType}
                            onChange={(e) => setQuickObsType(e.target.value)}
                            className="w-full text-xs h-8 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                        >
                            <option value="Ligação Telefônica">📞 Ligação Telefônica</option>
                            <option value="E-mail Enviado">✉️ E-mail Enviado</option>
                            <option value="E-mail Recebido">📥 E-mail Recebido</option>
                            <option value="WhatsApp">💬 Mensagem WhatsApp</option>
                            <option value="Anotação de Cobrança">📝 Anotação / Reunião</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 block">Fatura Relacionada</label>
                        <select
                            value={quickObsTitleId}
                            onChange={(e) => setQuickObsTitleId(e.target.value)}
                            className="w-full text-xs h-8 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                        >
                            {clientTitles.map((t) => (
                                <option key={t.id} value={t.id}>
                                    Fatura {t.Num_doc} - {formatCurrency(t.Saldo_a_pagar || t.Valot_total)} ({t.Status})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-1.5 pt-0.5">
                    <textarea
                        value={quickObsText}
                        onChange={(e) => setQuickObsText(e.target.value)}
                        placeholder="Descreva o contato (ex: Ligamos cobrando a fatura, responderam que o pagamento será feito no dia 15)..."
                        rows={2}
                        className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none leading-relaxed"
                    />
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveQuickObs}
                            disabled={isSavingQuickObs || !quickObsText.trim()}
                            className="h-7 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-xs"
                        >
                            {isSavingQuickObs ? (
                                <RefreshCw size={12} className="animate-spin" />
                            ) : (
                                <Send size={12} />
                            )}
                            <span>Salvar no Histórico</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Timeline Stream */}
            {isLoadingHistory ? (
                <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-purple-500" />
                    <span>Carregando histórico do cliente...</span>
                </div>
            ) : clientHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 dark:text-slate-600 flex flex-col items-center justify-center gap-2 border border-dashed rounded-xl p-6 bg-slate-50/50 dark:bg-slate-950/20">
                    <Clock size={28} className="text-slate-300 dark:text-slate-700" />
                    <p className="text-xs font-semibold">Nenhuma ocorrência registrada para este cliente ainda.</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm">Use o formulário acima para registrar a primeira ligação, e-mail enviado ou conversa mantida com o cliente.</p>
                </div>
            ) : (
                <div className="relative pl-4 ml-2 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 py-1">
                    {clientHistory.map((item, idx) => {
                        const badgeInfo = getTypeBadge(item.tipo);
                        const dateObj = new Date(item.data);
                        const formattedDate = dateObj.toLocaleDateString('pt-PT') + ' às ' + dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={item.id || idx} className="relative group">
                                <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ${badgeInfo.dotColor} transition-transform group-hover:scale-125`} />
                                
                                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg p-3 hover:shadow-xs transition-all space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 flex items-center gap-1 ${badgeInfo.badgeColor}`}>
                                                {badgeInfo.icon}
                                                <span>{badgeInfo.label}</span>
                                            </Badge>
                                            {item.docRef && (
                                                <Badge variant="secondary" className="text-[10px] py-0 font-mono text-slate-600 dark:text-slate-300">
                                                    Doc: {item.docRef}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium">
                                            <span>{formattedDate}</span>
                                            {item.usuario && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.usuario}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isHtml(item.descricao) ? (
                                        <div 
                                            className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed prose prose-xs dark:prose-invert max-w-none break-words [&_img]:max-w-full [&_img]:max-h-[220px] [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 dark:[&_img]:border-slate-800 [&_img]:shadow-xs [&_img]:my-1.5 [&_img]:object-contain [&_img]:cursor-zoom-in" 
                                            dangerouslySetInnerHTML={{ __html: item.descricao }} 
                                            onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.tagName === 'IMG') {
                                                    setSelectedHistoryImage((target as HTMLImageElement).src);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <p className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap break-words leading-relaxed font-normal">
                                            {item.descricao}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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

    const [isBurofaxOpen, setIsBurofaxOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overdue' | 'due_soon' | 'paid' | 'simulations' | 'history'>('overdue');

    // Checked titles for negotiation (default to the clicked title if not paid)
    const [checkedIds, setCheckedIds] = useState<string[]>([]);

    // Negotiation options states
    const [classification, setClassification] = useState<'friendly' | 'legal'>('friendly');
    const [discount, setDiscount] = useState<number>(0);
    const [inputPercent, setInputPercent] = useState<string>('0');
    const [inputValue, setInputValue] = useState<string>('0');

    // Observations Rich Text State
    const [observacoes, setObservacoes] = useState<string>('');
    const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);
    const [rightPanelTab, setRightPanelTab] = useState<'proposal' | 'notes' | 'history'>('proposal');

    // Simulations States
    const [simulations, setSimulations] = useState<any[]>([]);
    const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);
    const [isSavingSimulation, setIsSavingSimulation] = useState(false);

    // Client History / Timeline States
    const [clientHistory, setClientHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedHistoryImage, setSelectedHistoryImage] = useState<string | null>(null);

    // Quick History Log States
    const [quickObsType, setQuickObsType] = useState('Ligação Telefônica');
    const [quickObsText, setQuickObsText] = useState('');
    const [quickObsTitleId, setQuickObsTitleId] = useState<string>('');
    const [isSavingQuickObs, setIsSavingQuickObs] = useState(false);

    const isHtmlContent = (str: string) => {
        if (!str) return false;
        return /<[a-z][\s\S]*>/i.test(str) || str.includes('<img') || str.includes('<div') || str.includes('<p') || str.includes('<br') || str.includes('<span');
    };

    // Calculations
    const selectedTitles = clientTitles.filter(t => checkedIds.includes(t.id));
    const originalTotal = selectedTitles.reduce((acc, curr) => acc + (curr.Saldo_a_pagar || 0), 0);
    const discountAmount = originalTotal * (discount / 100);
    const discountedTotal = Math.max(0, originalTotal - discountAmount);

    const loadSimulations = async () => {
        if (!titulo) return;
        setIsLoadingSimulations(true);
        try {
            let query = supabase
                .from('cobranca_simulacoes')
                .select('*');

            if (titulo.CodCliente) {
                query = query.or(`cod_cliente.eq."${titulo.CodCliente}",cliente_nome.ilike."${titulo.Cliente}"`);
            } else {
                query = query.ilike('cliente_nome', titulo.Cliente || '');
            }

            const { data, error } = await query.order('creado_em', { ascending: false });

            if (error) throw error;
            setSimulations(data || []);
        } catch (err) {
            console.error('Failed to load simulations:', err);
        } finally {
            setIsLoadingSimulations(false);
        }
    };

    const loadClientHistory = async () => {
        if (!clientTitles || clientTitles.length === 0) return;
        setIsLoadingHistory(true);
        try {
            const ids = clientTitles.map(t => t.id).filter(Boolean);
            const data = await fetchObservacoesForTitles(ids);
            const docMap = new Map<string, string>();
            clientTitles.forEach(t => docMap.set(t.id, t.Num_doc));
            const enriched = (data || []).map((o: any) => ({
                ...o,
                docRef: docMap.get(o.conta_receber_id) || ''
            }));
            setClientHistory(enriched);
        } catch (err) {
            console.error('Failed to load client history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleSaveQuickObs = async () => {
        if (!quickObsText.trim()) {
            toast.error(t('financeiro.negotiation.err_empty_obs', 'Digite o detalhe da ocorrência / contato.'));
            return;
        }
        setIsSavingQuickObs(true);
        try {
            const targetId = quickObsTitleId || titulo.id;
            const obsToSave = {
                conta_receber_id: targetId,
                usuario: currentUser,
                tipo: quickObsType,
                descricao: quickObsText.trim(),
                data: new Date().toISOString()
            };
            const res = await saveObservacao(obsToSave);
            if (!res.success) throw res.error;
            toast.success(t('financeiro.negotiation.quick_obs_success', 'Registro adicionado ao histórico com sucesso!'));
            setQuickObsText('');
            await loadClientHistory();
            onRefresh();
        } catch (err: any) {
            toast.error(t('financeiro.negotiation.err_quick_obs', 'Erro ao salvar histórico: ') + err.message);
        } finally {
            setIsSavingQuickObs(false);
        }
    };

    const handleApplySimulation = (sim: any) => {
        setClassification(sim.classificacao || 'friendly');
        setDiscount(Number(sim.desconto_percentual) || 0);
        
        const pct = Number(sim.desconto_percentual) || 0;
        setInputPercent(pct === 0 ? '0' : pct.toString());
        
        const val = Number(sim.desconto_valor) || 0;
        setInputValue(val === 0 ? '0' : val.toString());

        setPaymentType(sim.tipo_pagamento || 'single');
        setInstallmentsCount(Number(sim.parcelas_qtd) || 3);
        
        if (sim.vencimento_parcelas && sim.vencimento_parcelas.length > 0) {
            if (sim.tipo_pagamento === 'single') {
                setDueDate(sim.vencimento_parcelas[0].dueDate);
            } else {
                setFirstInstallmentDate(sim.vencimento_parcelas[0].dueDate);
            }
        }

        if (Array.isArray(sim.original_ids)) {
            setCheckedIds(sim.original_ids);
        }

        if (sim.observacoes) {
            setObservacoes(sim.observacoes);
        } else {
            setObservacoes('');
        }

        setActiveTab('overdue');
        toast.success(t('financeiro.negotiation.sim_applied', 'Simulação restaurada com sucesso!'));
    };

    const handleDeleteSimulation = async (simId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(t('financeiro.negotiation.confirm_delete_sim', 'Tem certeza de que deseja excluir esta simulação?'))) return;
        try {
            const { error } = await supabase
                .from('cobranca_simulacoes')
                .delete()
                .eq('id', simId);
            if (error) throw error;
            toast.success(t('financeiro.negotiation.sim_deleted', 'Simulação excluída com sucesso.'));
            loadSimulations();
            loadClientHistory();
            onRefresh();
        } catch (err: any) {
            toast.error(t('financeiro.negotiation.err_delete_sim', 'Erro ao excluir simulação: ') + err.message);
        }
    };

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

            // Reset discount inputs
            setDiscount(0);
            setInputPercent('0');
            setInputValue('0');
            setObservacoes('');
            setIsNotesExpanded(false);
            setRightPanelTab('proposal');
            setQuickObsTitleId(titulo.id?.toString() || '');

            loadSimulations();
            loadClientHistory();
        }
    }, [isOpen, titulo]);

    // Recalculate discount value when selected titles change
    useEffect(() => {
        const pct = parseFloat(inputPercent) || 0;
        const amt = originalTotal * (pct / 100);
        setInputValue(amt === 0 ? '0' : amt.toFixed(2));
    }, [originalTotal]);

    const handlePercentInputChange = (val: string) => {
        setInputPercent(val);
        const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
        setDiscount(pct);
        const amt = originalTotal * (pct / 100);
        setInputValue(amt === 0 ? '' : amt.toFixed(2));
    };

    const handleValueInputChange = (val: string) => {
        setInputValue(val);
        const amt = Math.min(originalTotal, Math.max(0, parseFloat(val) || 0));
        if (originalTotal > 0) {
            const pct = (amt / originalTotal) * 100;
            setDiscount(pct);
            setInputPercent(pct === 0 ? '' : pct.toFixed(2));
        } else {
            setDiscount(0);
            setInputPercent('0');
        }
    };

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
        onOpenEmail(titulo, 'negotiation', {
            selectedTitles,
            originalTotal,
            discount,
            discountedTotal,
            paymentType,
            dueDate,
            installmentsCount,
            firstInstallmentDate
        });
    };

    const handleSelectAll = () => {
        const selectableIds = displayedTitles
            .filter(t => t.Status !== 'Pago' && t.Status !== 'Negociado')
            .map(t => t.id);
        const newCheckedIds = Array.from(new Set([...checkedIds, ...selectableIds]));
        setCheckedIds(newCheckedIds);
    };

    const handleDeselectAll = () => {
        const displayedIds = displayedTitles.map(t => t.id);
        setCheckedIds(checkedIds.filter(id => !displayedIds.includes(id)));
    };

    // Save Negotiation Simulation
    const handleSaveSimulation = async () => {
        if (selectedTitles.length === 0) {
            toast.error(t('financeiro.negotiation.err_no_titles_selected', 'Por favor, selecione ao menos um título para a simulação.'));
            return;
        }

        setIsSavingSimulation(true);
        try {
            const installmentPreview = getInstallmentPreview();
            const plainObs = stripHtml(observacoes);
            
            const simulationData = {
                titulo_id: titulo.id?.toString() || '',
                cod_cliente: titulo.CodCliente || '',
                cliente_nome: titulo.Cliente || '',
                original_ids: checkedIds,
                original_total: originalTotal,
                desconto_percentual: discount,
                desconto_valor: discountAmount,
                valor_acordado: classification === 'friendly' ? discountedTotal : originalTotal,
                tipo_pagamento: paymentType,
                parcelas_qtd: paymentType === 'single' ? 1 : installmentsCount,
                vencimento_parcelas: installmentPreview,
                classificacao: classification,
                status: 'Pendente',
                observacoes: observacoes ? observacoes.trim() : null,
                creado_por: currentUser
            };

            const { error } = await supabase
                .from('cobranca_simulacoes')
                .insert([simulationData]);

            if (error) throw error;

            // Also register an observation on this invoice's history!
            const obsToSave = {
                conta_receber_id: titulo.id,
                usuario: currentUser,
                tipo: 'Simulação Salva',
                descricao: `Simulação de acordo salva (${classification === 'friendly' ? 'Amigável' : 'Jurídico'}): Valor acordado de ${formatCurrency(simulationData.valor_acordado)} com ${discount > 0 ? `${discount}% de desconto` : 'sem desconto'}. Pagamento: ${paymentType === 'single' ? 'Parcela Única' : `${installmentsCount}x`}.${plainObs ? `\n\nObservações:\n${plainObs}` : ''}`,
                data: new Date().toISOString()
            };
            await saveObservacao(obsToSave);

            toast.success(t('financeiro.negotiation.sim_saved_success', 'Simulação de acordo salva com sucesso!'));
            loadSimulations();
            loadClientHistory();
            onRefresh();
        } catch (err: any) {
            console.error('Error saving simulation:', err);
            toast.error(t('financeiro.negotiation.err_saving_sim', 'Erro ao salvar simulação: ') + (err.message || String(err)));
        } finally {
            setIsSavingSimulation(false);
        }
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
            const plainObs = stripHtml(observacoes);
            
            // 1. Process selected original titles
            for (const tItem of selectedTitles) {
                const newStatus = classification === 'legal' ? 'Judicial' : 'Negociado';
                const resUpdate = await updateContaReceber(tItem.id, { Status: newStatus });
                if (!resUpdate.success) throw resUpdate.error;

                // Log history on each original title
                const baseDesc = classification === 'legal'
                    ? `Título encaminhado para o departamento Jurídico (Monitorio). Gerado e impresso o requerimento formal de pagamento (Burofax / MASC) em conformidade com a Ley 3/2004 de combate à inadimplência comercial em Espanha.`
                    : `Título quitado/retirado por acordo de negociação amigável. Integrado no parcelamento global de títulos.`;

                const obsDesc = plainObs ? `${baseDesc}\n\nObservações da Negociação:\n${plainObs}` : baseDesc;

                await saveObservacao({
                    conta_receber_id: tItem.id,
                    usuario: currentUser,
                    tipo: classification === 'legal' ? 'Acordo Judicial (MASC)' : 'Acordo Amigável',
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
                        Integral_parcial: 'Negociado',
                        categoria_id: firstDoc.categoria_id || null,
                        departamento_id: firstDoc.departamento_id || null,
                        obra_id: firstDoc.obra_id || null,
                        obs: plainObs 
                            ? `Acordo de negociação: ${plainObs.slice(0, 300)}. Títulos de origem: ${docsList}`
                            : `Acordo de negociação. Títulos de origem: ${docsList}`
                    };

                    const resCreate = await createContaReceber(newTitle);
                    if (!resCreate.success) throw resCreate.error;
                }
            }

            toast.success(classification === 'legal'
                ? t('financeiro.negotiation.success_saved_legal', 'Acordo Judicial registrado e Burofax emitido!')
                : t('financeiro.negotiation.success_saved', 'Acordo de negociação concluído e registrado com sucesso!')
            );
            onRefresh();
            setIsBurofaxOpen(false);
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
            : activeTab === 'paid'
                ? paidTitles
                : [];

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
                <DialogContent className="sm:max-w-7xl max-h-[94vh] flex flex-col p-6 dark:bg-slate-900 dark:border-slate-800">
                <DialogHeader className="flex-none">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
                            <Handshake size={24} />
                            <DialogTitle className="text-xl font-bold">{t('financeiro.negotiation.modal_title', 'Central de Negociação de Inadimplência')}</DialogTitle>
                        </div>
                        {isNotesExpanded && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsNotesExpanded(false)}
                                className="h-8 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-slate-50 gap-1.5 shadow-xs"
                            >
                                <Minimize2 size={14} />
                                <span>{t('financeiro.negotiation.btn_minimize_space', 'Voltar à Visão Dividida')}</span>
                            </Button>
                        )}
                    </div>
                    <DialogDescription className="text-xs">
                        {t('financeiro.negotiation.modal_desc', 'Gerencie acordos, conceda descontos, fragmente débitos e envie avisos de cobrança para o cliente.')}
                    </DialogDescription>
                </DialogHeader>

                {isNotesExpanded ? (
                    /* Full-Screen Observation Mode (Maximum Space) */
                    <div className="flex flex-col flex-1 min-h-0 border dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-3 my-3">
                        {/* Top Summary Ribbon */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg flex-none">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-650 bg-indigo-50 font-bold dark:bg-indigo-950/50 dark:text-indigo-350">
                                    {clientName}
                                </Badge>
                                <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2">
                                    <span>{selectedTitles.length} {t('financeiro.negotiation.faturas', 'faturas')}</span>
                                    <span>•</span>
                                    <span>{t('financeiro.negotiation.original_debt', 'Dívida:')} <strong>{formatCurrency(originalTotal)}</strong></span>
                                    <span>•</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{t('financeiro.negotiation.agreed_value', 'Valor Acordado:')} {formatCurrency(classification === 'friendly' ? discountedTotal : originalTotal)}</span>
                                    <span>•</span>
                                    <span className="text-slate-500 font-normal">({classification === 'friendly' ? 'Amigável' : 'Jurídico'} - {paymentType === 'single' ? 'Cota Única' : `${installmentsCount} parcelas`})</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsNotesExpanded(false)}
                                className="h-8 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-slate-50 gap-1.5 shadow-xs"
                            >
                                <Minimize2 size={14} />
                                <span>{t('financeiro.negotiation.btn_minimize_space', 'Voltar à Visão Dividida')}</span>
                            </Button>
                        </div>

                        {/* Full-width RichTextEditor */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex justify-between items-center pb-2 flex-none">
                                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={15} className="text-indigo-500" />
                                    <span>{t('financeiro.negotiation.notes_title', 'Observações & Ata da Negociação (Modo Espaço Máximo)')}</span>
                                </Label>
                                <span className="text-[11px] text-muted-foreground">Formatação rica em tempo real • Gravação automática na simulação</span>
                            </div>
                            <div className="flex-1 min-h-0">
                                <RichTextEditor
                                    value={observacoes}
                                    onChange={setObservacoes}
                                    minHeight="430px"
                                    placeholder={t('financeiro.negotiation.notes_placeholder', 'Digite aqui as observações, ata da negociação, motivos do desconto, acordos verbais firmados com o cliente...')}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 my-3">
                        {/* Left Column: Títulos & Histórico */}
                        <div className="lg:col-span-7 flex flex-col min-h-0 border dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                            <div className="p-4 border-b dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex justify-between items-center flex-none">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">{t('financeiro.negotiation.history_title', 'Histórico de Faturas do Cliente')}</h3>
                                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-650 bg-indigo-50 font-bold dark:bg-indigo-950/30 dark:text-indigo-350 dark:border-indigo-850">
                                    {clientName}
                                </Badge>
                            </div>

                            {/* Contacts Summary & History Action */}
                            <div className="p-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 text-xs flex-none">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Phone size={14} className="text-indigo-500" />
                                        <span className="font-bold">{t('financeiro.negotiation.phone', 'Telefone:')}</span>
                                        <span>{titulo.clienteInfo?.TelefonoCobros || 'Não cadastrado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Mail size={14} className="text-indigo-500" />
                                        <span className="font-bold">{t('financeiro.negotiation.email', 'E-mail:')}</span>
                                        <span className="truncate max-w-[200px]" title={titulo.clienteInfo?.EmailCobros}>{titulo.clienteInfo?.EmailCobros || 'Não cadastrado'}</span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab(activeTab === 'history' ? 'overdue' : 'history')}
                                    className={`h-7 px-2.5 text-xs font-bold gap-1.5 transition-all shadow-xs ${
                                        activeTab === 'history'
                                            ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                                            : 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                    }`}
                                >
                                    <Clock size={13} />
                                    <span>{t('financeiro.negotiation.btn_timeline', 'Histórico / Linha do Tempo')} ({clientHistory.length})</span>
                                </Button>
                            </div>

                            {/* Status KPIs Row */}
                            <div className="grid grid-cols-5 gap-2 p-3 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex-none">
                                {/* Overdue KPI */}
                                <div 
                                    onClick={() => setActiveTab('overdue')}
                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
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
                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
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
                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                        activeTab === 'paid' 
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm' 
                                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div className="text-[9px] uppercase font-bold tracking-wider text-emerald-650 dark:text-emerald-450">{t('financeiro.status.paid', 'Pagos')}</div>
                                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-500 mt-0.5">{formatCurrency(totalPaidSum)}</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">{paidTitles.length} {t('financeiro.negotiation.faturas', 'faturas')}</div>
                                </div>

                                {/* Simulations KPI */}
                                <div 
                                    onClick={() => setActiveTab('simulations')}
                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                        activeTab === 'simulations' 
                                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm' 
                                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div className="text-[9px] uppercase font-bold tracking-wider text-indigo-650 dark:text-indigo-400">{t('financeiro.negotiation.tab_simulations', 'Simulações')}</div>
                                    <div className="text-sm font-black text-indigo-750 dark:text-indigo-400 mt-0.5">{simulations.length}</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">{t('financeiro.negotiation.saved_drafts', 'salvas')}</div>
                                </div>

                                {/* History KPI */}
                                <div 
                                    onClick={() => setActiveTab('history')}
                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                        activeTab === 'history' 
                                            ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm' 
                                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                    }`}
                                >
                                    <div className="text-[9px] uppercase font-bold tracking-wider text-purple-650 dark:text-purple-400 flex items-center justify-between">
                                        <span>{t('financeiro.negotiation.tab_history', 'Histórico')}</span>
                                        <Clock size={11} />
                                    </div>
                                    <div className="text-sm font-black text-purple-750 dark:text-purple-400 mt-0.5">{clientHistory.length}</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5 truncate">{t('financeiro.negotiation.history_sub', 'interações')}</div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 p-4">
                                {activeTab === 'history' ? (
                                    <ClientTimelineView
                                        clientHistory={clientHistory}
                                        isLoadingHistory={isLoadingHistory}
                                        quickObsType={quickObsType}
                                        setQuickObsType={setQuickObsType}
                                        quickObsText={quickObsText}
                                        setQuickObsText={setQuickObsText}
                                        quickObsTitleId={quickObsTitleId}
                                        setQuickObsTitleId={setQuickObsTitleId}
                                        isSavingQuickObs={isSavingQuickObs}
                                        handleSaveQuickObs={handleSaveQuickObs}
                                        loadClientHistory={loadClientHistory}
                                        clientTitles={clientTitles}
                                        setSelectedHistoryImage={setSelectedHistoryImage}
                                        isHtml={isHtml}
                                    />
                                ) : activeTab === 'simulations' ? (
                                    <div className="space-y-3">
                                        {isLoadingSimulations ? (
                                            <div className="text-center py-6 text-xs text-muted-foreground">
                                                {t('financeiro.negotiation.loading_sims', 'Carregando simulações...')}
                                            </div>
                                        ) : simulations.length === 0 ? (
                                            <div className="text-center py-10 text-slate-400 dark:text-slate-650 flex flex-col items-center justify-center gap-2">
                                                <AlertCircle size={24} className="text-slate-350 dark:text-slate-700" />
                                                <p className="text-xs font-semibold">{t('financeiro.negotiation.no_sims_saved', 'Nenhuma simulação salva para este cliente.')}</p>
                                            </div>
                                        ) : (
                                            simulations.map((sim) => {
                                                const simDate = sim.creado_em ? new Date(sim.creado_em).toLocaleString('pt-PT') : 'N/A';
                                                return (
                                                    <div 
                                                        key={sim.id}
                                                        className="p-3 border dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="space-y-1 flex-1 min-w-0 pr-2">
                                                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                                <Handshake size={14} className="text-indigo-500 shrink-0" />
                                                                <span>Acordo de {formatCurrency(Number(sim.valor_acordado))}</span>
                                                                <Badge variant="secondary" className="text-[10px] scale-90">
                                                                    {sim.classificacao === 'friendly' ? 'Amigável' : 'Jurídico'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                <span>Salvo em {simDate} por <strong>{sim.creado_por || 'Sistema'}</strong></span>
                                                            </div>
                                                            <div className="text-slate-600 dark:text-slate-300 font-semibold space-x-2">
                                                                <span>Dívida original: {formatCurrency(Number(sim.original_total))}</span>
                                                                {Number(sim.desconto_percentual) > 0 && (
                                                                    <span className="text-green-600 font-bold">Desconto: {sim.desconto_percentual}% (-{formatCurrency(Number(sim.desconto_valor))})</span>
                                                                )}
                                                                <span>• {sim.tipo_pagamento === 'single' ? 'Parcela única' : `${sim.parcelas_qtd} parcelas`}</span>
                                                            </div>
                                                            {sim.observacoes && (
                                                                <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 text-xs">
                                                                    <div className="flex items-center gap-1 font-bold text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                                                        <FileText size={12} />
                                                                        <span>{t('financeiro.negotiation.notes_label', 'Observações da Negociação:')}</span>
                                                                    </div>
                                                                    <div 
                                                                        className="prose prose-xs dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer leading-relaxed text-[11px]"
                                                                        dangerouslySetInnerHTML={{ __html: sim.observacoes }}
                                                                        title="Clique para expandir/recolher"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <Button 
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleApplySimulation(sim)}
                                                                className="text-xs h-8 text-indigo-650 hover:text-indigo-700 font-bold border-indigo-200"
                                                            >
                                                                Restaurar
                                                            </Button>
                                                            <Button 
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={(e) => handleDeleteSimulation(sim.id, e)}
                                                                className="text-xs h-8 w-8 text-red-650 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <X size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : displayedTitles.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 dark:text-slate-650 flex flex-col items-center justify-center gap-2">
                                        <AlertCircle size={24} className="text-slate-350 dark:text-slate-700" />
                                        <p className="text-xs font-semibold">{t('financeiro.negotiation.no_titles_in_category', 'Nenhuma fatura encontrada nesta categoria.')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(activeTab === 'overdue' || activeTab === 'due_soon') && (
                                            <div className="flex justify-between items-center pb-2 mb-2 border-b dark:border-slate-800 text-[11px] text-slate-500 font-semibold">
                                                <span>
                                                    {displayedTitles.filter(t => checkedIds.includes(t.id)).length} de {displayedTitles.filter(t => t.Status !== 'Pago' && t.Status !== 'Negociado').length} faturas selecionadas
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAll}
                                                        className="text-indigo-650 dark:text-indigo-400 hover:underline font-bold transition-all"
                                                    >
                                                        {t('financeiro.negotiation.select_all', 'Selecionar Todos')}
                                                    </button>
                                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselectAll}
                                                        className="text-slate-550 dark:text-slate-400 hover:underline font-bold transition-all"
                                                    >
                                                        {t('financeiro.negotiation.deselect_all', 'Desmarcar Todos')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
                            <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800 flex-none">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">{t('financeiro.negotiation.proposal_title', 'Configurar Proposta de Acordo')}</h3>
                                
                                {/* Panel Tab Pill */}
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setRightPanelTab('proposal')}
                                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1.5 ${
                                            rightPanelTab === 'proposal'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        <Handshake size={13} />
                                        <span>{t('financeiro.negotiation.tab_proposal', 'Proposta')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRightPanelTab('notes')}
                                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1.5 ${
                                            rightPanelTab === 'notes'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        <FileText size={13} />
                                        <span>{t('financeiro.negotiation.tab_notes', 'Observações')}</span>
                                        {observacoes && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRightPanelTab('history')}
                                        className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1.5 ${
                                            rightPanelTab === 'history'
                                                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                        }`}
                                    >
                                        <Clock size={13} />
                                        <span>{t('financeiro.negotiation.tab_timeline', 'Histórico')}</span>
                                        {clientHistory.length > 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                                {clientHistory.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {rightPanelTab === 'proposal' ? (
                                <>
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
                                            {/* Discount Inputs Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                        {t('financeiro.negotiation.discount_percent', 'Desconto (%)')}
                                                    </Label>
                                                    <div className="relative">
                                                        <Percent size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                                                        <Input 
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            value={inputPercent === '0' ? '' : inputPercent}
                                                            onChange={(e) => handlePercentInputChange(e.target.value)}
                                                            placeholder="Ex: 10%"
                                                            className="pl-8 text-xs font-semibold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                                                        {t('financeiro.negotiation.discount_value', 'Desconto (Valor €)')}
                                                    </Label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground">€</span>
                                                        <Input 
                                                            type="number"
                                                            min="0"
                                                            max={originalTotal}
                                                            step="0.01"
                                                            value={inputValue === '0' ? '' : inputValue}
                                                            onChange={(e) => handleValueInputChange(e.target.value)}
                                                            placeholder="Ex: 500"
                                                            className="pl-6 text-xs font-semibold"
                                                        />
                                                    </div>
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
                                                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
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

                                    {/* Embedded Observações in proposal view */}
                                    <div className="border dark:border-slate-800 rounded-lg p-3 bg-slate-50/70 dark:bg-slate-950/30 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <FileText size={14} className="text-indigo-500" />
                                                <span>{t('financeiro.negotiation.notes_title', 'Observações da Negociação')}</span>
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsNotesExpanded(true)}
                                                className="h-6 px-2 text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 font-semibold"
                                                title="Expandir campo para espaço máximo"
                                            >
                                                <Maximize2 size={11} />
                                                <span>{t('financeiro.negotiation.btn_expand_space', 'Espaço Máximo')}</span>
                                            </Button>
                                        </div>
                                        <RichTextEditor
                                            value={observacoes}
                                            onChange={setObservacoes}
                                            minHeight="160px"
                                            placeholder={t('financeiro.negotiation.notes_placeholder', 'Digite aqui as observações, ata da negociação, motivos do desconto, acordos verbais firmados com o cliente...')}
                                        />
                                    </div>
                                </>
                            ) : rightPanelTab === 'notes' ? (
                                /* Full-height Observações Tab in Right Panel */
                                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                                    <div className="flex justify-between items-center pb-1">
                                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText size={14} className="text-indigo-500" />
                                            <span>{t('financeiro.negotiation.notes_title', 'Observações & Ata')}</span>
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsNotesExpanded(true)}
                                            className="h-7 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 font-semibold"
                                            title="Expandir campo para espaço máximo"
                                        >
                                            <Maximize2 size={12} />
                                            <span>{t('financeiro.negotiation.btn_expand_space', 'Espaço Máximo')}</span>
                                        </Button>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <RichTextEditor
                                            value={observacoes}
                                            onChange={setObservacoes}
                                            minHeight="360px"
                                            placeholder={t('financeiro.negotiation.notes_placeholder', 'Digite aqui as observações, ata da negociação, motivos do desconto, acordos verbais firmados com o cliente...')}
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Full-height Timeline in Right Panel */
                                <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-y-auto pr-1">
                                    <ClientTimelineView
                                        clientHistory={clientHistory}
                                        isLoadingHistory={isLoadingHistory}
                                        quickObsType={quickObsType}
                                        setQuickObsType={setQuickObsType}
                                        quickObsText={quickObsText}
                                        setQuickObsText={setQuickObsText}
                                        quickObsTitleId={quickObsTitleId}
                                        setQuickObsTitleId={setQuickObsTitleId}
                                        isSavingQuickObs={isSavingQuickObs}
                                        handleSaveQuickObs={handleSaveQuickObs}
                                        loadClientHistory={loadClientHistory}
                                        clientTitles={clientTitles}
                                        setSelectedHistoryImage={setSelectedHistoryImage}
                                        isHtml={isHtml}
                                    />
                                </div>
                            )}

                            {/* Summary Deck */}
                            <div className="bg-indigo-50/30 border border-indigo-100 dark:border-indigo-950/30 dark:bg-indigo-950/10 p-3 rounded-lg flex flex-col gap-1 text-xs mt-auto flex-none">
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
                )}

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
                        variant="outline" 
                        onClick={handleSaveSimulation}
                        disabled={isSavingSimulation || selectedTitles.length === 0}
                        className="text-xs text-indigo-650 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 gap-1.5"
                    >
                        <Clock size={14} /> {isSavingSimulation ? 'Salvando...' : t('financeiro.negotiation.btn_save_simulation', 'Salvar Simulação')}
                    </Button>
                    <Button 
                        onClick={classification === 'legal' ? () => setIsBurofaxOpen(true) : handleSaveAgreement} 
                        disabled={isSaving || selectedTitles.length === 0}
                        className={`text-xs gap-1.5 font-bold ${classification === 'legal' ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-primary text-white hover:bg-primary/95'}`}
                    >
                        {isSaving ? (
                            t('financeiro.negotiation.btn_saving', 'Processando...')
                        ) : classification === 'legal' ? (
                            <>
                                <Scale size={14} /> {t('financeiro.negotiation.btn_confirm_legal', 'Confirmar e Gerar Burofax')}
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

        {isBurofaxOpen && (
            <BurofaxPreviewModal
                isOpen={isBurofaxOpen}
                onClose={() => setIsBurofaxOpen(false)}
                selectedTitles={selectedTitles}
                originalTotal={originalTotal}
                onConfirmLegal={handleSaveAgreement}
                isConfirming={isSaving}
            />
        )}

        {/* History Image Lightbox */}
        {selectedHistoryImage && (
            <div 
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out animate-in fade-in duration-200"
                onClick={() => setSelectedHistoryImage(null)}
            >
                <div className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl p-2 border border-slate-700" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedHistoryImage(null)}
                        className="absolute top-3 right-3 text-white hover:bg-white/20 z-10 rounded-full"
                    >
                        <X size={20} />
                    </Button>
                    <img 
                        src={selectedHistoryImage} 
                        alt="Visualização da ocorrência" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto" 
                    />
                </div>
            </div>
        )}
        </>
    );
};
