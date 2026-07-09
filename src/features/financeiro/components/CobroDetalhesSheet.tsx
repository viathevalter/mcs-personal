import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '../lib/utils';
import { fetchObservacoes, saveObservacao, updateContaReceber } from '../data/loader';
import type { EnrichedTitulo, CobrancaObservacao } from '../types';
import { supabase } from '../lib/supabase';
import { 
    Clock, 
    FileText, 
    DollarSign, 
    Building2, 
    Calendar, 
    Briefcase, 
    User, 
    Send, 
    Scale, 
    Mail, 
    Edit, 
    Loader2, 
    ChevronRight,
    AlertCircle,
    Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CobroDetalhesSheetProps {
    isOpen: boolean;
    onClose: () => void;
    titulo: EnrichedTitulo;
    onOpenEdit: (item: EnrichedTitulo) => void;
    onOpenReceber: (item: EnrichedTitulo) => void;
    onOpenEmail: (item: EnrichedTitulo) => void;
    onRefresh: () => void;
}

export function CobroDetalhesSheet({
    isOpen,
    onClose,
    titulo,
    onOpenEdit,
    onOpenReceber,
    onOpenEmail,
    onRefresh
}: CobroDetalhesSheetProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('origem');
    const [isLoadingFatura, setIsLoadingFatura] = useState(false);
    
    // Faturamento origin states
    const [faturaInfo, setFaturaInfo] = useState<any | null>(null);
    const [horasTrabalhadas, setHorasTrabalhadas] = useState<any[]>([]);
    
    // Timeline States
    const [observacoes, setObservacoes] = useState<CobrancaObservacao[]>([]);
    const [novaObs, setNovaObs] = useState('');
    const [isSavingObs, setIsSavingObs] = useState(false);
    const [currentUser, setCurrentUser] = useState('Sistema');

    useEffect(() => {
        if (isOpen && titulo) {
            loadTimeline();
            fetchUser();
            if (titulo.fatura_id) {
                loadFaturaOrigin(titulo.fatura_id);
            } else {
                setFaturaInfo(null);
                setHorasTrabalhadas([]);
            }
        }
    }, [isOpen, titulo]);

    const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            setCurrentUser(session.user.email);
        }
    };

    const loadTimeline = async () => {
        try {
            const data = await fetchObservacoes(titulo.id);
            
            // Build base creation event
            const formattedTotal = titulo.Valot_total?.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00';
            const formattedVenc = titulo.Dt_venc ? new Date(titulo.Dt_venc).toLocaleDateString('pt-PT') : 'N/A';
            const formattedEmissao = titulo.Data_emissao ? new Date(titulo.Data_emissao).toLocaleDateString('pt-PT') : 'N/A';
            
            const baseEvent: CobrancaObservacao = {
                id: 'creation-event',
                conta_receber_id: titulo.id,
                data: titulo.Creado ? titulo.Creado.toISOString() : (titulo.Data_emissao ? titulo.Data_emissao.toISOString() : new Date().toISOString()),
                usuario: titulo.Creado_por || 'Sistema',
                tipo: 'Registro do Cobro',
                descricao: `Título de contas a receber criado para o cliente ${titulo.Cliente || 'Cliente'} no valor de € ${formattedTotal} com emissão em ${formattedEmissao} e vencimento em ${formattedVenc}. Documento: ${titulo.Num_doc}.`
            };

            setObservacoes([...data, baseEvent]);
        } catch (error) {
            console.error('Error fetching observacoes:', error);
        }
    };

    const loadFaturaOrigin = async (faturaId: string) => {
        setIsLoadingFatura(true);
        try {
            // 1. Fetch fatura info
            const { data: fatData, error: fatErr } = await supabase
                .schema('core_finance')
                .from('faturas')
                .select('*')
                .eq('id', faturaId)
                .single();

            if (fatErr) throw fatErr;
            setFaturaInfo(fatData);

            if (fatData) {
                // 2. Fetch hours worked
                const { data: horasData, error: horasErr } = await supabase
                    .schema('core_finance')
                    .from('horas_trabalhadas')
                    .select('*')
                    .eq('fatura_id', faturaId);

                if (horasErr) throw horasErr;

                // 3. Resolve worker names
                const workerIds = Array.from(new Set((horasData || []).map((h: any) => h.worker_id).filter(Boolean)));
                let workersMap = new Map();
                
                if (workerIds.length > 0) {
                    const { data: wData } = await supabase
                        .schema('core_personal')
                        .from('workers')
                        .select('id, nome')
                        .in('id', workerIds);
                    
                    workersMap = new Map((wData || []).map(w => [w.id, w]));
                }

                const enrichedHoras = (horasData || []).map(h => ({
                    ...h,
                    worker_nome: workersMap.get(h.worker_id)?.nome || t('financeiro.detail_sheet.unknown_worker', 'Trabalhador Desconhecido')
                }));

                setHorasTrabalhadas(enrichedHoras);
            }
        } catch (err: any) {
            console.error(t('financeiro.detail_sheet.err_billing_load', 'Erro ao carregar dados do faturamento:'), err);
            toast.error(t('financeiro.detail_sheet.err_billing_origin', 'Não foi possível carregar a origem do faturamento: ') + err.message);
        } finally {
            setIsLoadingFatura(false);
        }
    };

    const handleAddObs = async () => {
        if (!novaObs.trim()) return;
        setIsSavingObs(true);
        try {
            const obsToSave = {
                conta_receber_id: titulo.id,
                usuario: currentUser,
                tipo: t('financeiro.modals.obs_manual_note', 'Anotação Manual'),
                descricao: novaObs.trim(),
                data: new Date().toISOString()
            };
            await saveObservacao(obsToSave);
            setNovaObs('');
            loadTimeline();
            toast.success(t('financeiro.detail_sheet.msg_history_updated', 'Histórico atualizado!'));
        } catch (err: any) {
            toast.error(t('financeiro.detail_sheet.err_obs_save', 'Erro ao salvar anotação: ') + err.message);
        } finally {
            setIsSavingObs(false);
        }
    };

    const handleSendToLegal = async () => {
        if (window.confirm(t('financeiro.detail_sheet.confirm_legal', 'Deseja encaminhar o título {{num_doc}} para cobrança judicial?', { num_doc: titulo.Num_doc }))) {
            try {
                const updateRes = await updateContaReceber(titulo.id, { Status: 'Judicial' });
                if (!updateRes.success) throw updateRes.error;

                const obsToSave = {
                    conta_receber_id: titulo.id,
                    usuario: currentUser,
                    tipo: t('financeiro.detail_sheet.legal_forward', 'Encaminhamento Judicial'),
                    descricao: t('financeiro.detail_sheet.legal_forward_desc', 'Título encaminhado para cobrança jurídica/judicial via assessoria de advocacia.'),
                    data: new Date().toISOString()
                };
                await saveObservacao(obsToSave);

                toast.success(t('financeiro.detail_sheet.msg_legal_sent', 'Título enviado para o Jurídico!'));
                onRefresh();
                onClose();
            } catch (err: any) {
                toast.error(t('financeiro.detail_sheet.err_legal_forward', 'Erro ao encaminhar para jurídico: ') + err.message);
            }
        }
    };

    const isOverdue = titulo.Status !== 'Pago' && titulo.Status !== 'Judicial' && titulo.Status !== 'Negociado' && titulo.Dt_venc && new Date(titulo.Dt_venc) < new Date(new Date().setHours(0,0,0,0));

    return (
        <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <SheetContent className="sm:max-w-xl flex flex-col h-full p-0 dark:bg-slate-900 dark:border-slate-800">
                {/* Header Summary */}
                <div className="p-6 pb-4 border-b bg-slate-50 dark:bg-slate-950 flex-none space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{titulo.Cliente}</h2>
                            <p className="text-xs text-muted-foreground font-mono font-semibold">{titulo.Num_doc}</p>
                        </div>
                        <div className="flex gap-1">
                            <Badge variant={titulo.Status === 'Pago' ? 'default' : titulo.Status === 'Negociado' ? 'outline' : isOverdue ? 'destructive' : 'secondary'} className="font-bold">
                                {titulo.Status === 'Pago' ? t('financeiro.status.paid', 'Pago') : titulo.Status === 'Negociado' ? t('financeiro.status.negotiated', 'Negociado') : isOverdue ? t('financeiro.status.overdue', 'Vencido') : t('financeiro.status.due_soon', 'A vencer')}
                            </Badge>
                            {titulo.Status === 'Parcial' && (
                                <Badge variant="warning" className="bg-amber-500 text-white font-bold">{t('financeiro.status.partial', 'Parcial')}</Badge>
                            )}
                            {titulo.Status === 'Judicial' && (
                                <Badge variant="outline" className="border-red-600 text-red-600 font-bold bg-red-50">{t('financeiro.status.judicial', 'Jurídico')}</Badge>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('financeiro.detail_sheet.value_title', 'Valor do Título')}</p>
                            <p className="text-xl font-extrabold text-slate-700 dark:text-slate-300">{formatCurrency(titulo.Valot_total)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('financeiro.detail_sheet.pending_balance', 'Saldo Pendente')}</p>
                            <p className="text-xl font-extrabold text-brand-primary">{formatCurrency(titulo.Saldo_a_pagar)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs Area */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b flex-none bg-slate-50 dark:bg-slate-950">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="origem" className="text-xs font-bold">{t('financeiro.detail_sheet.tab_origin', 'Origem / Faturamento')}</TabsTrigger>
                            <TabsTrigger value="timeline" className="text-xs font-bold">{t('financeiro.detail_sheet.tab_timeline', 'Linha do Tempo ({{count}})', { count: observacoes.length })}</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 min-h-0">
                        {/* Tab 1: Faturamento Details */}
                        <TabsContent value="origem" className="m-0 space-y-6">
                            {/* General details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b pb-1">
                                    <FileText size={16} className="text-brand-primary" />
                                    {t('financeiro.detail_sheet.general_details', 'Detalhamento Geral')}
                                </h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div className="flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /> <span className="font-semibold text-slate-500">{t('financeiro.filters.empresa', 'Empresa')}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{titulo.Empresa || '-'}</span></div>
                                    <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> <span className="font-semibold text-slate-500">{t('financeiro.filters.emissao', 'Emissão')}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(titulo.Data_emissao)}</span></div>
                                    <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> <span className="font-semibold text-slate-500">{t('financeiro.filters.vencimento', 'Vencimento')}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(titulo.Dt_venc)}</span></div>
                                    <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" /> <span className="font-semibold text-slate-500">{t('financeiro.detail_sheet.deposit_bank', 'Banco de Depósito')}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{titulo.Banco || t('financeiro.detail_sheet.not_linked', 'Não Vinculado')}</span></div>
                                    {titulo.periodo_fat && (
                                        <div className="flex items-center gap-1.5 col-span-2"><Info size={14} className="text-slate-400" /> <span className="font-semibold text-slate-500">{t('financeiro.detail_sheet.billing_month', 'Mês de Faturamento')}:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{titulo.periodo_fat}</span></div>
                                    )}
                                </div>
                            </div>

                            {/* Billing origin */}
                            {!titulo.fatura_id ? (
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-dashed text-center flex flex-col items-center justify-center space-y-2">
                                    <AlertCircle className="w-8 h-8 text-slate-400" />
                                    <p className="text-xs text-slate-500 font-semibold">{t('financeiro.detail_sheet.manual_entry', 'Lançamento Manual')}</p>
                                    <p className="text-[11px] text-slate-400">{t('financeiro.detail_sheet.manual_entry_desc', 'Este cobro foi registrado manualmente. Não há vinculação direta com planilha de horas de trabalhadores.')}</p>
                                </div>
                            ) : isLoadingFatura ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                                    <span className="text-xs text-slate-500 ml-2">{t('financeiro.detail_sheet.fetching_billing', 'Buscando faturamento e planilha de horas...')}</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Fatura Summary */}
                                    {faturaInfo && (
                                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border text-xs space-y-2">
                                            <p className="font-bold text-slate-700 dark:text-slate-300">{t('financeiro.detail_sheet.billing_fatura_linked', 'Fatura Vinc. ID:')} <span className="font-mono text-slate-500">{faturaInfo.id.substring(0,8).toUpperCase()}</span></p>
                                            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 font-medium">
                                                <div>{t('financeiro.detail_sheet.period', 'Período:')} <span className="font-bold text-slate-800 dark:text-slate-200">{faturaInfo.periodo || '-'}</span></div>
                                                <div>{t('financeiro.detail_sheet.total_hours', 'Total Horas:')} <span className="font-bold text-slate-800 dark:text-slate-200">{horasTrabalhadas.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0)}h</span></div>
                                                <div>{t('financeiro.detail_sheet.subtotal', 'Subtotal:')} <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(faturaInfo.subtotal || 0)}</span></div>
                                                <div>{t('financeiro.detail_sheet.tax_iva', 'IVA (21%):')} <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(faturaInfo.iva || 0)}</span></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Workers Hours Table */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('financeiro.detail_sheet.workers_hours_title', 'Trabalhadores e Horas Faturadas')}</h4>
                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50 dark:bg-slate-800/30">
                                                    <TableRow>
                                                        <TableHead className="py-2 text-[10px] font-bold">{t('financeiro.detail_sheet.worker_name', 'Nome')}</TableHead>
                                                        <TableHead className="py-2 text-[10px] font-bold text-center">{t('financeiro.detail_sheet.hours', 'Horas')}</TableHead>
                                                        <TableHead className="py-2 text-[10px] font-bold text-right">{t('financeiro.detail_sheet.rate', 'Tarifa')}</TableHead>
                                                        <TableHead className="py-2 text-[10px] font-bold text-right">Subtotal</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="text-xs font-medium">
                                                    {horasTrabalhadas.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center py-4 text-slate-400">
                                                                {t('financeiro.detail_sheet.no_hours_records', 'Nenhum registro de horas detalhado.')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        horasTrabalhadas.map((h, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell className="py-2 font-semibold text-slate-800 dark:text-slate-200">{h.worker_nome}</TableCell>
                                                                <TableCell className="py-2 text-center text-slate-700">{h.horas_totais}h</TableCell>
                                                                <TableCell className="py-2 text-right text-slate-700">€ {Number(h.tarifa_faturada || 0).toFixed(2)}</TableCell>
                                                                <TableCell className="py-2 text-right font-semibold text-brand-primary">€ {(Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 2: Timeline Observações */}
                        <TabsContent value="timeline" className="m-0 space-y-4 flex flex-col h-full min-h-0">
                            {/* Observacoes Input */}
                            <div className="flex gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border flex-none">
                                <Input 
                                    value={novaObs}
                                    onChange={e => setNovaObs(e.target.value)}
                                    placeholder={t('financeiro.detail_sheet.obs_placeholder', 'Registrar ligação, e-mail ou nota...')}
                                    className="flex-1 h-9 text-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddObs();
                                    }}
                                />
                                <Button 
                                    onClick={handleAddObs} 
                                    disabled={isSavingObs || !novaObs.trim()}
                                    className="bg-brand-primary hover:bg-brand-primary/90 h-9 text-xs"
                                >
                                    {isSavingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                                    {t('financeiro.detail_sheet.btn_save', 'Salvar')}
                                </Button>
                            </div>

                            {/* Timeline Display */}
                            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
                                    {observacoes.map((obs, idx) => {
                                        const dateObj = new Date(obs.data);
                                        const isRecebimento = obs.tipo.toLowerCase().includes('recebimento') || obs.tipo.toLowerCase().includes('pagamento');
                                        const isJuridico = obs.tipo.toLowerCase().includes('judicial') || obs.tipo.toLowerCase().includes('jurídico');
                                        
                                        return (
                                            <div key={obs.id || idx} className="relative pl-6">
                                                <div className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full border border-white shadow-sm ${isRecebimento ? 'bg-green-500' : isJuridico ? 'bg-red-700' : 'bg-brand-primary'}`}></div>
                                                <div>
                                                    <h4 className={`font-bold text-xs ${isRecebimento ? 'text-green-700' : isJuridico ? 'text-red-700' : 'text-brand-primary'}`}>
                                                        {obs.tipo}
                                                    </h4>
                                                    <p className="text-slate-800 dark:text-slate-300 text-xs mt-1 leading-relaxed">{obs.descricao}</p>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-semibold">
                                                        <span>{dateObj.toLocaleDateString('pt-BR')} {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span>•</span>
                                                        <span>Usuário: {obs.usuario}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Footer Actions */}
                <SheetFooter className="p-4 border-t bg-slate-50 dark:bg-slate-950 flex-none gap-2 sm:gap-0">
                    <div className="flex flex-wrap items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2">
                            {/* Enviar ao Juridico */}
                            {titulo.Status !== 'Judicial' && titulo.Status !== 'Pago' && (
                                <Button 
                                    variant="outline" 
                                    onClick={handleSendToLegal}
                                    className="text-red-700 hover:text-red-800 hover:bg-red-50 border-red-200 text-xs h-9 font-semibold"
                                >
                                    <Scale size={14} className="mr-1.5" /> {t('financeiro.detail_sheet.btn_send_legal', 'Enviar ao Jurídico')}
                                </Button>
                            )}

                            {/* Cobrar E-mail */}
                            {titulo.Status !== 'Pago' && (
                                <Button 
                                    variant="outline"
                                    onClick={() => onOpenEmail(titulo)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 text-xs h-9 font-semibold"
                                >
                                    <Mail size={14} className="mr-1.5" /> {t('financeiro.detail_sheet.btn_send_email', 'Enviar E-mail')}
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Editar/Alterar */}
                            <Button 
                                variant="outline"
                                onClick={() => { onOpenEdit(titulo); onClose(); }}
                                className="text-slate-600 hover:text-slate-800 text-xs h-9 font-semibold"
                            >
                                <Edit size={14} className="mr-1.5" /> {t('financeiro.detail_sheet.btn_edit', 'Alterar')}
                            </Button>

                            {/* Receber / Liquidar */}
                            {titulo.Status !== 'Pago' && (
                                <Button 
                                    onClick={() => { onOpenReceber(titulo); onClose(); }}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-9 font-bold"
                                >
                                    <DollarSign size={14} className="mr-1.5" /> {t('financeiro.detail_sheet.btn_liquidar', 'Liquidar / Receber')}
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
